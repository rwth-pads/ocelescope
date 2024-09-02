from __future__ import annotations

import gc
from enum import Enum
from functools import cached_property
from typing import TYPE_CHECKING, Iterable, Literal

import networkx as nx
import pandas as pd
import tqdm

import util.graph as graph_util
from api.logger import logger

if TYPE_CHECKING:
    from emissions.allocation import Allocator
    from ocel.ocel_wrapper import OCELWrapper


class GraphMode(Enum):
    HU_HU = ("hu", "hu")
    OBJ_OBJ = ("all", "all")

    def __str__(self, sep: str = "-"):
        d = {"all": "Obj", "hu": "HU"}
        a, b = self.value
        return f"{d[a]}{sep}{d[b]}"

    def __format__(self, format_spec="default"):
        if format_spec == "lower":
            return str(self).lower()
        if format_spec == "file":
            return self.__str__(sep="_").lower()
        if format_spec == "latex":
            return self.__str__(sep="-")
        return str(self)

    def __iter__(self):
        return iter(self.value)

    @staticmethod
    def from_string(s: str):
        if s.lower() == "hu-hu":
            return GraphMode.HU_HU
        elif s.lower() == "obj-obj":
            return GraphMode.OBJ_OBJ
        raise ValueError


class ObjectGraph(nx.Graph):

    # TODO caching?

    def __init__(
        self,
        g: pd.DataFrame | nx.Graph,
        /,
        alloc: Allocator,
        *,
        graph_mode: GraphMode,
        remove_otype_loops: bool,
        names: tuple[str | None, str | None] = (None, None),
        objects: Iterable[str] | None = None,
    ):
        self.ocel = alloc.ocel
        self.alloc = alloc
        self.graph_mode = graph_mode
        self.remove_otype_loops = remove_otype_loops

        if isinstance(g, nx.Graph):
            # nx graph already initialized
            assert names == (None, None)
            super().__init__(g)
        else:
            # Init graph from edges DataFrame
            oid1_col = "ocel:oid_1" if names[0] is None else f"{names[0]}_oid"
            oid2_col = "ocel:oid_2" if names[1] is None else f"{names[1]}_oid"
            type1_col = "ocel:type_1" if names[0] is None else f"{names[0]}_type"
            type2_col = "ocel:type_2" if names[1] is None else f"{names[1]}_type"
            assert {oid1_col, oid2_col, type1_col, type2_col}.issubset(g.columns)
            G: nx.Graph = nx.from_pandas_edgelist(
                g,
                source=oid1_col,
                target=oid2_col,
                create_using=nx.Graph,
            )

            # Add nodes without edges
            if objects is not None:
                nodes_without_edges = set(objects) - (set(g[oid1_col]) | set(g[oid2_col]))
                G.add_nodes_from(nodes_without_edges)

            super().__init__(G)

    @cached_property
    def objects(self) -> set[str]:
        return set(self.nodes())

    @staticmethod
    def discover(
        alloc: Allocator,
        graph_mode: GraphMode,
        *,
        include_o2o: bool = True,
        remove_otype_loops: bool = False,
    ):
        """Discovers object relations used for graph-based target allocation."""
        g, names = alloc.object_relations(
            *graph_mode,
            force_include_targets=True,
            include_o2o=include_o2o,
            mirror=False,
            remove_target_target_edges=True,
            remove_otype_loops=remove_otype_loops,
            class_info=False,
        )

        # Determine set of nodes
        if graph_mode == GraphMode.HU_HU:
            objects = alloc.hu_oids | alloc.target_oids
        elif graph_mode == GraphMode.OBJ_OBJ:
            objects = set(alloc.ocel.objects["ocel:oid"])
        else:
            raise ValueError

        return ObjectGraph(
            g,
            alloc,
            graph_mode=graph_mode,
            remove_otype_loops=remove_otype_loops,
            names=names,
            objects=objects,
        )

    def event_target_paths(
        self,
        events: Iterable[str] | None = None,
        cutoff: int | None = None,
        capture_paths: bool = False,
        algorithm: Literal["nx_dijkstra", "nx_bfs", "own_bfs"] = "own_bfs",
        object_target_paths: pd.DataFrame | None = None,
        progress: bool = False,
        **kwargs,
    ) -> pd.DataFrame:
        relations = self.ocel.relations[["ocel:eid", "ocel:oid"]]
        relations = relations[relations["ocel:oid"].isin(self.objects)]
        if events is not None:
            # Limit set of events and thus set of objects related to them
            relations = relations[relations["ocel:eid"].isin(events)]
            objects = set(relations["ocel:oid"])
        else:
            objects = None

        if object_target_paths is None:
            # First compute paths from all objects to targets
            if progress:
                print("Computing object-target paths ...")
            object_target_paths = self.object_target_paths(
                objects=objects,
                cutoff=cutoff,
                capture_paths=capture_paths,
                algorithm=algorithm,
                progress=progress,
                **kwargs,
            )
        self._object_target_paths = object_target_paths

        # Check if there are any paths
        if object_target_paths.empty or object_target_paths["distance"].isna().all():
            if object_target_paths.empty:
                logger.error(f"object_target_paths is empty! Returning empty event_target_paths")
            elif object_target_paths["distance"].isna().all():
                logger.error(
                    f"object_target_paths: distances are NaN only! Returning empty event_target_paths"
                )
            return pd.DataFrame([], columns=["ocel:eid", "target_oid", "distance"])

        # New: iterative merge, grouped by distance. Only merge those events that don't have a path yet.
        rem_eids = set(relations["ocel:eid"])
        rem_relations = relations

        # Retain only existing paths
        object_target_paths = object_target_paths[object_target_paths["target_oid"].notna()]
        object_target_paths.drop(
            columns=["ocel:type", "path_otypes"], errors="ignore", inplace=True
        )
        object_target_paths.set_index("ocel:oid", inplace=True, drop=True)
        d_epaths_: dict[int, pd.DataFrame] = {}
        self.alloc.info(
            f"init -- {len(object_target_paths)} paths, 0 merged. {len(rem_eids)} events, {len(relations)} relations."
        )
        ds = range(0, int(object_target_paths["distance"].max()) + 1)
        if progress:
            print("Joining E2O relations with object-target paths ...")
            ds = tqdm.tqdm(ds)
        for d in ds:
            if not rem_eids:
                break
            # Extract paths of distance d and join with E2O relations
            d_opaths = object_target_paths[object_target_paths["distance"] == d]
            if d_opaths.empty:
                continue
            d_epaths_[d] = rem_relations.join(d_opaths, on="ocel:oid", how="inner")
            d_epaths_[d].drop(columns=["ocel:oid", "ocel:type"], errors="ignore", inplace=True)

            # Remove events & E2O relations that now have a path
            rem_eids -= set(d_epaths_[d]["ocel:eid"])
            rem_relations = rem_relations[rem_relations["ocel:eid"].isin(rem_eids)]
            self.alloc.info(
                f"d={d} -- {len(d_opaths)} O-T paths, {len(d_epaths_[d])} E-T paths. {len(rem_eids)} events and {len(rem_relations)} relations remaining."
            )

        # Free memory of variables not needed any more
        del object_target_paths
        del d_opaths
        del rem_relations
        del rem_eids
        gc.collect()

        # Combine event-target paths of different lengths
        paths = pd.concat(d_epaths_.values())

        del d_epaths_
        gc.collect()

        # With new merging algorithm above, min distance grouping is not needed any more
        # Retain only one path per target object
        assert (
            paths.groupby("ocel:eid")["distance"].nunique() == 1
        ).all(), "Event-target paths: Distances per event are not unique!"
        paths.drop_duplicates(subset=["ocel:eid", "target_oid"], inplace=True)
        return paths

    def object_target_paths(
        self,
        objects: Iterable[str] | None = None,
        cutoff: int | None = None,
        capture_paths: bool = False,
        algorithm: Literal["nx_dijkstra", "nx_bfs", "own_bfs"] = "own_bfs",
        progress: bool = False,
        **kwargs,
    ) -> pd.DataFrame:
        """Computes shortest paths from all objects to any target object.
        If multiple target objects share the same minimal distance from an object, paths to all of them are returned.
        """
        if objects is None:
            objects_list = list(self.objects)
        else:
            objects_list = list(set(objects) & self.objects)
        if algorithm in {"nx_dijkstra", "nx_bfs"}:
            df = graph_util.nx_shortest_paths_to_target(
                self,
                sources=self.alloc.target_oids,
                cutoff=cutoff,
                dijkstra=(algorithm == "nx_dijkstra"),
                capture_paths=capture_paths,
                progress=progress,
                **kwargs,
            )
            # Note: 'source' in the graph algorithm context is what we use for the 'target objects' in the allocation context.
            df.rename(columns={"source": "target_oid", "target": "ocel:oid"}, inplace=True)
            if objects is not None:
                # nx algorithm can only compute paths to ALL other objects
                df = df[df["ocel:oid"].isin(objects_list)]
        elif algorithm == "own_bfs":
            df = graph_util.shortest_paths_to_target(
                self,
                sources=objects_list,
                targets=list(self.alloc.target_oids),
                cutoff=cutoff,
                nearest=True,
                capture_paths=capture_paths,
                progress=progress,
                **kwargs,
            )
            # Here the naming is the same on both ends
            df.rename(columns={"source": "ocel:oid", "target": "target_oid"}, inplace=True)
        else:
            raise ValueError

        # Add object types of starting objectID and objects along the path
        if capture_paths:
            df["ocel:type"] = df["ocel:oid"].map(self.ocel.obj_otypes)
        df = df.reindex(
            columns=(
                ["ocel:oid", "ocel:type", "target_oid", "distance", "path"]
                if capture_paths
                else ["ocel:oid", "target_oid", "distance"]
            )
        )

        if capture_paths:
            reverse_path = algorithm in {"nx_dijkstra", "nx_bfs"}
            if reverse_path:
                make_otype_list = lambda ots: ots.iloc[::-1].tolist()
            else:
                make_otype_list = list

            df["path_otypes"] = (
                df["path"]
                .explode()
                .map(self.ocel.obj_otypes)
                .reset_index()
                .groupby("index")
                .agg(make_otype_list)
            )

        df.drop(columns=["path"], inplace=True, errors="ignore")

        assert (
            df.groupby("ocel:oid")["distance"].nunique() == 1
        ).all(), "Object-target paths: Distances per object are not unique!"

        # Add rows for objects with no target path found
        objects_with_path = set(df["ocel:oid"])
        objects_without_path = set(objects_list) - objects_with_path
        df = pd.concat([df, pd.Series(list(objects_without_path), name="ocel:oid")])

        return df

    @cached_property
    def components(self):
        return list(nx.connected_components(self))

    def number_of_components(self):
        return len(self.components)

    def __str__(self):
        data = dict(
            # graph_mode=self.graph_mode,
            # remove_otype_loops=self.remove_otype_loops,
            # num_nodes=self.number_of_nodes(),
            # num_edges=self.number_of_edges(),
            # num_components=self.number_of_components(),
            N=self.number_of_nodes(),
            E=self.number_of_edges(),
            C=self.number_of_components(),
        )
        # name = "ObjectGraph"
        gm_str = "HU" if self.graph_mode == GraphMode.HU_HU else ""
        otl_str = "x" if self.remove_otype_loops else ""
        name = f"OG{gm_str}{otl_str}"
        return f"{name}({', '.join([f'{k}={v}' for k, v in data.items()])})"

    def __repr__(self):
        return str(self)


class E2OGraph(nx.Graph):

    def __init__(
        self,
        g: pd.DataFrame | nx.Graph,
        /,
        alloc: Allocator,
        graph_mode: GraphMode,
        # *,
        # names: tuple[str, str] | None = None,
    ):
        self.ocel = alloc.ocel
        self.alloc = alloc
        self.graph_mode = graph_mode

        if isinstance(g, nx.Graph):
            # nx graph already initialized
            # assert names is None
            super().__init__(g)
        else:
            # Init graph from edges DataFrame (like ocel.relations)
            # TODO O2O relations (caution, see ticket MA-215)
            assert {"ocel:oid", "ocel:eid"}.issubset(g.columns)
            G = nx.from_pandas_edgelist(
                g,
                source="ocel:eid",
                target="ocel:oid",
                create_using=nx.Graph,
            )
            super().__init__(G)

    def event_target_paths(
        self,
        events: Iterable[str] | None = None,
        cutoff: int | None = None,
        capture_paths: bool = False,
        algorithm: Literal["nx_dijkstra", "nx_bfs", "own_bfs"] = "own_bfs",
        **kwargs,
    ) -> pd.DataFrame:
        """Computes shortest paths from events to any target object.
        If multiple target objects share the same minimal distance from an event, paths to all of them are returned.
        Either pass an event set, or None to compute the distance for all events.
        cutoff is in terms of the object graph, i.e., here in the E2O graph, the actual limit will be 2 * cutoff + 1
        """
        og_cutoff = (2 * cutoff + 1) if cutoff is not None else None

        if events is None:
            # TODO use alloc.eids for remaining emissions
            events = self.ocel.events["ocel:eid"]
        events = list(events)

        if algorithm in {"nx_dijkstra", "nx_bfs"}:
            df = graph_util.nx_shortest_paths_to_target(
                self,
                sources=self.alloc.target_oids,
                cutoff=og_cutoff,
                dijkstra=(algorithm == "nx_dijkstra"),
                capture_paths=capture_paths,
                **kwargs,
            )
            # Note: 'source' in the graph algorithm context is what we use for the 'target objects' in the allocation context.
            df.rename(columns={"source": "target_oid", "target": "ocel:eid"}, inplace=True)
            # Only keep events of interest (before, this also contains objects!)
            df = df[df["ocel:eid"].isin(events)]
        elif algorithm == "own_bfs":
            df = graph_util.shortest_paths_to_target(
                self,
                sources=events,
                targets=list(self.alloc.target_oids),
                cutoff=og_cutoff,
                # order=lambda u, v, d, p: # TODO prevent revisiting otypes by sorting? Need otype attr
                nearest=True,
                capture_paths=capture_paths,
                **kwargs,
            )
            # Here the naming is the same on both ends
            df.rename(columns={"source": "ocel:eid", "target": "target_oid"}, inplace=True)
        else:
            raise ValueError

        # Events all have an odd distance to objects
        assert ((df["distance"] - 1) // 2 == (df["distance"] - 1) / 2).all()
        df["distance"] = (df["distance"] - 1) // 2

        df["ocel:activity"] = df["ocel:eid"].map(self.ocel.event_activities)
        df = df.reindex(
            columns=["ocel:eid", "ocel:activity", "target_oid", "distance"]
            + (["path"] if capture_paths else [])
        )

        if capture_paths:
            ocel_types = pd.concat([self.ocel.obj_otypes, self.ocel.event_activities])
            reverse_path = algorithm in {"nx_dijkstra", "nx_bfs"}
            if reverse_path:
                make_otype_list = lambda pts: pts.iloc[-2::-2].tolist()
            else:
                make_otype_list = lambda pts: pts.iloc[1::2].tolist()

            df["path_types"] = (
                df["path"]
                .explode()
                .map(ocel_types)
                .reset_index()
                .groupby("index")
                .agg(make_otype_list)
            )
            # df["path"].explode().map(ocel_types).reset_index().groupby("index").agg(list)

        # Add rows for events with no target path found
        df = df.merge(pd.Series(events, name="ocel:eid"), how="outer", on="ocel:eid")

        df.drop(columns=["path"], inplace=True, errors="ignore")
        return df
