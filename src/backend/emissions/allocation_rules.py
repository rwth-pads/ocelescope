from __future__ import annotations

from abc import ABC
from typing import TYPE_CHECKING, Any, Iterable, Literal

import networkx as nx
import numpy as np
import pandas as pd

import ocel.utils as ocel_util
from api.logger import logger
from emissions.allocation_graph import GraphMode, ObjectGraph
from util.graph import reachability_multi_source
from util.misc import exactly_one, set_str
from util.pandas import prepend_level

if TYPE_CHECKING:
    from emissions.allocation import Allocator

ALLOC_REPORT_COLUMNS = [
    "ocel:oid",
    "ocean:object_emissions",
    "ocel:eid",
    "alloc_wave",
    "alloc_note",
    "distance",
    "otype_path",
    "activity_filter",
]


class AllocationRule(ABC):
    wave_index: int | None = None
    has_run: bool = False
    event_stats: pd.DataFrame
    """Event-level statistics, with `num_targets` and `distance` (for *ClosestTargets*)"""
    _num_events_properly_allocated = np.nan
    """Number of events that have been allocated to a proper subset of the target objects"""

    def __init__(self, alloc: Allocator):
        self.alloc = alloc
        self.ocel = self.alloc.ocel

    def exec(self): ...

    @property
    def key(self):
        return f"{self.wave_index}_{'_'.join(self.name.lower().split())}"

    @property
    def name(self):
        name = self.__class__.__name__
        if name.endswith("Allocation"):
            return name[:-10]
        return name

    def assign(
        self,
        object_emissions: pd.DataFrame,
    ):
        """Assigns the given emissions to target objects. This can be called multiple times, adding up existing emissions."""
        if object_emissions.empty:
            return
        if object_emissions.index.name == "thu_oid":
            raise NotImplementedError("Rename thu_oid!")
        if object_emissions.index.name in {"ocel:oid", "target_oid"}:
            object_emissions.reset_index(inplace=True)
        if "thu_oid" in object_emissions.columns:
            raise NotImplementedError("Rename thu_oid!")
        if "ocel:oid" not in object_emissions.columns and "target_oid" in object_emissions.columns:
            object_emissions.rename(columns={"target_oid": "ocel:oid"}, inplace=True)
        if not {"ocel:oid", "ocean:object_emissions"}.issubset(object_emissions.columns):
            raise KeyError("object_emissions misses required columns.")

        object_emissions["alloc_wave"] = self.key

        if (
            not object_emissions["ocel:oid"].isin(self.alloc.target_oids).all()
            and not self.alloc.ignore_targets
        ):
            raise ValueError(
                "object_emissions contains index values that are not target object IDs."
            )

        if self.alloc.save_report:
            # object_emissions = object_emissions.reindex(self.alloc.report.columns, axis=1)
            if self.alloc.report.empty:
                self.alloc.report = object_emissions
            else:
                self.alloc.report = pd.concat(
                    [
                        self.alloc.report,
                        object_emissions,
                    ],
                    ignore_index=True,
                )
            self.alloc.report = self.alloc.report[
                [
                    *[col for col in ALLOC_REPORT_COLUMNS if col in self.alloc.report.columns],
                    *[col for col in self.alloc.report if col not in ALLOC_REPORT_COLUMNS],
                ]
            ]

        # Increment existing emissions per object
        incr = object_emissions.groupby("ocel:oid")["ocean:object_emissions"].sum().rename("incr")
        self.alloc.target_emissions = (
            pd.merge(
                self.alloc.target_emissions,
                incr,
                left_index=True,
                right_index=True,
                how="outer",
            )
            .fillna(0)
            .sum(axis=1)
            .rename("ocean:object_emissions")
            .rename_axis(index="ocel:oid")
        )

    def log(self, func, msg, indent: int = 1):
        if not self.alloc.silent:
            func(f"Wave {self.wave_index}: {'  ' * indent}{msg}")

    def info(self, msg, indent: int = 1):
        self.log(logger.info, msg, indent=indent)

    def warning(self, msg, indent: int = 1):
        self.log(logger.warning, msg, indent=indent)


class UniformAllocationRule(AllocationRule):

    def exec(self):
        event_targets, kwargs = self.exec_uniform()

        assert "ocel:eid" in event_targets.columns
        if "ocean:event_emissions" not in event_targets.columns:
            event_targets = event_targets.merge(
                self.alloc.remaining_event_emissions[["ocel:eid", "ocean:event_emissions"]],
                on="ocel:eid",
            )
        assert exactly_one(
            [
                "ocel:oid" in event_targets.columns,
                "target_oid" in event_targets.columns,
            ]
        )
        if "target_oid" in event_targets.columns:
            event_targets.rename(columns={"target_oid": "ocel:oid"}, inplace=True)

        if event_targets.empty:
            logger.warning(f"UniformAllocationRule: event_targets is empty")
        elif event_targets["ocel:oid"].isna().all():
            logger.warning(f"UniformAllocationRule: event_targets contains only NaN targets")
        if event_targets.duplicated(subset=["ocel:eid", "ocel:oid"]).any():
            raise ValueError(f"UniformAllocationRule: event_targets has duplicate rows")

        event_targets = event_targets[event_targets["ocel:oid"].notna()]
        event_groups = event_targets.groupby("ocel:eid")
        num_targets_per_event = event_groups.transform("size")

        # Filter for those events that have a target
        has_targets = num_targets_per_event != 0
        num_targets_per_event = num_targets_per_event[has_targets]
        event_targets = event_targets[has_targets]

        event_targets["ocean:object_emissions"] = (
            event_targets["ocean:event_emissions"] / num_targets_per_event
        )
        self.assign(event_targets, **kwargs)  # type: ignore
        eids = set(event_targets["ocel:eid"])
        self.alloc.clear_events(eids)

        # Capture statistics
        self.event_stats: pd.DataFrame = (
            event_groups.size().rename("num_targets").reset_index()  # type: ignore
        )
        if "distance" in event_targets.columns:
            assert (event_groups["distance"].nunique(dropna=False) == 1).all()
            self.event_stats = self.event_stats.merge(
                event_groups["distance"].first(), on="ocel:eid"
            )

        # TODO how is this defined exactly? When |Omega| = 1, should it be considered a proper allocation?
        self._num_events_properly_allocated = (
            self.event_stats["num_targets"] != len(self.alloc.target_oids)
        ).sum()

    def exec_uniform(self) -> tuple[pd.DataFrame, dict[str, Any]]:
        """Computes a DataFrame linking events (and their emissions) to a set of target objects.
        The emissions of those events contained in the data will be distributed uniformly among the targets.
        Other events' emissions will not be allocated."""
        ...


class DirectE2OTargetAllocation(AllocationRule):
    """Assigns E2O emissions to target objects if they are directly linked to them."""

    def exec(self):
        # 1: target E2O emissions - assign directly
        target_e2o_ix = self.alloc.e2o_emissions["ocel:oid"].isin(self.alloc.target_oids)
        if target_e2o_ix.any():
            target_e2o_emissions = self.alloc.e2o_emissions[target_e2o_ix]
            self.assign(
                target_e2o_emissions.groupby("ocel:oid")["ocean:e2o_emissions"].sum().reset_index(),
            )
            self.alloc.e2o_emissions = self.alloc.e2o_emissions[~target_e2o_ix]
            self.alloc.update()
            self.alloc.print_state()

        # num_targets are not counted for this rule.
        # By definition, this is not even an allocation rule but a previous part of the allocation pipeline.
        # (This rule does not fully allocate an event's remaining emissions. Therefore num_targets cannot be added to event_stats of the following rule(s).)
        self.event_stats = pd.DataFrame([], columns=["ocel:eid", "num_targets"])


class ObjectGraphAllocation(AllocationRule):
    def __init__(
        self,
        alloc: Allocator,
        *,
        graph_mode: GraphMode = GraphMode.HU_HU,
        remove_otype_loops: bool,
        max_distance: int,
    ):
        super().__init__(alloc)
        self.graph_mode = graph_mode
        self.remove_otype_loops = remove_otype_loops
        self.max_distance = max_distance


class PdObjectGraphAllocation(ObjectGraphAllocation):
    def __init__(
        self,
        alloc: Allocator,
        **kwargs,
    ):
        super().__init__(alloc, **kwargs)

        # Discover object graph (mirrored, remove target-target edges)
        with self.alloc._init_timer:
            self.og, self.og_obj_names = self.alloc.object_relations(
                *self.graph_mode,
                force_include_targets=True,
                include_o2o=True,
                mirror=True,
                remove_target_target_edges=True,
                remove_otype_loops=self.remove_otype_loops,
            )


class NxObjectGraphAllocation(ObjectGraphAllocation):
    OG: ObjectGraph

    def __init__(
        self,
        alloc: Allocator,
        **kwargs,
    ):
        super().__init__(alloc, **kwargs)
        with self.alloc._init_timer:
            self.OG = ObjectGraph.discover(
                self.alloc,
                self.graph_mode,
                include_o2o=True,
                remove_otype_loops=self.remove_otype_loops,
            )


class ClosestTargetsAllocation(UniformAllocationRule, NxObjectGraphAllocation):
    algorithm: Literal["nx_dijkstra", "nx_bfs", "own_bfs"]
    capture_paths: bool
    object_stats: pd.DataFrame

    def __init__(
        self,
        alloc: Allocator,
        *,
        graph_mode: GraphMode = GraphMode.HU_HU,
        remove_otype_loops: bool,
        max_distance: int,
        capture_paths: bool = False,
        algorithm: Literal["nx_dijkstra", "nx_bfs", "own_bfs"] = "own_bfs",
        **kwargs,
    ):
        # Build graph
        super().__init__(
            alloc,
            graph_mode=graph_mode,
            remove_otype_loops=remove_otype_loops,
            max_distance=max_distance,
        )
        self.algorithm = algorithm
        self.capture_paths = capture_paths
        self.alg_kwargs = kwargs

    def exec_uniform(self):

        logger.info(
            f"ClosestTargets: max_distance={self.max_distance}, gm={self.graph_mode}, rmotl={self.remove_otype_loops}"
        )
        logger.info(str(self.OG))

        # Get paths from each event to closest target objects
        event_target_paths = self.OG.event_target_paths(
            events=self.alloc.eids,
            cutoff=self.max_distance,
            algorithm=self.algorithm,
            capture_paths=self.capture_paths,
            **self.alg_kwargs,
        )
        self._event_target_paths = event_target_paths

        obj_groups = self.OG._object_target_paths.groupby("ocel:oid", as_index=False)
        assert (obj_groups["distance"].agg("nunique", dropna=False)["distance"] == 1).all()

        # self.OG._object_target_paths contains NaN rows for unreachable objects in the graph, but might miss on objects not even contained in the graph.
        self.object_stats = obj_groups.agg({"target_oid": "count", "distance": "first"}).rename(
            columns={"target_oid": "num_targets"}
        )
        assert not self.object_stats.empty
        num_all_targets = len(self.alloc.target_oids)
        self.object_stats["num_targets"].replace(
            [np.nan, 0], [num_all_targets, num_all_targets], inplace=True
        )
        missing_oids = set(self.ocel.objects["ocel:oid"]) - set(self.object_stats["ocel:oid"])
        if missing_oids:
            missing_oids_data = [
                {"ocel:oid": oid, "num_targets": num_all_targets, "distance": np.nan}
                for oid in missing_oids
            ]
            self.object_stats = pd.concat(
                [self.object_stats, pd.DataFrame(missing_oids_data)],
                ignore_index=True,
            )

        self.object_stats["ocel:type"] = self.object_stats["ocel:oid"].map(self.ocel.obj_otypes)
        degrees = dict(nx.degree(self.OG))
        self.object_stats["degree"] = self.object_stats["ocel:oid"].map(
            lambda oid: degrees.get(oid, None)
        )

        assert len(self.object_stats) == len(self.ocel.objects)
        # display(self.object_stats[self.object_stats["distance"].isna()])
        assert (
            self.object_stats[self.object_stats["distance"].isna()]["num_targets"]
            == num_all_targets
        ).all()

        # display(self.object_stats)

        event_target_paths.drop(columns=["ocel:oid", "ocel:type"], inplace=True, errors="ignore")
        # event_target_paths.rename(columns={"distance": "obj_dist"}, inplace=True)

        # Distributing emissions handled by UniformAllocationRule
        return event_target_paths, dict()


class ParticipatingTargetsAllocation(UniformAllocationRule):
    """Allocates emissions to target objects participating in the event."""

    def exec_uniform(self):
        # ParticipatingTargets according to simpler definition
        # Ignore activities, just allocate uniformly all events that have participating targets
        target_relations = self.alloc.ev_target_relations
        return target_relations, dict()


class AllTargetsAllocation(AllocationRule):
    """Allocates emissions to ALL targets, ignoring the OCEL structure."""

    def exec(self):
        # Allocate emissions to ALL target objects
        # Fallthrough - always applicable for all events
        # supports ignore_targets
        # (Using the UniformAllocationRule class here is very inefficient)
        targets = (
            self.alloc.target_oids
            if not self.alloc.ignore_targets
            else set(self.ocel.objects["ocel:oid"])
        )
        assert len(targets) != 0
        emission_sum = (
            self.alloc.event_emissions["ocean:event_emissions"].sum()
            + self.alloc.e2o_emissions["ocean:e2o_emissions"].sum()
        )
        eids = self.alloc.eids
        self.alloc.event_emissions = self.alloc.event_emissions.iloc[0:0]
        self.alloc.e2o_emissions = self.alloc.e2o_emissions.iloc[0:0]
        self.alloc.update()
        x = emission_sum / len(targets)

        self.assign(
            pd.DataFrame(
                {
                    "target_oid": list(targets),
                    "ocean:object_emissions": np.full((len(targets)), x),
                }
            )
        )

        num_targets = len(targets)
        self.event_stats = pd.DataFrame(
            {"ocel:eid": eid, "num_targets": num_targets} for eid in eids
        )
        self._num_events_properly_allocated = 0


class AllParticipatingObjectsAllocation(AllocationRule):
    """Allocates emissions to all objects participating in the event.
    Includes all objects, ignores the target object setting."""

    # TODO any different from AllTargetsAllocation with ignore_targets=True?

    def exec(self):
        self.warning("Ignoring target object settings!")
        e2o = (
            self.ocel.relations[self.ocel.relations["ocel:eid"].isin(self.alloc.eids)]
            .drop_duplicates(subset=["ocel:eid", "ocel:oid"])
            .copy()
        )
        num_objects = e2o.groupby("ocel:eid").size()
        e2o["objects_in_event"] = e2o["ocel:eid"].map(num_objects)  # type: ignore
        e2o = e2o.join(
            self.alloc.remaining_event_emissions.set_index("ocel:eid")["ocean:event_emissions"],
            on="ocel:eid",
            how="left",
        )
        e2o["ocean:e2o_emissions"] = e2o["ocean:event_emissions"] / e2o["objects_in_event"]
        e2o["ocean:e2o_emissions"] = e2o["ocean:e2o_emissions"].fillna(0)
        e2o["has_emission"] = e2o["ocean:e2o_emissions"] != 0
        object_groups = e2o.groupby("ocel:oid")
        object_emissions = object_groups.agg(
            {"ocel:type": "first", "ocean:e2o_emissions": "sum", "has_emission": "sum"}
        ).rename(
            columns={
                "ocean:e2o_emissions": "ocean:object_emissions",
                "has_emission": "num_emission_events",
            }
        )
        object_emissions["num_events"] = object_groups["ocel:eid"].size()
        # For accessing stats like "num_emission_events" later
        self._object_emissions = object_emissions

        # CLear all remaining emissions
        self.alloc.event_emissions = self.alloc.event_emissions.iloc[0:0]
        self.alloc.e2o_emissions = self.alloc.e2o_emissions.iloc[0:0]
        self.alloc.update()

        self.assign(object_emissions)
