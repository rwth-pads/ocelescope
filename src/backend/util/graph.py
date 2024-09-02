import itertools
from collections import deque
from typing import Callable, Iterable, Literal, overload

import graphviz as gv
import networkx as nx
import numpy as np
import pandas as pd
import tqdm

from api.logger import logger


def shortest_paths_to_target(
    G: nx.Graph | nx.DiGraph,
    /,
    sources: Iterable[str],
    targets: Iterable[str],
    cutoff: int | None = None,
    *,
    capture_paths: bool = False,
    nearest: bool = False,
    progress: bool = False,
) -> pd.DataFrame:
    """On an unweighted graph, computes shortest paths by breadth-first search between sets of source and target nodes.
    Results are given as DataFrame listing pairs of nodes and their distance, optionally including the path.
    Distance can be optionally limited.
    Set nearest=True to only find the nearest target(s) per source.
    """

    targets = set(targets)
    source_targets = [u for u in sources if u in targets]

    if not nearest:
        raise NotImplementedError
    if capture_paths:
        data = [(u, u, 0, [u]) for u in source_targets]
    else:
        data = [(u, u, 0) for u in source_targets]

    # Perform BFS for each source node up to depth max_distance
    it = enumerate(sources)
    if progress:
        it = tqdm.tqdm(it, total=len(sources))  # type: ignore
    for i, source in it:
        # If source is a target, skip (has already been added)
        if source in targets:
            continue

        # Perform BFS up to depth k
        visited = set()
        queue: deque[tuple[str, int, list[str] | None]] = deque(
            [(source, 0, [source] if capture_paths else None)]
        )
        nearest_targets_dist = None
        while queue:
            u, d, p = queue.popleft()
            if cutoff is not None and d > cutoff:
                break
            if nearest and nearest_targets_dist is not None and d > nearest_targets_dist:
                break
            if u in targets:
                data.append((source, u, d, p) if capture_paths else (source, u, d))  # type: ignore
                if nearest and nearest_targets_dist is None:
                    nearest_targets_dist = d
                    continue
            if cutoff is not None and d >= cutoff:
                continue  # max distance reached
            if nearest and nearest_targets_dist is not None and d >= nearest_targets_dist:
                continue  # don't add neighbors, but finish queue to find targets at same distance

            for v in G.neighbors(u):
                if v not in visited:
                    visited.add(v)
                    queue.append((v, d + 1, p + [v] if p else None))
    if capture_paths:
        return pd.DataFrame(
            data,
            columns=["source", "target", "distance", "path"],
        )
    else:
        return pd.DataFrame(
            data,
            columns=["source", "target", "distance"],
        )


def nx_shortest_paths_to_target(
    G: nx.Graph,
    sources: set[str],
    cutoff: int | None = None,
    dijkstra: bool = False,
    capture_paths: bool = True,
    progress: bool = False,
):
    """Returns a list of shortest paths from any source node to every node in an unweighted graph.
    When multiple sources all have a minimal-distance path to some target, all of those sources and paths are included.

    Note: due to the way the nx method is named, *sources* is here what in the OCEAn context is called *target objects*.
    """
    data = []
    it = enumerate(sources)
    if progress:
        it = tqdm.tqdm(it, total=len(sources))
    for i, s in it:
        if capture_paths:
            if dijkstra:
                _, paths = nx.single_source_dijkstra(G, s, cutoff=cutoff)
            else:
                paths = nx.single_source_shortest_path(G, s, cutoff=cutoff)
            data += [
                dict(
                    source=s,
                    target=t,
                    distance=len(path) - 1,
                    path=path,
                )
                for t, path in paths.items()
            ]
        else:
            if dijkstra:
                dists = nx.single_source_dijkstra_path_length(G, s, cutoff=cutoff)
            else:
                dists = nx.single_source_shortest_path_length(G, s, cutoff=cutoff)
            data += [
                dict(
                    source=s,
                    target=t,
                    distance=dist,
                )
                for t, dist in dists.items()
            ]

    paths = pd.DataFrame(data)
    # Keep only paths from those sources that have minimal distance to the target
    target_min_dists = paths.groupby("target")["distance"].min()
    path_target_min_dists = paths["target"].map(target_min_dists)
    paths = paths[paths["distance"] == path_target_min_dists]
    return paths


@overload
def reachability_multi_source(
    G: nx.Graph | nx.DiGraph,
    /,
    sources: list[str],
    targets: list[str],
    max_distance: int | None = None,
    *,
    format: Literal["dataframe"],
    distances: bool = False,
    callback: Callable[[str, dict[str, int | bool]], bool | None] | None = None,
) -> tuple[pd.DataFrame, bool]: ...


@overload
def reachability_multi_source(
    G: nx.Graph | nx.DiGraph,
    /,
    sources: list[str],
    targets: list[str],
    max_distance: int | None = None,
    *,
    format: Literal["matrix"],
    distances: bool = False,
    callback: Callable[[str, dict[str, int | bool]], bool | None] | None = None,
) -> tuple[np.ndarray, bool]: ...


def reachability_multi_source(
    G: nx.Graph | nx.DiGraph,
    /,
    sources: list[str],
    targets: list[str],
    max_distance: int | None = None,
    *,
    format: Literal["matrix", "dataframe"],
    distances: bool = False,
    nearest: bool = False,
    callback: Callable[[str, dict[str, int | bool]], bool | None] | None = None,
):
    """Computes reachability by breadth-first search between sets of source and target nodes.
    Results are either given in a matrix form or a dataframe listing pairs of reachable nodes, optionally including their distance.
    Distance can be optionally limited.
    Set nearest=True to only find the nearest target(s) per source.
    A callback can be given to cause custom early stopping (as soon as the callback returns False for a given source node and distance dict of reachable target nodes)
    """
    # Validate parameters
    if nearest and not distances:
        raise ValueError

    # Create a mapping of nodes to their indices for easy lookup
    source_indices = {source: idx for idx, source in enumerate(sources)}
    target_indices = {target: idx for idx, target in enumerate(targets)}
    skip_bfs = False
    # Initialize the result matrix with -1
    if format == "matrix":
        if distances:
            results = np.full((len(sources), len(targets)), -1, dtype=int)
        else:
            results = np.zeros((len(sources), len(targets)), dtype=bool)
    elif format == "dataframe":
        data = []
    else:
        raise ValueError

    early_stopping = False

    if max_distance is None and not distances:
        # Faster computation via connected components
        if not nx.is_directed(G):
            if callback:
                logger.warning(f"reachability_multi_source: Callback not applicable")
            for C in nx.connected_components(G):
                if format == "matrix":
                    # TODO untested
                    comp_source_ix = {source_indices[v] for v in C if v in source_indices}
                    comp_target_ix = {target_indices[v] for v in C if v in target_indices}
                    results[list(itertools.product(comp_source_ix, comp_target_ix))] = True
                else:
                    # TODO untested
                    comp_sources = [v for v in C if v in source_indices]
                    comp_targets = [v for v in C if v in target_indices]
                    data += list(itertools.product(comp_sources, comp_targets))  # type: ignore
            skip_bfs = True
        else:
            # TODO weak components NOT applicable. Could pre-compute strong components and use quotient graph
            logger.warning(
                f"reachability_multi_source: Faster solution for unbound reachability in directed graph?"
            )

    if not skip_bfs:
        # Perform BFS for each source node up to depth max_distance
        for i, source in enumerate(sources):
            # Perform BFS up to depth k
            visited = set()
            queue: deque[tuple[str, int]] = deque([(source, 0)])
            source_reachable = {}
            dmax = 0  # only for testing
            while queue:
                u, d = queue.popleft()
                assert d >= dmax  # TODO remove?
                dmax = max(dmax, d)
                # TODO all following break statements only work if the above asserted monotonity of d holds
                if max_distance is not None and d > max_distance:
                    break
                    # continue
                if u in target_indices:
                    j = target_indices[u]
                    if format == "matrix":
                        results[i][j] = d if distances else True
                    elif format == "dataframe":
                        data.append((source, u, d) if distances else (source, u))
                    source_reachable[u] = d if distances else True
                if max_distance is not None and d >= max_distance:
                    break  # max distance reached
                if nearest and source_reachable and d > max(source_reachable.values()):
                    continue  # don't add neighbors, but finish queue to find targets at same distance
                for v in G.neighbors(u):
                    if v not in visited:
                        visited.add(v)
                        queue.append((v, d + 1))
            if callback:
                # Callback allows early stopping of the complete search when some user-defined condition is not fulfilled.
                res = callback(source, source_reachable)
                if res is False:
                    logger.info(
                        f"reachability_multi_source: Early stopping at source node '{source}'"
                    )
                    early_stopping = True
                    break
    if format == "matrix":
        return results, early_stopping
    elif format == "dataframe":
        return (
            pd.DataFrame(
                data,
                columns=["source", "target", "distance"] if distances else ["source", "target"],
            ),
            early_stopping,
        )


def multi_source_ego_graph(G, sources: Iterable[str], distance: int):
    """Returns a subgraph centered around a set of source nodes, induced by all nodes within the specified distance from one of the sources."""
    lengths, _ = nx.multi_source_dijkstra(G, sources, cutoff=distance)
    nodes = lengths.keys()
    return G.subgraph(nodes).copy()


def nx_to_graphviz(
    G: nx.DiGraph | nx.Graph,
    node_label: str = "label",
    node_id_label: bool = True,
    edge_label: str = "label",
    edge_attr: list[str] = [],
    node_attr_values: dict[str, dict[str, str]] = {},
    edge_attr_values: dict[tuple[str, str], dict[str, str]] = {},
) -> gv.Digraph | gv.Graph:
    if isinstance(G, nx.DiGraph):
        GV = gv.Digraph()
    elif isinstance(G, nx.Graph):
        GV = gv.Graph()
    else:
        raise TypeError(f"nx_to_graphviz received an input other than nx.Graph or nx.DiGraph.")

    for v, node in G.nodes.items():
        GV.node(
            str(v),
            label=node.get(node_label, str(v) if node_id_label else ""),
            **node_attr_values.get(v, {}),
        )
    for (u, v), edge in G.edges.items():
        GV.edge(
            str(u),
            str(v),
            label=str(edge.get(edge_label, "")),
            **{k: edge.get(k, "") for k in edge_attr if k != edge_label},
            **edge_attr_values.get((u, v), {}),
        )

    return GV


def df_to_gv(
    df: pd.DataFrame,
    /,
    src: str,
    trg: str,
    *,
    nodes: Iterable[str] | None = None,
    directed: bool = True,
    stroke: float | str | None = None,
    minstroke: float = 1,
    maxstroke: float = 4,
    log_stroke: bool = False,
    label: str | Callable[[pd.Series], str] | None = None,
    edge_attr: list[str] = [],
    G: gv.Graph | gv.Digraph | None = None,
) -> gv.Graph | gv.Digraph:
    assert src in df.columns and trg in df.columns

    nodes = set(nodes or set()) | set(df[src]) | set(df[trg])
    num_nodes, num_edges = len(nodes), len(df)

    if num_nodes > 200 or num_edges > 1000:
        logger.warning(
            f"df_to_gv: Graph has large dimensions ({num_nodes} nodes, {num_edges} edges)"
        )

    if G is None:
        G = gv.Digraph() if directed else gv.Graph()

    # Escape node names and add nodes
    node_ids = {node: escape_graphviz_node(node) for node in nodes}
    for node in nodes:
        G.node(node_ids[node])

    getpenwidth = None
    if isinstance(stroke, str):
        assert stroke in df.columns
        wmin, wmax = minstroke, maxstroke
        fmin, fmax = df[stroke].min(), df[stroke].max()
        if log_stroke:
            fmin, fmax = np.log(fmin), np.log(fmax)
        getpenwidth = lambda row: (
            ((np.log(row[stroke]) if log_stroke else row[stroke]) - fmin)
            / (fmax - fmin)
            * (wmax - wmin)
            + wmin
            if fmax > fmin
            else wmin
        )
    elif stroke is not None:
        # int | float
        stroke = str(stroke)
        getpenwidth = lambda row: stroke

    labeler = None
    if isinstance(label, str):
        assert label in df.columns
        labeler = lambda row: str(row[label])
    elif label is not None:
        # Callable
        labeler = label

    for _, row in df.iterrows():
        elabel = None if labeler is None else labeler(row)
        penwidth = None if getpenwidth is None else str(getpenwidth(row))
        more_attrs = {k: row.get(k, "") for k in edge_attr}
        G.edge(
            node_ids[row[src]],
            node_ids[row[trg]],
            label=elabel,
            penwidth=penwidth,
            **more_attrs,
        )

    return G


def escape_graphviz_node(x: str):
    """Escapes a string to be used as graphviz node ID. Replaces colons by underscores."""
    return x.replace(":", "_")
