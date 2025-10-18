from __future__ import annotations

import platform
import warnings
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Iterable, Literal, Optional, TypeVar, cast
from uuid import uuid4

import networkx as nx
import numpy as np
import pandas as pd
import pm4py
from cachetools import LRUCache
from pm4py.objects.ocel.obj import OCEL as PM4PYOCEL

from ocelescope.ocel.constants import OCELFileExtensions
from ocelescope.ocel.extension import OCELExtension
from ocelescope.ocel.filter import OCELFilter
from ocelescope.ocel.util.attributes import (
    AttributeSummary,
    summarize_event_attributes,
    summarize_object_attributes,
)
from ocelescope.ocel.util.relations import (
    RelationCountSummary,
    summarize_e2o_counts,
    summarize_o2o_counts,
)
from ocelescope.util.cache import instance_lru_cache
from ocelescope.util.pandas import mmmm

T = TypeVar("T", bound="OCELExtension")


class OCEL:
    """A wrapper class around a PM4PY Object-Centric Event Log (OCEL).


    This class provides structured access, analysis, and manipulation
    tools for OCEL objects loaded via PM4PY. It supports operations such as:
    - Filtering events and objects
    - Extracting statistical summaries
    - Discovering object-centric Petri nets (OCPNs)
    - Joining and enriching data with object and activity types
    - Managing metadata, extensions, and caching

    Attributes:
        ocel: The underlying PM4PY OCEL object.
        meta: Metadata describing this OCEL (file path, version, etc.).
    """

    def __init__(self, ocel: PM4PYOCEL, id: Optional[str] = None):
        """Initialize an OCEL wrapper around a PM4PY OCEL object.

        Args:
            ocel: The PM4PY OCEL object representing the event log.
            id: Optional unique ID for this OCEL instance.
                If not provided, a new UUID will be generated.
        """
        self._id = id if id is not None else str(uuid4())

        self.ocel: PM4PYOCEL = ocel
        # Metadata, to be set manually after creating the instance
        self.meta: dict[str, Any] = {}
        self._cache_info = {}

        # extensions
        self._extensions: dict[type[OCELExtension], OCELExtension] = {}

        self._init_cache()

    def _init_cache(self):
        # Instance-level cache object (using cachetools)
        self.cache = LRUCache(maxsize=128)
        self.cache_lock = Lock()

    @property
    def id(self) -> str:
        """Return the unique identifier of the OCEL instance

        Returns:
            The OCEL's unique identifier string.
        """
        return self._id

    # ----- Pm4py Aliases ------------------------------------------------------------------------------------------
    # region

    @property
    def events(self) -> pd.DataFrame:
        """Return the event table from the underlying OCEL.

        Returns:
            DataFrame containing event attributes.
        """
        return self.ocel.events

    @property
    def objects(self):
        """Return the object table from the underlying OCEL.

        Returns:
            DataFrame of all objects in the log.
        """
        return self.ocel.objects

    @property
    def object_changes(self) -> pd.DataFrame:
        """Return the object changes table from the underlying OCEL.

        Returns:
            DataFrame of object attribute changes.
        """
        return self.ocel.object_changes

    @property
    def relations(self) -> pd.DataFrame:
        """Return the event-object relations table.

        Returns:
            DataFrame mapping events to related objects.
        """
        return self.ocel.relations

    # endregion
    # ----- BASIC PROPERTIES / STATS ------------------------------------------------------------------------------------------
    # region

    @property
    @instance_lru_cache()
    def activities(self) -> list[str]:
        """Return a sorted list of all unique activity names in the log.

        Returns:
            Sorted list of unique activity labels.
        """
        return list(sorted(self.ocel.events["ocel:activity"].unique().tolist()))

    @property
    @instance_lru_cache()
    def activity_counts(self) -> pd.Series:
        """Return a frequency count of each activity in the event log.

        Returns:
            Series indexed by activity names with occurrence counts.
        """
        return self.ocel.events["ocel:activity"].value_counts()

    @property
    @instance_lru_cache()
    def object_types(self) -> list[str]:
        """Return a sorted list of all unique object types in the log.

        Returns:
            Sorted list of object type names.
        """
        return list(sorted(self.ocel.objects["ocel:type"].unique().tolist()))

    @property
    def otypes(self) -> list[str]:
        """Alias for object_types"""
        return self.object_types

    @property
    @instance_lru_cache()
    def otype_counts(self) -> pd.Series:
        """Return a frequency count of each object type in the log.

        Returns:
            Series indexed by object types with counts.
        """

        return self.ocel.objects["ocel:type"].value_counts()

    @property
    @instance_lru_cache()
    def objects_with_otypes(
        self,
    ) -> pd.Series:
        """Return a mapping from each object ID to its object type.

        Returns:
            Series indexed by object IDs containing object types.
        """

        return self.ocel.objects[["ocel:oid", "ocel:type"]].set_index("ocel:oid")[  # type: ignore
            "ocel:type"
        ]

    @property
    @instance_lru_cache()
    def events_with_activities(self) -> pd.Series:
        """Return a mapping from each event ID to its activity label.

        Returns:
            Series indexed by event IDs containing activity names.
        """
        return self.ocel.events[["ocel:eid", "ocel:activity"]].set_index("ocel:eid")[  # type: ignore
            "ocel:activity"
        ]

    @property
    def obj_otypes(self) -> pd.Series:
        """Alias for objects_with_otypes"""
        return self.objects_with_otypes

    @property
    def event_activities(self) -> pd.Series:
        """Alias for events_with_activities"""
        return self.events_with_activities

    def has_object_types(self, otypes: Iterable[str]) -> bool:
        """Check whether all given object types exist in the OCEL.

        Args:
            otypes (Iterable[str]): Iterable of object type names to check.

        Returns:
            True if all provided types exist, False otherwise.
        """
        return all(ot in self.otypes for ot in otypes)

    def has_activities(self, activities: Iterable[str]) -> bool:
        """Check whether all given activities exist in the OCEL.

        Args:
            activities (Iterable[str]): Iterable of activity names.

        Returns:
            True if all provided activities exist, False otherwise.
        """
        return all(act in self.activities for act in activities)

    # endregion

    # ----- Filtering ------------------------------------------------------------------------------------------
    # region

    def apply_filter(self, filters: OCELFilter) -> OCEL:
        """Apply filters to the OCEL and return a new filtered OCEL instance.

        Uses the internal filtering utility (`apply_filters`) to
        create a subset of the original OCEL that satisfies given criteria.

        Args:
            filters (OCELFilter): Filter object or list of filters to apply.

        Returns:
            A new OCEL instance containing only filtered events and objects.

        """
        from .filter import apply_filters

        filtered_ocel = apply_filters(self, filters=filters)
        filtered_ocel.meta = self.meta
        filtered_ocel._extensions = self._extensions

        return filtered_ocel

    # endregion
    # ----- PROCESS DISCOVERY ------------------------------------------------------------------------------------------
    # region

    @instance_lru_cache(make_hashable=True)
    def ocpn(
        self,
        otypes: set[str] | None = None,
        inductive_miner_variant: Literal["im", "imd"] = "im",
        diagnostics_with_tbr: bool = False,
    ) -> dict[str, Any]:
        """Discover an Object-Centric Petri Net (OCPN) for the given object types.

        Wraps `pm4py.discover_oc_petri_net`, caching results per object type subset.

        Args:
            otypes (set[str] | None): Object types to include. If None, all types are used.
            inductive_miner_variant (Literal["im", "imd"]): Variant of inductive miner.
            diagnostics_with_tbr (bool): Whether to compute transition-based diagnostics.

        Returns:
            The discovered OCPN model and metadata.

        Raises:
            ValueError: If the provided object type set is invalid or empty.
        """

        # Complete parameters
        if otypes is None:
            otypes = set(self.otypes)
        sorted_otypes = sorted([ot for ot in otypes if ot in self.otypes])
        if not sorted_otypes:
            raise ValueError("OCPN Discovery received invalid or empty object type set.")

        # Discover OCPN
        # TODO might use own filter function
        filtered_ocel = pm4py.filter_ocel_object_types(self.ocel, sorted_otypes)
        ocpn = pm4py.discover_oc_petri_net(
            filtered_ocel,
            inductive_miner_variant=inductive_miner_variant,
            diagnostics_with_tbr=diagnostics_with_tbr,
        )

        return ocpn

    @instance_lru_cache()
    def flatten(self, otype: str) -> pd.DataFrame:
        if otype not in self.otypes:
            raise ValueError(f"Object type '{otype}' not found")
        return pm4py.ocel.ocel_flattening(ocel=self.ocel, object_type=otype)

    @instance_lru_cache()
    def directly_follows_graph(self, otype: str) -> dict[tuple[str, str], int]:
        """Discover the Directly-Follows Graph (DFG) for the given object type.

        Args:
            otype (str): Object type for which to discover DFG.

        Returns:
            Mapping of activity pairs to frequencies.
        """
        dfg, _, _ = pm4py.discovery.discover_directly_follows_graph(self.flatten(otype))
        return dfg

    def dfg(self, otype: str):
        """Alias of directly_follows_graph"""
        return self.directly_follows_graph(otype)

    @instance_lru_cache()
    def eventually_follows_graph(self, otype: str) -> set[tuple[str, str]]:
        """Compute the Eventually-Follows Graph (EFG) for the given object type.

        The EFG is derived as the transitive closure of the DFG.

        Args:
            otype (str): The object type of interest.

        Returns:
            Set of (source_activity, target_activity) pairs.
        """
        dfg = self.directly_follows_graph(otype=otype)
        DFG = nx.DiGraph()
        DFG.add_edges_from(dfg.keys())
        EFG = nx.transitive_closure(DFG)

        # Output graph as edge set
        # efg = {u: set(EFG.successors(u)) for u in EFG.nodes() if EFG.out_degree(u)}
        efg = set(EFG.edges())
        return efg

    def efg(self, otype: str):
        """Alias of eventually_follows_graph"""
        return self.eventually_follows_graph(otype)

    # endregion

    # ----- O2O RELATIONS ------------------------------------------------------------------------------------------
    # region

    @property
    @instance_lru_cache()
    def o2o(self):
        """Return all Object-to-Object (O2O) relationships with object type enrichment.

        Each O2O relation links two object IDs (e.g., "order" ↔ "item").
        Both ends are enriched with their respective object types.

        Returns:
            DataFrame of O2O relations
        """
        return self.join_otypes(self.ocel.o2o.rename(columns={"ocel:oid": "ocel:oid_1"}))

    @instance_lru_cache()
    def o2o_summary(
        self, direction: Optional[Literal["source", "target"]] = "source"
    ) -> list[RelationCountSummary]:
        """Summarize Object-to-Object (O2O) relationships by qualifier and type.

        This function aggregates and summarizes O2O relationships between
        objects in an OCEL, including their qualifiers and type information.
        It reports how many target objects of each type are connected to
        each source object type (and vice versa if direction is reversed).

        Directionality works as follows:
        - If ``direction="source"`` (default), the first object column
        is treated as the source and the second as the target.
        - If ``direction="target"``, the perspective is inverted.

        Args:
            ocel (OCEL): The PM4PY OCEL object containing O2O relations.
            direction (Literal["source", "target"], optional): Direction of summarization.
                Defaults to "source". Determines which object column is treated as the source.

        Returns:
            List of summary statistics for each
            (qualifier, source type, target type) combination, with:
                - ``min_count``: minimum number of target objects per source object
                - ``max_count``: maximum number of target objects per source object
                - ``sum``: total number of such relations in the log

        """
        return summarize_o2o_counts(self.ocel, direction=direction)

    # endregion
    # ----- E2O RELATIONS ------------------------------------------------------------------------------------------
    # region

    @instance_lru_cache()
    def e2o_summary(self, direction: Optional[Literal["source", "target"]] = "source"):
        """Summarize Event-to-Object (E2O) relationships by qualifier and type.

        This function computes summary statistics for relationships between
        events and objects in an OCEL, distinguishing directionality:
        - If ``direction="source"`` (default), events are treated as sources
            and objects as targets.
        - If ``direction="target"``, objects are treated as sources
            and events as targets.

        The result shows how many objects of each type are associated with
        each event activity (or vice versa), including the minimum, maximum,
        and total relation counts.

        Args:
            ocel (OCEL): The PM4PY OCEL object containing event-object relations.
            direction (Literal["source", "target"], optional): Direction of analysis.
                Defaults to "source". If "target", swaps event/object roles.

        Returns:
            List of summary statistics for each
            (qualifier, source type, target type) relation, with:
                - ``min_count``: minimum number of relations per source instance
                - ``max_count``: maximum number of relations per source instance
                - ``sum``: total count of such relations across the log
        """
        return summarize_e2o_counts(self.ocel, direction=direction)

    # endregion
    # ----- ATTRIBUTES ------------------------------------------------------------------------------------------
    # region
    @property
    def eattr_names(self) -> list[str]:
        """Return names of all non-OCEL-prefixed event attributes.

        Returns:
            Sorted list of event attribute names.
        """
        return sorted([col for col in self.ocel.events.columns if not col.startswith("ocel:")])

    @property
    def oattr_names_static(self) -> list[str]:
        """Return static object attribute names.

        Returns:
            Sorted list of static object attribute names.
        """
        return sorted(
            [
                col
                for col in self.ocel.objects.columns[self.ocel.objects.count() > 0]
                if not col.startswith("ocel:")
            ]
        )

    @property
    def oattr_names_dynamic(self) -> list[str]:
        """Return dynamic object attribute names (from object_changes table).

        Excludes OCEL system columns and internal counters.

        Returns:
            Sorted list of dynamic object attribute names.
        """
        return sorted(
            [
                col
                for col in self.ocel.object_changes.columns[self.ocel.object_changes.count() > 0]
                if not col.startswith("ocel:") and col != "@@cumcount"
            ]
        )

    @property
    def oattr_names(self) -> list[str]:
        """Return the combined set of static and dynamic object attributes.

        Returns:
            Sorted unique list of all object attribute names.
        """
        return sorted(set(self.oattr_names_static + self.oattr_names_dynamic))

    @property
    @instance_lru_cache()
    def object_attribute_summary(self) -> dict[str, list[AttributeSummary]]:
        """Summarize all object attributes and their statistical properties.

        Returns:
            Mapping from object type to list of attribute summaries.
        """
        return summarize_object_attributes(self.ocel)

    @property
    @instance_lru_cache()
    def event_attribute_summary(self) -> dict[str, list[AttributeSummary]]:
        """Summarize all event attributes and their statistical properties.

        Returns:
            Mapping from activity to list of attribute summaries.
        """
        return summarize_event_attributes(self.ocel)

    # endregion

    # ----- OBJECT LIFECYCLES, ACTIVITY ORDER ------------------------------------------------------------------------------------------
    # region

    @property
    @instance_lru_cache()
    def num_events_per_object(self):
        """Return the number of events linked to each object, with type info.

        Returns:
            Columns ["ocel:oid", "num_events", "ocel:type"].
        """
        return self.join_otype(
            self.ocel.relations.groupby("ocel:oid")["ocel:eid"]
            .count()
            .rename("num_events")
            .reset_index()
        )

    @property
    @instance_lru_cache()
    def median_num_events_per_otype(self):
        """Compute the median number of events per object type.

        Returns:
            Series indexed by object type with median event counts.
        """
        return self.num_events_per_object.groupby("ocel:type")["num_events"].median()

    @instance_lru_cache()
    def sort_otypes(self) -> list[str]:
        """Return object types sorted by their median number of related events.

        Returns:
            Ordered list of object types.
        """
        return (
            self.median_num_events_per_otype.reset_index()
            .sort_values(["num_events", "ocel:type"])["ocel:type"]
            .tolist()
        )

    # endregion

    # ----- E2O Relations ------------------------------------------------------------------------------------------
    # region

    @property
    @instance_lru_cache()
    def type_relations(self) -> pd.DataFrame:
        """Return event-type-object-type-qualifier frequency table.

        Groups relations by (activity, object type, qualifier) and counts occurrences.

        Returns:
            DataFrame with columns ["ocel:activity", "ocel:type", "ocel:qualifier", "freq"].
        """
        x: pd.Series = self.ocel.relations.groupby(
            ["ocel:activity", "ocel:type", "ocel:qualifier"]
        ).size()  # type: ignore
        return x.reset_index(name="freq")

    @property
    @instance_lru_cache()
    def type_relation_frequencies(self) -> pd.Series:
        """Aggregate frequencies of type relations across qualifiers.

        Returns:
            Total frequency per (activity, object type) pair.
        """
        return self.type_relations.groupby(["ocel:activity", "ocel:type"])["freq"].sum()

    @property
    @instance_lru_cache()
    def objects_per_event(self) -> pd.DataFrame:
        """Compute statistics for the number of objects per event by activity and object type.

        Returns:
            Pivoted table with mean, min, max, median, and uniqueness metrics per (activity, type).
        """
        # TODO nonzero does not work here. Due to the groupby calls, there are no zero entries, leading to nonzero being either 1 or NaN.
        type_relations: pd.DataFrame = (
            self.relations.groupby(["ocel:eid", "ocel:activity", "ocel:type"], as_index=False)
            .size()
            .rename(columns={"size": "num_objects"})  # type: ignore
            .groupby(["ocel:activity", "ocel:type"], as_index=False)["num_objects"]
            .pipe(mmmm, nonzero=False, dtype=int)  # type: ignore
        )
        type_relations["always"] = np.where(
            type_relations["min"] == type_relations["max"],
            type_relations["min"],
            np.nan,
        )
        type_relations["unique"] = type_relations["max"] == 1
        type_relations["always_unique"] = type_relations["always"] == 1
        type_relation_stats = pd.pivot(
            type_relations,
            columns="ocel:type",
            index="ocel:activity",
            values=type_relations.columns[2:],  # type: ignore
        )  # type: ignore

        return type_relation_stats

    @property
    @instance_lru_cache()
    def objects_per_activity(self) -> pd.DataFrame:
        """Compute counts of objects of each type per activity.

        Includes statistics for:
            - min/max/mean number of objects per event
            - absolute and relative number of nonzero occurrences

        Returns:
            Summary DataFrame indexed by activity, object type, and qualifier.
        """
        event_otypes = (
            self.relations.groupby(["ocel:eid", "ocel:type", "ocel:qualifier"], as_index=False)
            .agg({"ocel:oid": "size", "ocel:activity": "first"})
            .rename(columns={"ocel:oid": "num_objs"})
        )
        act_otype_counts = (
            event_otypes.groupby(["ocel:activity", "ocel:type", "ocel:qualifier"], as_index=False)[
                "num_objs"
            ]
            .agg(["min", "max", "mean", np.count_nonzero])
            .rename(columns={"count_nonzero": "nonzero_abs"})
        )
        act_otype_counts = act_otype_counts.join(
            self.activity_counts.rename("num_events"), on="ocel:activity"
        )
        act_otype_counts["nonzero_rel"] = (
            act_otype_counts["nonzero_abs"] / act_otype_counts["num_events"]
        )
        return act_otype_counts

    def unique_objects_per_activity(
        self,
        min_rel_freq: float = 0,
    ) -> pd.DataFrame:
        """Return activities with unique object associations per event.

        Filters for object types or qualifiers that occur at most once per event
        and exceed a minimum relative frequency threshold.

        Args:
            min_rel_freq (float, optional): Minimum share of events that must
                include the object type. Defaults to 0.

        Returns:
            Filtered DataFrame of unique object relationships per activity.
        """
        # Unique without qualifier filtering (sum over qualifiers of min/max/mean)
        rel_stats_overall = self.objects_per_activity.groupby(
            ["ocel:activity", "ocel:type"], as_index=False
        )[["min", "max", "nonzero_rel"]].agg("sum")
        rel_stats_overall.insert(2, "ocel:qualifier", None)

        # Unique per qualifier
        rel_stats_qual = self.objects_per_activity[rel_stats_overall.columns.tolist()]

        rel_stats = pd.concat(
            [rel_stats_overall, rel_stats_qual],
            ignore_index=True,
        ).sort_values(["ocel:activity", "ocel:type", "ocel:qualifier"], na_position="first")
        rel_stats = rel_stats[(rel_stats["max"] == 1) & (rel_stats["nonzero_rel"] >= min_rel_freq)]
        return rel_stats

    # endregion

    # ----- E2O Qualifiers ------------------------------------------------------------------------------------------
    # region

    @property
    @instance_lru_cache()
    def qualifier_frequencies(self) -> pd.DataFrame:
        """Return frequencies of (activity, object type, qualifier) triples.

        Returns:
            Alias of `type_relations`.
        """
        return self.type_relations

    @instance_lru_cache()
    def get_qualifiers(
        self,
        otype: str | None = None,
        activity: str | None = None,
    ) -> set[str]:
        """Return frequencies of (activity, object type, qualifier) triples.

        Returns:
            Alias of `type_relations`.
        """
        qf = self.qualifier_frequencies
        if otype:
            qf = qf[qf["ocel:type"] == otype]
        if activity:
            qf = qf[qf["ocel:activity"] == activity]
        return set(qf["ocel:qualifier"])

    @instance_lru_cache()
    def are_qualifiers_unique(self) -> bool:
        """Check if qualifiers are uniquely determined by (activity, object type).

        Returns:
            True if each (activity, type) pair has exactly one qualifier.
        """
        return (self.type_relations.groupby(["ocel:activity", "ocel:type"]).size() == 1).all()  # type: ignore

    # endregion

    # ----- HELPER FUNCTIONS ------------------------------------------------------------------------------------------
    # region
    def join_otype(
        self, df: pd.DataFrame, col_oid: str = "ocel:oid", col_otype: str = "ocel:type"
    ) -> pd.DataFrame:
        """Join object type information into a DataFrame containing object IDs.

        Args:
            df (pd.DataFrame): DataFrame containing an object ID column.
            col_oid (str, optional): Name of the object ID column. Defaults to "ocel:oid".
            col_otype (str, optional): Desired name for the joined type column. Defaults to "ocel:type".

        Returns:
            Input DataFrame with an added column containing object types.
        """
        return df.join(self.obj_otypes.rename(col_otype), on=col_oid)

    def join_otypes(
        self,
        df: pd.DataFrame,
        col_oid_1: str = "ocel:oid_1",
        col_oid_2: str = "ocel:oid_2",
        col_otype_1: str = "ocel:type_1",
        col_otype_2: str = "ocel:type_2",
    ) -> pd.DataFrame:
        """Join object types for both ends of a pairwise object relation DataFrame.

        Args:
            df (pd.DataFrame): DataFrame containing two object ID columns.
            col_oid_1 (str): First object ID column name.
            col_oid_2 (str): Second object ID column name.
            col_otype_1 (str): New column name for first object type.
            col_otype_2 (str): New column name for second object type.

        Returns:
            Enriched DataFrame with both object types.
        """
        df = df.join(self.obj_otypes.rename(col_otype_1), on=col_oid_1)
        df = df.join(self.obj_otypes.rename(col_otype_2), on=col_oid_2)
        return df

    def join_activity(
        self,
        df: pd.DataFrame,
        col_eid: str = "ocel:eid",
        col_activity: str = "ocel:activity",
    ) -> pd.DataFrame:
        """Join event activity labels into a DataFrame containing event IDs.

        Args:
            df (pd.DataFrame): DataFrame with an event ID column.
            col_eid (str, optional): Column name for event IDs. Defaults to "ocel:eid".
            col_activity (str, optional): Name for joined activity column. Defaults to "ocel:activity".

        Returns:
            Enriched DataFrame with event activity column.
        """
        return df.join(self.event_activities.rename(col_activity), on=col_eid)

    def join_activities(
        self,
        df: pd.DataFrame,
        col_eid_1: str = "ocel:eid_1",
        col_eid_2: str = "ocel:eid_2",
        col_activity_1: str = "ocel:activity_1",
        col_activity_2: str = "ocel:activity_2",
    ) -> pd.DataFrame:
        """Join activities for both ends of a pairwise event relation DataFrame.

        Args:
            df (pd.DataFrame): DataFrame containing two event ID columns.
            col_eid_1 (str): First event ID column.
            col_eid_2 (str): Second event ID column.
            col_activity_1 (str): Output name for first activity column.
            col_activity_2 (str): Output name for second activity column.

        Returns:
            Enriched DataFrame containing activity labels for both events.
        """
        df = df.join(self.event_activities.rename(col_activity_1), on=col_eid_1)
        df = df.join(self.event_activities.rename(col_activity_2), on=col_eid_2)
        return df

    # endregion

    # ----- OCELWrapper CLASS UTILS ------------------------------------------------------------------------------------------
    # region

    def __str__(self):
        return f"OCELWrapper [{len(self.events)} events, {len(self.objects)} objects]"

    def __repr__(self):
        return str(self)

    def __deepcopy__(self, memo: dict[int, Any]):
        # TODO revisit this. Are the underlying DataFrames mutable? If not, might optimize this
        pm4py_ocel = deepcopy(self.ocel, memo)
        ocel = OCEL(ocel=pm4py_ocel, id=str(uuid4()))
        ocel.meta = deepcopy(self.meta, memo)
        return ocel

    @property
    def cache_size(self):
        return {name: cache_info.currsize for name, cache_info in self._cache_info.items()}

    # endregion

    # ----- CONSTRUCTOR-LIKE ----------------------------------------------------------------------------------
    # region

    def event_projections(self, events: list[set[str]]) -> list[OCEL]:
        """Create sub-OCELs for given subsets of events.

        Each resulting OCEL contains all objects linked to its corresponding event subset.

        Args:
            events (list[set[str]]): List of event ID sets, one per desired projection.

        Returns:
            List of new OCEL instances.
        """
        split = []
        for C in events:
            sublog = pm4py.filter_ocel_events(self.ocel, C)
            split.append(OCEL(sublog))
        return split

    def object_projections(self, objects: list[set[str]]) -> list[OCEL]:
        """Create sub-OCELs for given subsets of objects.

        Each resulting OCEL contains all events linked to its corresponding object subset.

        Args:
            objects (list[set[str]]): List of object ID sets, one per desired projection.

        Returns:
            List of new OCEL instances.
        """

        split = []
        for C in objects:
            sublog = pm4py.filter_ocel_objects(self.ocel, C)
            split.append(OCEL(sublog))
        return split

    # endregion

    # ----- IMPORT WRAPPER FUNCTIONS ------------------------------------------------------------------------------------------
    # region
    @staticmethod
    def read_ocel(
        path: Path | str,
        original_file_name: str | None = None,
        version_info: bool = False,
        upload_date: datetime | None = None,
    ) -> OCEL:
        """Read an OCEL file from disk and wrap it in an `OCEL` instance.

        Supports `.sqlite`, `.xmlocel`, and `.jsonocel` formats.

        Args:
            path (Path): Path to the OCEL file.
            original_file_name (str, optional): Original filename for metadata.
            version_info (bool, optional): Include Python and PM4PY version info. Defaults to False.
            upload_date (datetime, optional): Custom upload date. Defaults to now.

        Returns:
            A new OCEL instance containing the imported log.

        Raises:
            ValueError: If the file extension is unsupported.
        """
        path = Path(path)

        report = {}

        if version_info:
            report["pythonVersion"] = platform.python_version()
            report["pm4pyVersion"] = pm4py.__version__

        with warnings.catch_warnings(record=True):
            match path.suffix:
                case ".sqlite":
                    pm4py_ocel = pm4py.read.read_ocel2_sqlite(str(path))
                case ".xmlocel":
                    pm4py_ocel = pm4py.read.read_ocel2_xml(str(path))
                case ".jsonocel":
                    pm4py_ocel = pm4py.read.read_ocel2_json(str(path))
                case _:
                    raise ValueError(f"Unsupported extension: {path.suffix}")

        ocel = OCEL(pm4py_ocel)

        report["ocelStrPm4py"] = str(pm4py_ocel)
        report["ocelStr"] = str(ocel)

        ocel.meta = {
            "path": str(path),
            "fileName": original_file_name or str(path.name),
            "importReport": report,
            "uploadDate": upload_date.isoformat() if upload_date else datetime.now().isoformat(),
        }

        return ocel

    def write_ocel(
        self,
        file_path: Path,
        ext: OCELFileExtensions,
    ):
        """Write the OCEL to disk in the specified format.

        Also attempts to export any loaded extensions.

        Args:
            file_path (Path): Destination file path.
            ext (OCELFileExtensions): File extension (e.g., '.xmlocel', '.jsonocel', '.sqlite').
        """
        match ext:
            case ".xmlocel":
                pm4py.write_ocel2_xml(self.ocel, str(file_path))
            case ".jsonocel":
                pm4py.write_ocel2_json(self.ocel, str(file_path))
            case _:
                pm4py.write_ocel2_sqlite(self.ocel, str(file_path))

        for extension in self.get_extensions_list():
            if ext in extension.supported_extensions:
                try:
                    extension.export_extension(file_path)
                except Exception:
                    print("failed to write extension")

    # endregion
    #
    def rename(self, new_name: str):
        self.meta["fileName"] = new_name

    # ----- EXTENTIONS ------------------------------------------------------------------------------------------
    # region
    def load_extension(self, extensions: list[type[OCELExtension]]):
        """Load and attach supported extensions from the OCEL file.

        Args:
            extensions (list[type[OCELExtension]]): List of extension classes to attempt loading.
        """
        path = self.meta.get("path")

        if not path:
            return

        path = Path(path)

        for ext_cls in extensions:
            try:
                if path.suffix in ext_cls.supported_extensions and ext_cls.has_extension(path):
                    self._extensions[ext_cls] = ext_cls.import_extension(ocel=self, path=path)
            except Exception:
                print("failed to load extension")

    def get_extension(self, extension: type[T]) -> Optional[T]:
        """Retrieve a loaded extension of the given type.

        Args:
            extension (Type[T]): Extension class.

        Returns:
            Instance of the extension, if loaded.
        """
        return cast(Optional[T], self._extensions.get(extension))

    def get_extensions_list(self) -> list[OCELExtension]:
        """Return all currently loaded extensions.

        Returns:
            List of extension instances.
        """
        return list(self._extensions.values())

    # endregion
