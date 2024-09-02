from __future__ import annotations

from typing import TYPE_CHECKING, Callable, Literal, Sequence

import numpy as np
import pandas as pd

import ocel.utils as ocel_util
import util.misc as util
from api.logger import logger
from emissions.allocation_graph import GraphMode
from emissions.allocation_rules import (
    ALLOC_REPORT_COLUMNS,
    AllocationRule,
    AllTargetsAllocation,
    ClosestTargetsAllocation,
    DirectE2OTargetAllocation,
)
from util.pandas import concat_dfs, mirror_dataframe

if TYPE_CHECKING:
    from ocel.ocel_wrapper import OCELWrapper


class Allocator:
    """The `Allocator` class is used for controlling object allocation.

    A given *allocation rule* is employed to assign a set of target objects to each event.
    Internally, a sequence of rules is executed, gradually consuming all event / E2O emissions.
    An instance of a rule executed within this sequence is called *wave*.

    Use `Allocator.dummy(..., events=1)` to create an example instance with all event emissions set to 1 kg CO2e.
    """

    rule: AllocationRule  # The main allocation rule
    waves: list[AllocationRule]  # the complete pipeline including fixed pre/postprocessing
    current_wave: AllocationRule | None = None
    _finished = False
    event_stats: pd.DataFrame | None = None

    def __init__(
        self,
        ocel: OCELWrapper,
        targets: set[str],
        hu_otypes: set[str],
        resource_otypes: set[str],
        *,
        otype_order: Sequence[str] | None = None,
        event_emissions: pd.DataFrame,
        e2o_emissions: pd.DataFrame,
        rule: (
            Callable[[Allocator], AllocationRule] | None
        ) = None,  # not the rule instance, but its class
        ignore_targets: bool = False,
        save_report: bool = True,
        silent: bool = False,
    ):
        self.ocel = ocel
        self.ignore_targets = ignore_targets
        self.save_report = save_report  # Set to True to capture report
        self.silent = silent

        # Init timers
        self._init_timer = util.Timer()
        self._process_timer = util.Timer()

        # Infer if targets is otypes or oids
        if targets.issubset(ocel.otypes):
            target_objects = ocel.objects[ocel.objects["ocel:type"].isin(targets)]
        else:
            target_objects = ocel.objects[ocel.objects["ocel:oid"].isin(targets)]
            if len(target_objects) != len(targets):
                raise ValueError(
                    "targets must be either a set of object IDs or a set of object types."
                )
            self.target_oids = targets
        self.target_oids = set(target_objects["ocel:oid"])
        self.target_otypes = set(
            target_objects["ocel:type"]
        )  # Not necessarily all objects of these types are targets!

        self.hu_otypes = hu_otypes
        self.resource_otypes = resource_otypes
        self.hu_oids = set(ocel.objects[ocel.objects["ocel:type"].isin(self.hu_otypes)]["ocel:oid"])
        self.nthu_oids = self.hu_oids.difference(self.target_oids)
        self.resource_oids = set(
            ocel.objects[ocel.objects["ocel:type"].isin(self.resource_otypes)]["ocel:oid"]
        )
        # self.target_otypes = target_otypes
        # self.nthu_otypes = nthu_otypes
        # self.hu_otypes = self.target_otypes | self.nthu_otypes

        # Define canonical order of object types
        self.otype_counts = self.ocel.otype_counts.to_dict()
        if otype_order is not None:
            self.otype_order = otype_order
            self.otype_order_func = self.otype_order.index
        else:
            self.otype_order_func = ocel_util.get_default_otype_order_func(
                otypes=set(self.ocel.otypes),
                otype_counts=self.ocel.otype_counts.to_dict(),
                target_otypes=self.target_otypes,
                hu_otypes=self.hu_otypes,
                resource_otypes=self.resource_otypes,
                prepend_target_otypes=True,
            )
            self.otype_order = list(sorted(self.ocel.otypes, key=self.otype_order_func))
        self.otype_order_ix = {ot: i for i, ot in enumerate(self.otype_order)}
        self.otype_order_vector = lambda ots: ots.map(self.otype_order_ix)

        # Emission input DataFrames will be filtered (not inplace) while processing.
        self.event_emissions = event_emissions
        self.e2o_emissions = e2o_emissions
        self.total_emissions = (
            self.event_emissions["ocean:event_emissions"].sum()
            + self.e2o_emissions["ocean:e2o_emissions"].sum()
        )

        if event_emissions is None or e2o_emissions is None:
            raise ValueError("Specify both event_emissions and e2o_emissions.")
        if not {"ocel:eid", "ocel:activity", "ocean:event_emissions"}.issubset(
            event_emissions.columns
        ):
            raise ValueError("event_emissions misses required columns.")
        if not {
            "ocel:eid",
            "ocel:activity",
            "ocel:qualifier",
            "ocel:oid",
            "ocel:type",
            "ocean:e2o_emissions",
        }.issubset(e2o_emissions.columns):
            raise ValueError("e2o_emissions misses required columns.")

        self.event_emissions = self.event_emissions[
            (self.event_emissions["ocean:event_emissions"] != 0)
            & self.event_emissions["ocean:event_emissions"].notna()
        ].copy()
        self.e2o_emissions = self.e2o_emissions[
            (self.e2o_emissions["ocean:e2o_emissions"] != 0)
            & self.e2o_emissions["ocean:e2o_emissions"].notna()
        ].copy()

        self.update(calc_remaining=True)

        # Init strategy/pipeline
        if rule is not None:
            # TODO args/kwargs
            self.rule = rule(self)
        else:
            self.rule = self.init_default_rule()

        self.waves = [
            DirectE2OTargetAllocation(self),
            self.rule,
            AllTargetsAllocation(self),
        ]
        for i, wave in enumerate(self.waves):
            wave.wave_index = i + 1

    # endregion

    # ----- ALLOCATION PIPELINE STATE MANAGEMENT ------------------------------------------------------------------------------------------
    # region

    def init_default_rule(self):
        return ClosestTargetsAllocation(
            self,
            graph_mode=GraphMode.HU_HU,
            remove_otype_loops=True,
            max_distance=3,
            algorithm="own_bfs",
        )

    def init(self):
        # Init target emissions DataFrame (ocel:oid, ocean:object_emissions, alloc_note, ...)
        if self.save_report:
            self.report = pd.DataFrame([], columns=ALLOC_REPORT_COLUMNS)
        # Init result Series as all-zero (index: target oid, values: CO2e[kg])
        self.target_emissions = pd.Series(
            np.full(len(self.target_oids), 0),
            index=pd.Index(list(self.target_oids), name="ocel:oid"),
            name="ocean:object_emissions",
        )

    def update_remaining_emissions(self):
        self.remaining_event_emissions = (
            concat_dfs(
                [
                    self.event_emissions,
                    self.e2o_emissions.rename(
                        columns={"ocean:e2o_emissions": "ocean:event_emissions"}
                    ),
                ]
            )
            .groupby("ocel:eid", as_index=False)
            .agg({"ocel:activity": "first", "ocean:event_emissions": "sum"})
        )

    def update(self, calc_remaining: bool = True):
        """Updates the remaining emissions."""
        self.eids = set(self.event_emissions["ocel:eid"]).union(set(self.e2o_emissions["ocel:eid"]))
        self.activities = set(self.event_emissions["ocel:activity"]).union(
            set(self.e2o_emissions["ocel:activity"])
        )
        self.events = self.ocel.events[self.ocel.events["ocel:eid"].isin(self.eids)][
            ["ocel:eid", "ocel:activity"]
        ]
        if calc_remaining:
            # remaining_event_emissions: Total non_distributed emissions per event (event emissions + E2O emissions)
            self.update_remaining_emissions()

    def check_finished(self):
        if self._finished:
            return True
        if self.event_emissions.empty and self.e2o_emissions.empty:
            self._finished = True
        return self._finished

    def check_invariant(self, output: bool = True):
        assigned_emissions = self.target_emissions.sum()
        rel_deviation = np.abs(assigned_emissions - self.total_emissions) / self.total_emissions
        satisfied = rel_deviation < 1e-5
        if output:
            if satisfied:
                self.info(f"Allocation invariant fulfilled.")
            else:
                self.warning(
                    f"Allocation invariant not fulfilled. {rel_deviation:.1%} deviation ({self.total_emissions:.1f} -> {assigned_emissions:.1f})"
                )
        return satisfied

    def clear_activity(self, activity: str | None):
        """Removes all emissions from the given activity (or all if None) from the emission stacks."""
        self.event_emissions = ocel_util.filter_activity(
            self.event_emissions, activity, negative=True
        )
        self.e2o_emissions = ocel_util.filter_activity(self.e2o_emissions, activity, negative=True)
        self.remaining_event_emissions = ocel_util.filter_activity(
            self.remaining_event_emissions, activity, negative=True
        )
        self.update(calc_remaining=False)

    def clear_events(self, eids: set[str], update: bool = True):
        """Removes all emissions from the event IDs from the emission stacks."""
        self.event_emissions = self.event_emissions[~self.event_emissions["ocel:eid"].isin(eids)]
        self.e2o_emissions = self.e2o_emissions[~self.e2o_emissions["ocel:eid"].isin(eids)]
        self.remaining_event_emissions = self.remaining_event_emissions[
            ~self.remaining_event_emissions["ocel:eid"].isin(eids)
        ]
        if update:
            self.update()

    def process(self):
        # TODO Make sure self.update() is called anytime self.event/e2o_emissions is filtered.
        assert self.waves is not None and len(self.waves)

        with self._init_timer:
            self.init()
            self.update()

        self.info(
            f'Starting target object allocation ({util.pluralize(len(self.waves), pl="waves")})'
        )
        self.info("Emission activities: " + ", ".join(self.activities))
        self.info(f"Number of emissions: {self.remaining_emissions_summary()}")

        num_emission_events = len(self.eids)

        if not self.target_oids and not self.ignore_targets:
            raise ValueError(f"Target object allocation failed: No target objects found.")

        with self._process_timer:
            for wave in self.waves:
                self.current_wave = wave
                self.info("-------------------------------------------------------")
                wave.info(f"Start wave {wave.wave_index} ({wave.name})", indent=0)
                wave.exec()
                wave.has_run = True
                if self.check_finished():
                    break

        self.info("-------------------------------------------------------")

        self.event_stats = concat_dfs([wave.event_stats for wave in self.waves if wave.has_run])
        assert not self.event_stats["ocel:eid"].duplicated().any()
        assert len(self.event_stats) == num_emission_events
        if "distance" in self.event_stats.columns:
            assert (
                self.event_stats[self.event_stats["distance"].isna()]["num_targets"]
                == len(self.target_oids)
            ).all()

        if self.save_report:
            self.report = self.report[self.report.columns[self.report.notna().any(axis=0)]]  # type: ignore
        self.current_wave = None
        if not self.check_finished():
            self.warning(
                f"Target object allocation did not terminate (Remaining: {self.remaining_emissions_summary()})"
            )
            return False

        success = self.check_invariant(output=True)
        return success

    # endregion

    # ----- UTILS & LOGGING ------------------------------------------------------------------------------------------
    # region

    def print_state(self):
        if self.save_report:
            self.info(
                f"Assigned {len(self.report)} emissions to {self.report['ocel:oid'].nunique()} target objects. Remaining: {self.remaining_emissions_summary()}"
            )
        else:
            self.info(
                f"Assigned {self.target_emissions.sum()} of {self.total_emissions} kgCO2e to {(self.target_emissions != 0).sum()} target objects. Remaining: {self.remaining_emissions_summary()}"
            )

    def remaining_emissions_summary(self):
        return f"{len(self.event_emissions)}xE, {len(self.e2o_emissions)}xE2O"

    def log(self, func, msg, indent: int = 0):
        if not self.silent:
            if self.current_wave is not None:
                self.current_wave.log(func, msg, indent=indent)
            else:
                func("  " * indent + str(msg))

    def info(self, msg, indent: int = 0):
        self.log(logger.info, msg, indent=indent)

    def warning(self, msg, indent: int = 0):
        self.log(logger.warning, msg, indent=indent)

    # endregion

    # ----- E2O RELATION FILTERS ------------------------------------------------------------------------------------------
    # region

    def ev_relations(
        self,
        *,
        otypes: set[str] | None = None,
        oids: set[str] | None = None,
    ):
        relations = self.ocel.filter_relations(
            otypes=otypes,
            activities=self.activities,
        )[["ocel:eid", "ocel:activity", "ocel:oid", "ocel:type"]]
        if oids is not None:
            relations = relations[relations["ocel:oid"].isin(oids)]
        return relations[relations["ocel:eid"].isin(self.eids)].drop_duplicates(
            subset=["ocel:eid", "ocel:oid"]
        )

    @property
    def ev_target_relations(self):
        return self.ev_relations(otypes=self.target_otypes, oids=self.target_oids)

    @property
    def ev_nthu_relations(self):
        return self.ev_relations(otypes=self.hu_otypes, oids=self.nthu_oids)

    @property
    def ev_hu_relations(self):
        return self.ev_relations(otypes=self.hu_otypes)

    @property
    def ev_resource_relations(self):
        return self.ev_relations(otypes=self.resource_otypes)

    # endregion

    # ----- GRAPH DISCOVERY WRAPPERS ------------------------------------------------------------------------------------------
    # region

    @property
    def nthu_target_relations(self):
        return self.object_relations("nthu", "target", include_o2o=True)

    @property
    def resource_target_relations(self):
        return self.object_relations("resource", "target", include_o2o=True)

    @property
    def hu_hu_relations(self):
        """Object graph containing just handling units (HUs), no resources."""
        return self.object_relations("hu", "hu", include_o2o=True)

    @property
    def obj_obj_relations(self):
        """Object graph with full node and edge set, including resource-resource edges"""
        return self.object_relations("all", "all", include_o2o=True)

    @property
    def obj_hu_relations(self):
        """Object graph with full node set, but without resource-resource edges"""
        return self.object_relations("all", "hu", include_o2o=True)

    def class_otypes(self, cls: Literal["all", "hu", "resource"]) -> set[str]:
        cls = cls.lower()  # type: ignore
        if cls == "all" or cls == "obj":
            return set(self.ocel.otypes)
        if cls == "hu":
            return self.hu_otypes
        if cls == "thu" or cls == "target":
            raise ValueError(
                f"Target objects are no longer an object type class. Instead, target object IDs are specified."
            )
        if cls == "nthu":
            raise ValueError(
                f"Target objects (and thus NTHUs) are no longer an object type class. Instead, target object IDs are specified."
            )
        if cls == "resource":
            return self.resource_otypes
        raise ValueError("Unknown object type class '{cls}'")

    @property
    def otype_classes(self) -> pd.Series:
        d = {ot: ("HU" if ot in self.hu_otypes else "Resource") for ot in self.otype_order}
        return pd.Series(d, name="class")

    # endregion

    # ----- OBJECT GRAPH DISCOVERY ------------------------------------------------------------------------------------------
    # region

    def object_relations_filter(
        self,
        cls1: Literal["all", "target", "target_or_hu", "hu", "nthu", "resource"] = "all",
        cls2: Literal["all", "target", "target_or_hu", "hu", "nthu", "resource"] = "all",
    ):
        cls1, cls2 = cls1.lower(), cls2.lower()  # type: ignore
        filter_kwargs = {}
        if cls1 == "hu" or cls1 == "resource":
            filter_kwargs["otype1_filter"] = self.class_otypes(cls1)
        if cls2 == "hu" or cls2 == "resource":
            filter_kwargs["otype2_filter"] = self.class_otypes(cls2)
        if cls1 == "target":
            filter_kwargs["oid1_filter"] = self.target_oids
        if cls2 == "target":
            filter_kwargs["oid2_filter"] = self.target_oids
        if cls1 == "target_or_hu":
            filter_kwargs["oid1_filter"] = self.target_oids | self.hu_oids
        if cls2 == "target_or_hu":
            filter_kwargs["oid2_filter"] = self.target_oids | self.hu_oids
        if cls1 == "nthu":
            filter_kwargs["oid1_filter"] = self.nthu_oids
        if cls2 == "nthu":
            filter_kwargs["oid2_filter"] = self.nthu_oids
        return filter_kwargs

    def object_relations(
        self,
        /,
        cls1: Literal["all", "target", "target_or_hu", "hu", "nthu", "resource"] = "all",
        cls2: Literal["all", "target", "target_or_hu", "hu", "nthu", "resource"] = "all",
        *,
        force_include_targets: bool = True,
        include_o2o: bool = True,
        mirror: bool = False,
        remove_target_target_edges: bool = True,
        remove_otype_loops: bool = False,
        class_info: bool = True,
    ) -> tuple[pd.DataFrame, tuple[str | None, str | None]]:
        """Returns a DataFrame with object relations between two predefined object type classes.
        Supports mirroring the relations when the two classes are equal,
        and removing target-target edges, or edges between objects of the same type."""
        cls1, cls2 = cls1.lower(), cls2.lower()  # type: ignore

        if force_include_targets:
            # Override the class filters taken from graph_mode to always include targets
            if cls1 == "hu":
                cls1 = "target_or_hu"
            elif cls1 == "nthu":
                raise ValueError
            elif cls1 == "resource":
                # filter "target_or_resource" does not exist (not needed)
                raise NotImplementedError
            if cls2 == "hu":
                cls2 = "target_or_hu"
            elif cls2 == "nthu":
                raise ValueError
            elif cls2 == "resource":
                # filter "target_or_resource" does not exist (not needed)
                raise NotImplementedError

        name1 = cls1 if cls1 != cls2 and cls1 != "all" and cls2 != "all" else None
        name2 = cls2 if cls1 != cls2 and cls1 != "all" and cls2 != "all" else None

        relations = self.ocel.object_relations(
            **self.object_relations_filter(cls1, cls2),
            name1=name1,
            name2=name2,
            include_o2o=include_o2o,
            include_o2o_qualifiers=False,
            include_frequencies=False,
            remove_otype_loops=remove_otype_loops,
        )
        oid1_col = "ocel:oid_1" if name1 is None else f"{name1}_oid"
        oid2_col = "ocel:oid_2" if name2 is None else f"{name2}_oid"
        type1_col = "ocel:type_1" if name1 is None else f"{name1}_type"
        type2_col = "ocel:type_2" if name2 is None else f"{name2}_type"
        assert {oid1_col, oid2_col, type1_col, type2_col}.issubset(relations.columns)

        # Enrich with otype class info
        if cls1 == "all" and class_info:
            relations["is_hu_1"] = relations[type1_col].isin(self.hu_otypes)
            relations["is_resource_1"] = relations[type1_col].isin(self.resource_otypes)
        if cls1 not in {"target", "nthu"}:
            relations["is_target_1"] = relations[oid1_col].isin(self.target_oids)
            if class_info:
                relations["is_nthu_1"] = relations[oid1_col].isin(self.nthu_oids)
        if cls2 == "all" and class_info:
            relations["is_hu_2"] = relations[type2_col].isin(self.hu_otypes)
            relations["is_resource_2"] = relations[type2_col].isin(self.resource_otypes)
        if cls2 not in {"target", "nthu"}:
            relations["is_target_2"] = relations[oid2_col].isin(self.target_oids)
            if class_info:
                relations["is_nthu_2"] = relations[oid2_col].isin(self.nthu_oids)

        # Post-processing
        if mirror:
            # Duplicates the relations mirrored, essentially making the graph undirected.
            # This feature is needed when joining the relations DataFrame (on ocel:oid_1) with an object DataFrame to go a step along the graph.
            # assert cls1 == cls2
            if cls1 != cls2:
                # Before mirroring, need to drop columns only present for _1 or _2.
                for c in ["hu", "resource", "target", "nthu"]:
                    col1, col2 = f"is_{c}_1", f"is_{c}_2"
                    if col1 in relations.columns and col2 not in relations.columns:
                        relations.drop(columns=[col1], inplace=True)
                    elif col2 in relations.columns and col1 not in relations.columns:
                        relations.drop(columns=[col2], inplace=True)

            assert not any(relations["ocel:oid_1"] == relations["ocel:oid_2"])
            # Currently self-loops are forbidden. When introducing, filter s.t. they are not duplicated!
            relations = pd.concat([relations, mirror_dataframe(relations)], ignore_index=True)

        if remove_target_target_edges:
            # Remove (undirected) edges between target objects.
            # This is only applicable if both sides' filters are a superset of targets, and at least one side is a proper superset of targets.
            assert cls1 != "nthu" and cls2 != "nthu"
            if cls1 == "target":
                assert not (cls1 == "target" and cls2 == "target")
                relations = relations[~relations["is_target_2"]]
            elif cls2 == "target":
                relations = relations[~relations["is_target_1"]]
            else:
                relations = relations[~relations["is_target_1"] | ~relations["is_target_2"]]

        if not class_info:
            columns = sum(
                [
                    [f"is_target_{i}", f"is_nthu_{i}", f"is_hu_{i}", f"is_resource_{i}"]
                    for i in [1, 2]
                ],
                [],
            )
            relations = relations.drop(columns=columns, errors="ignore")

        return relations, (name1, name2)

    def otype_relations(
        self,
        cls1: Literal["all", "target", "target_or_hu", "hu", "nthu", "resource"] = "all",
        cls2: Literal["all", "target", "target_or_hu", "hu", "nthu", "resource"] = "all",
        include_o2o: bool = True,
        mirror: bool = False,
        remove_target_target_edges: bool = False,
    ) -> pd.DataFrame:
        """Discovers the object graphs and summarizes it, grouping objects by type."""
        cls1, cls2 = cls1.lower(), cls2.lower()  # type: ignore
        object_relations, names = self.object_relations(
            cls1,
            cls2,
            include_o2o=include_o2o,
            mirror=mirror,
            remove_target_target_edges=remove_target_target_edges,
        )
        raise NotImplementedError

    # endregion

    # ----- DUMMY CONSTRUCTOR ------------------------------------------------------------------------------------------
    # region

    @staticmethod
    def dummy(
        ocel: OCELWrapper,
        target_otypes: set[str],
        hu_otypes: set[str],
        resource_otypes: set[str],
        *,
        events: float | dict[str, float] = 1,
        e2o: float | dict[tuple[str, str], float] = 0,
        **kwargs,
    ) -> Allocator:
        """Creates an allocator object for minimal examples, and sets user-defined emission values.
        Event emissions can be set ...
        - to a constant value (pass a float)
        - by passing a dict keyed by activities or event IDs.
        E2O emissions can be set ...
        - to a constant value (pass a float)
        - by passing a dict keyed by tuples like (activity|eid, otype|oid).
        """
        event_emissions = ocel.events.copy()
        if isinstance(events, (float, int)):
            event_emissions["ocean:event_emissions"] = events
        elif isinstance(events, dict):
            event_emissions["ocean:event_emissions"] = 0
            for key, x in events.items():
                # Infer if key is activity or event ID
                if key not in ocel.activities and not (ocel.events["ocel:eid"] == key).any():
                    raise ValueError(
                        f"Keys of the events arg have to be either activities or event IDs, got '{key}'"
                    )
                key_col = "ocel:activity" if key in ocel.activities else "ocel:eid"
                event_emissions["ocean:event_emissions"] += np.where(
                    event_emissions[key_col] == key, x, 0
                )
        else:
            raise ValueError

        e2o_emissions = ocel.relations.copy()
        if isinstance(e2o, (float, int)):
            e2o_emissions["ocean:e2o_emissions"] = e2o
        elif isinstance(e2o, dict):
            e2o_emissions["ocean:e2o_emissions"] = 0
            for (evkey, objkey), x in e2o.items():
                # Infer if keys are types or IDs
                if evkey not in ocel.activities and not (ocel.events["ocel:eid"] == evkey).any():
                    raise ValueError(
                        f"The first key component of the e2o arg have to be either activities or event IDs, got '{evkey}'"
                    )
                if objkey not in ocel.otypes and not (ocel.objects["ocel:oid"] == objkey).any():
                    raise ValueError(
                        f"The second key component of the e2o arg have to be either object types or object IDs, got '{objkey}'"
                    )
                evkey_col = "ocel:activity" if evkey in ocel.activities else "ocel:eid"
                objkey_col = "ocel:type" if objkey in ocel.otypes else "ocel:oid"
                e2o_emissions["ocean:e2o_emissions"] += np.where(
                    (e2o_emissions[evkey_col] == evkey) & (e2o_emissions[objkey_col] == objkey),
                    x,
                    0,
                )
        else:
            raise ValueError

        return Allocator(
            ocel=ocel,
            targets=target_otypes,
            hu_otypes=hu_otypes,
            resource_otypes=resource_otypes,
            event_emissions=event_emissions,
            e2o_emissions=e2o_emissions,
            **kwargs,
        )

    # endregion
