from __future__ import annotations

import inspect
import re
from copy import deepcopy
from datetime import datetime
from typing import TYPE_CHECKING, Callable, Iterable, Sequence

import numpy as np
import pandas as pd
from pm4py.objects.ocel.obj import OCEL

from api.logger import logger
from util.misc import all_or_none

if TYPE_CHECKING:
    from ocel.attribute import AttributeDefinition
    from ocel.ocel_wrapper import OCELWrapper


def get_default_otype_order_func(
    otypes: set[str],
    otype_counts: dict[str, int],
    hu_otypes: set[str] | None = None,
    resource_otypes: set[str] | None = None,
    target_otypes: set[str] | None = None,
    prepend_target_otypes: bool = True,
):
    """Specifies the canonical ordering of object types. Object types are ordered by:

    - target object types first (optional)
    - HUs first, then resources (optional)
    - Object type count (descending)
    - Object type name (ascending lexicographically)
    """
    assert all_or_none([hu_otypes is None, resource_otypes is None])
    assert hu_otypes is None or resource_otypes is None or hu_otypes | resource_otypes == otypes
    assert target_otypes is None or target_otypes.issubset(otypes)

    def otype_order_func(ot: str):
        levels = []
        if target_otypes and prepend_target_otypes:
            levels.append(0 if ot in target_otypes else 1)
        if hu_otypes is not None:
            levels.append(0 if ot in hu_otypes else 1)
        levels += [
            -otype_counts[ot],
            ot,
        ]
        return tuple(levels)

    return otype_order_func


def add_object_order(
    df: pd.DataFrame,
    /,
    otype_order: Sequence[str] | None = None,
    *,
    suffixes: tuple[str, ...] | None = None,
    prepend: tuple[pd.Series | np.ndarray | None, ...] | pd.Series | None = None,
) -> None:
    """Adds a column to an object DataFrame to use as canonical order.
    Objects are ordered by a specified object type order, and then by the object ID.
    Optionally, a superior order can be passed via the `prepend` parameter.
    Does not sort the DataFrame."""
    if suffixes is None:
        # Try to automatically detect the object column(s)
        if {"ocel:oid", "ocel:type"}.issubset(df.columns):
            suffixes = ("",)
        elif {"ocel:oid_1", "ocel:type_1", "ocel:oid_2", "ocel:type_2"}.issubset(df.columns):
            suffixes = ("_1", "_2")
        else:
            raise ValueError

    if otype_order is None:
        otype_cols = [f"ocel:type{s}" for s in suffixes]
        otype_order = list(sorted(set().union(*[df[col] for col in otype_cols])))

    if isinstance(prepend, pd.Series | np.ndarray):
        prepend = tuple(prepend)
    if prepend:
        assert len(prepend) == len(suffixes)
    else:
        prepend = tuple(None for _ in suffixes)
    has_prepended_order = all(pre is not None for pre in prepend)

    otype_order_index = dict((ot, i) for i, ot in enumerate(otype_order))
    for suffix, pre in zip(suffixes, prepend):
        assert {f"ocel:type{suffix}", f"ocel:oid{suffix}"}.issubset(df.columns)
        otype_ix = df[f"ocel:type{suffix}"].map(otype_order_index)
        df[f"obj_order{suffix}"] = list(
            zip(
                *([pre] if has_prepended_order and pre is not None else []),
                otype_ix,
                df[f"ocel:oid{suffix}"],
            )
        )  # type: ignore


def filter_activity(
    df: pd.DataFrame,
    /,
    activity_filter: str | set[str] | None,
    *,
    negative: bool = False,
) -> pd.DataFrame:
    """Filters a DataFrame w.r.t. an activity."""
    assert "ocel:activity" in df.columns
    if activity_filter is None:
        return df if not negative else df.iloc[0:0]
    if isinstance(activity_filter, str):
        predicate = df["ocel:activity"] == activity_filter
    elif isinstance(activity_filter, set):
        predicate = df["ocel:activity"].isin(activity_filter)
    else:
        raise ValueError
    if negative:
        predicate = ~predicate
    return df[predicate]


def join_current_attr_values(
    ocel: OCELWrapper,
    relations: pd.DataFrame | None = None,
    eattrs: Iterable[str] | None = None,
    oattrs: Iterable[str] | None = None,
    oattrs_dynamic: Iterable[str] | None = None,
    oattrs_static: Iterable[str] | None = None,
    otypes: Iterable[str] | None = None,
    activities: Iterable[str] | None = None,
    qualifiers: Iterable[str] | None = None,
    disambiguate_names: (
        bool | Sequence[tuple[tuple[str, str | None, AttributeDefinition], str]]
    ) = False,
) -> pd.DataFrame:
    """
    Enriches an E2O relations DataFrame with current object attribute values.
    Adds values from static attributes as well as the most recent values from dynamic attributes set before the event's timestamp.
    When passing `disambiguate_names=True`, adds object type to attribute column names (e.g., `'Weight[Container]'`)
    """
    attr_info_initialized = ocel._attr_info_initialized
    assert attr_info_initialized or (
        oattrs_dynamic is not None and oattrs_static is not None and otypes is not None
    ), "Calling join_current_attr_values without passing oattrs_dynamic, oattrs_static and otypes is not possible before ocel.attr_info is accessed."
    if disambiguate_names:
        assert (
            attr_info_initialized
        ), "Calling join_current_attr_values with attr_info_initialized=True is not possible before ocel.attr_info is accessed."

    if relations is None:
        relations = filter_relations(
            ocel, otypes=otypes, activities=activities, qualifiers=qualifiers, copy=False
        )
    attr_info = None
    if attr_info_initialized:
        attr_info = ocel.attr_info
        if otypes is not None:
            attr_info = attr_info[attr_info["ocel:type"].isin(otypes)]

        # Extract static/dynamic attributes
        if oattrs is not None:
            attr_info = attr_info[attr_info["ocel:field"].isin(oattrs)]
            if oattrs_static is None:
                oattrs_static = attr_info[~attr_info["dynamic"]]["ocel:field"].unique().tolist()
            if oattrs_dynamic is None:
                oattrs_dynamic = attr_info[attr_info["dynamic"]]["ocel:field"].unique().tolist()
    if eattrs is None:
        eattrs = []
    if oattrs is None:
        oattrs = ocel.oattr_names
    if oattrs_static is None or oattrs_dynamic is None:
        # TODO probably unreachable because of the assertion above
        oattrs_static = [attr for attr in ocel.oattr_names_static if attr in oattrs]
        oattrs_dynamic = [attr for attr in ocel.oattr_names_dynamic if attr in oattrs]
    oattrs = list({*oattrs_static, *oattrs_dynamic})
    if not oattrs and not eattrs:
        return relations
    if len(set(oattrs)) < len(oattrs) and not disambiguate_names:
        logger.warning(
            f"join_current_attr_values detected duplicate attribute names. Might pass disambiguate_names=True."
        )

    if not oattrs_static and not oattrs_dynamic and not eattrs:
        raise ValueError(f"join_current_attr_values: No attributes found.")

    # Extract static attribute values
    if oattrs_static:
        oattr_values_static = ocel.objects[["ocel:oid", "ocel:type", *oattrs_static]]
        if otypes:
            oattr_values_static = oattr_values_static[oattr_values_static["ocel:type"].isin(otypes)]
    else:
        oattr_values_static = None

    # Extract dynamic attribute values
    if oattrs_dynamic:
        # select attributes
        oattr_values_dynamic = ocel.object_changes[
            ["ocel:oid", "ocel:type", "ocel:timestamp", *oattrs_dynamic]
        ]
        value_filter = ocel.object_changes["ocel:field"].isin(oattrs_dynamic)
        if otypes:
            value_filter = value_filter & (oattr_values_dynamic["ocel:type"].isin(otypes))
        oattr_values_dynamic = oattr_values_dynamic[value_filter]
        if len(oattr_values_dynamic) == 0:
            # TODO error might be wrong, if no attr values exist
            raise ValueError(
                f"Attributes {', '.join(oattrs)} not available"
                + (f" for objects of type(s) '{', '.join(otypes)}'." if otypes else "")
            )
    else:
        oattr_values_dynamic = None

    # concat e2o relations with attr values and sort by timestamp (later copy values downwards via ffill)
    #   static attr -- timestamp <NA> --> na_position="first"
    #   dynamic attr -- when same timestamp as event, put first (need stable sort)
    events_and_changes = pd.concat(
        [oattr_values_static, oattr_values_dynamic, relations], ignore_index=True  # type: ignore
    )
    events_and_changes = events_and_changes[list(relations.columns) + oattrs]
    events_and_changes.sort_values(
        "ocel:timestamp", na_position="first", kind="stable", inplace=True, ignore_index=True
    )
    # copy attribute values downwards within object group
    events_and_changes[oattrs] = events_and_changes.groupby("ocel:oid")[oattrs].ffill()
    # drop attribute value rows, only keep e2o relations
    relations = events_and_changes[~events_and_changes["ocel:eid"].isna()]

    # Extract event attributes
    if eattrs:
        if not disambiguate_names and not set(eattrs).isdisjoint(oattrs):
            raise ValueError(
                f"join_current_attr_values: Detected name clash between object and event attribute(s) {', '.join(set(eattrs).intersection(oattrs))}"
            )
        eattr_values = ocel.events[["ocel:eid", *eattrs]]
        relations = relations.merge(eattr_values, on="ocel:eid", how="left")

    # Split attribute columns by object type / activity (disambiguate attributes)
    # Needed in AttributeEmissionFactors, assuming an event is related to two otypes with attributes of the same name
    if disambiguate_names:
        assert attr_info is not None
        if oattrs:
            # TODO split by qualifier as well? (Two unique objects of same type, with different qualifiers, per activity)
            # Split by object type, then rename and re-concat
            oattr_otypes = set(relations["ocel:type"])
            otype_relations = []
            for ot in oattr_otypes:
                otype_oattrs = set(attr_info[attr_info["ocel:type"] == ot]["ocel:field"])
                renamer = None
                if disambiguate_names is True:
                    renamer = {oa: f"{oa}({ot})" for oa in otype_oattrs}
                elif isinstance(disambiguate_names, list):
                    renamer = {
                        oa.name: name
                        for (_, q, oa), name in disambiguate_names
                        if oa.name in otype_oattrs
                        and oa.target == "object"
                        and oa.object_type == ot
                    }
                assert renamer
                otype_relations.append(
                    relations[relations["ocel:type"] == ot].rename(columns=renamer)
                )
            relations = pd.concat(otype_relations)
        if eattrs:
            # Split by activity, then rename and re-concat
            eattr_activities = set(relations["ocel:activity"])
            act_relations = []
            for act in eattr_activities:
                act_eattrs = set(attr_info[attr_info["ocel:activity"] == act]["ocel:field"])
                renamer = None
                if disambiguate_names is True:
                    renamer = {ea: f"{ea}({act})" for ea in act_eattrs}
                elif isinstance(disambiguate_names, list):
                    renamer = {
                        ea.name: name
                        for (_, _, ea), name in disambiguate_names
                        if ea.name in act_eattrs
                        and ea.target == "event"
                        and ea.activity == act
                    }
                assert renamer
                act_relations.append(
                    relations[relations["ocel:activity"] == act].rename(columns=renamer)
                )
            relations = pd.concat(act_relations)

    return relations


def filter_pm4py_ocel(
    ocel: OCEL,
    otypes: list[str] | None = None,
    oids: list[str] | None = None,
    activities: list[str] | None = None,
    qualifiers: list[str] | None = None,
    min_timestamp: datetime | None = None,
    max_timestamp: datetime | None = None,
):
    """
    Filters a pm4py OCEL by object types, activities, qualifies, and/or timestamps.
    Returns a minimal OCEL, deleting objects not related to any retained events and vice versa.
    In dynamic attributes, when passing min_timestamp, additionally retains the last value set before min_timestamp.
    """

    # relations      [ocel:eid, ocel:oid, ocel:qualifier, ocel:activity, ocel:timestamp, ocel:type]
    # events         [ocel:eid, ocel:timestamp, ocel:activity]
    # objects        [ocel:oid, ocel:type]
    # object_changes [ocel:oid, ocel:timestamp, ocel:field, ocel:type]
    # o2o            [ocel:oid, ocel:oid_2, ocel:qualifier]
    # e2e            [ocel:eid, ocel:eid_2, ocel:qualifier]

    def qualifier_filter(df: pd.DataFrame, col: str = "ocel:qualifier"):
        if qualifiers:
            return df[col].isin(qualifiers)
        return df[col].map(lambda x: True)

    ocel2 = deepcopy(ocel)

    # E2O relations table
    relations_filter = ocel2.relations["ocel:eid"].map(lambda x: True)
    if otypes:
        relations_filter = relations_filter & ocel2.relations["ocel:type"].isin(otypes)
    if oids:
        relations_filter = relations_filter & ocel2.relations["ocel:oid"].isin(oids)
    if activities:
        relations_filter = relations_filter & ocel2.relations["ocel:activity"].isin(activities)
    if qualifiers:
        relations_filter = relations_filter & ocel2.relations["ocel:qualifier"].isin(qualifiers)
    if min_timestamp is not None:
        relations_filter = relations_filter & (ocel2.relations["ocel:timestamp"] >= min_timestamp)
    if max_timestamp is not None:
        relations_filter = relations_filter & (ocel2.relations["ocel:timestamp"] <= max_timestamp)
    ocel2.relations = ocel2.relations[relations_filter]

    # Retain events & objects that have E2O relations
    ocel2.events = ocel2.events[ocel2.events["ocel:eid"].isin(ocel2.relations["ocel:eid"])]
    ocel2.objects = ocel2.objects[ocel2.objects["ocel:oid"].isin(ocel2.relations["ocel:oid"])]

    # object_changes table
    ocel2.object_changes = ocel2.object_changes[
        ocel2.object_changes["ocel:oid"].isin(ocel2.objects["ocel:oid"])
    ]
    if max_timestamp is not None:
        ocel2.object_changes = ocel2.object_changes[
            ocel2.object_changes["ocel:timestamp"] <= max_timestamp
        ]
    if min_timestamp is not None:
        # Include the latest values of each attribute that were set before min_timestamp
        min_timestamp_filter = ocel2.object_changes["ocel:timestamp"] >= min_timestamp
        filtered = ocel2.object_changes[min_timestamp_filter]
        before = ocel2.object_changes[~min_timestamp_filter].sort_values("ocel:timestamp")
        latest_before = before.groupby(["ocel:oid", "ocel:field"], as_index=False).last()
        ocel2.object_changes = pd.concat([latest_before, filtered])

    # O2O relations table
    o2o_oid = ocel2.o2o["ocel:oid"].isin(ocel2.objects["ocel:oid"])
    o2o_oid_2 = ocel2.o2o["ocel:oid_2"].isin(ocel2.objects["ocel:oid"])
    ocel2.o2o = ocel2.o2o[o2o_oid & o2o_oid_2 & qualifier_filter(ocel2.o2o)][ocel2.o2o.columns]

    # E2E relations table
    e2e_eid = ocel2.e2e["ocel:eid"].isin(ocel2.events["ocel:eid"])
    e2e_eid_2 = ocel2.e2e["ocel:eid"].isin(ocel2.events["ocel:eid"])
    ocel2.e2e = ocel2.e2e[e2e_eid & e2e_eid_2 & qualifier_filter(ocel2.e2e)][ocel2.e2e.columns]

    return ocel2


def filter_relations(
    ocel: OCELWrapper | None = None,
    relations: pd.DataFrame | None = None,
    otype: str | None = None,
    otypes: Iterable[str] | None = None,
    activity: str | None = None,
    activities: Iterable[str] | None = None,
    qualifier: str | None = None,
    qualifiers: Iterable[str] | None = None,
    copy: bool = True,
) -> pd.DataFrame:
    """
    Filters an E2O relation DataFrame by the given object type(s), activity(s) and/or qualifier(s).
    """
    if relations is None and ocel is not None:
        relations = ocel.relations
    if relations is None:
        raise ValueError(f"filter_relations(): Pass either ocel or relations.")
    if (
        (otype is not None and otypes is not None)
        or (activity is not None and activities is not None)
        or (qualifier is not None and qualifiers is not None)
    ):
        raise ValueError(
            f"filter_relations(): For otype, activity and qualifier, pass either a single value or a list."
        )

    filter = True
    if otype:
        filter = filter & (relations["ocel:type"] == otype)
    if otypes:
        filter = filter & (relations["ocel:type"].isin(otypes))
    if activity:
        filter = filter & (relations["ocel:activity"] == activity)
    if activities:
        filter = filter & (relations["ocel:activity"].isin(activities))
    if qualifier:
        filter = filter & (relations["ocel:qualifier"] == qualifier)
    if qualifiers:
        filter = filter & (relations["ocel:qualifier"].isin(qualifiers))
    if filter is not True:
        relations = relations[filter]
    if copy:
        return relations.copy()
    return relations


def relations_with_attrs(
    ocel: OCELWrapper,
    otype: str | None = None,
    activity: str | None = None,
    qualifier: str | None = None,
    eattrs: Iterable[str] | None = None,
    oattrs: Iterable[str] | None = None,
):
    relations = ocel.filter_relations(
        otype=otype, activity=activity, qualifier=qualifier, copy=False
    )
    return join_current_attr_values(
        ocel,
        relations,
        otypes=[otype] if otype else None,
        activities=[activity] if activity else None,
        qualifiers=[qualifier] if qualifier else None,
        eattrs=eattrs,
        oattrs=oattrs,
    )


def print_pm4py_object_summary(pm4py_ocel):
    names = sorted([k for k in pm4py_ocel.__dir__() if not k.startswith("__")])
    methods, attrs, dfs, column_names = {}, {}, {}, {}
    for name in names:
        value = getattr(pm4py_ocel, name, None)
        if value is None:
            continue
        if isinstance(value, pd.DataFrame):
            dfs[name] = value
        elif isinstance(value, Callable):
            methods[name] = value
        elif isinstance(value, str) and re.match(r"ocel:\w+", value):
            column_names[name] = value
        else:
            attrs[name] = value

    print("Methods:")
    for name, method in methods.items():
        print(name + ": " + str(inspect.signature(method)))

    print("\nTables:")
    for name, df in dfs.items():
        print(f"{name}: {len(df)} x {len(df.columns)} [" + ", ".join(df.columns) + "]")

    print("\nOther attributes:")
    for name, attr in attrs.items():
        print(name + ": " + str(attr))

    print("\nColumn names:")
    for name, col in column_names.items():
        print(name + ": " + col)
