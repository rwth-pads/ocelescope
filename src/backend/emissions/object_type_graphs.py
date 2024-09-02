from typing import TYPE_CHECKING, Literal, Sequence

import graphviz as gv
import numpy as np
import pandas as pd

import emissions.allocation as allocation
import emissions.allocation_graph as ag
import emissions.allocation_rules as ar
import util.graph as graph_util
import util.pandas as pd_util

# if TYPE_CHECKING:
from ocel.ocel_wrapper import OCELWrapper
from visualization.constants import *

HU_STYLE = dict(fillcolor=HU_COLOR, fontcolor="white", style="filled", shape="rect")
RESOURCE_STYLE = dict(fillcolor=RESOURCE_COLOR, fontcolor="white", style="filled", shape="rect")
TARGET_STYLE = dict(peripheries="2")


def init_otg_gv_nodes(
    alloc: allocation.Allocator,
    *,
    node_order: Sequence[str] | None = None,
    graph_mode: ag.GraphMode,
    directed: bool = False,
    show_excluded_otypes: bool = False,
    rankdir: Literal["TB", "LR"] = "LR",
):
    node_order = node_order or alloc.otype_order
    ot_style = {
        ot: {
            **(HU_STYLE if ot in alloc.hu_otypes else RESOURCE_STYLE),
            **(TARGET_STYLE if ot in alloc.target_otypes else {}),
        }
        for ot in node_order
    }

    GV = gv.Digraph() if directed else gv.Graph()
    GV.node_attr["fontsize"] = "12"
    GV.edge_attr["fontsize"] = "10"
    GV.graph_attr["rankdir"] = rankdir
    for ot in node_order or alloc.otype_order:
        if not show_excluded_otypes and (ot in alloc.resource_otypes and not "all" in graph_mode):
            continue
        GV.node(ot, **ot_style[ot])
    return GV


def otg(
    ocel: OCELWrapper,
    alloc: allocation.Allocator,
    og: pd.DataFrame | None = None,
    *,
    node_order: Sequence[str] | None = None,
    graph_mode: ag.GraphMode | None = None,
    remove_otype_loops: bool | None = None,
    show_excluded_otypes: bool = True,
):
    if isinstance(alloc.rule, ar.ClosestTargetsAllocation):
        if not graph_mode:
            graph_mode = alloc.rule.OG.graph_mode
        if remove_otype_loops is None:
            remove_otype_loops = alloc.rule.OG.remove_otype_loops

    assert graph_mode
    if og is None:
        assert remove_otype_loops is not None
        og, _ = alloc.object_relations(
            *graph_mode,
            remove_otype_loops=remove_otype_loops,
            mirror=True,
        )
    otg_edges = (
        og.groupby(["ocel:type_1", "ocel:type_2"], as_index=False)
        .size()
        .rename(columns={"size": "freq"})
    )  # type: ignore
    assert (
        len(set(list(graph_mode))) == 1
    ), f"TODO the following filter doesn't work for {graph_mode}"
    otg_edges = otg_edges[otg_edges["ocel:type_1"] <= otg_edges["ocel:type_2"]]

    OTG = init_otg_gv_nodes(
        alloc,
        node_order=node_order,
        graph_mode=graph_mode,
        directed=False,
        show_excluded_otypes=show_excluded_otypes,
    )
    OTG = graph_util.df_to_gv(
        otg_edges,
        G=OTG,
        src="ocel:type_2",
        trg="ocel:type_1",
        directed=False,
        stroke="freq",
        log_stroke=True,
        label="freq",
    )
    return OTG


def otfg(
    ocel: OCELWrapper,
    alloc: allocation.Allocator,
    og: pd.DataFrame | None = None,
    *,
    node_order: Sequence[str] | None = None,
    graph_mode: ag.GraphMode | None = None,
    remove_otype_loops: bool | None = None,
    show_excluded_otypes: bool = True,
):
    if isinstance(alloc.rule, ar.ClosestTargetsAllocation):
        if not graph_mode:
            graph_mode = alloc.rule.OG.graph_mode
        if remove_otype_loops is None:
            remove_otype_loops = alloc.rule.OG.remove_otype_loops
    assert graph_mode
    if og is None:
        assert remove_otype_loops is not None
        og, _ = alloc.object_relations(
            *graph_mode,
            remove_otype_loops=remove_otype_loops,
            mirror=True,
        )
    otfg = (
        og.groupby(["ocel:oid_1", "ocel:type_2"], as_index=False)
        .agg({"ocel:type_1": "first", "ocel:oid_2": "count"})
        .rename(columns={"ocel:oid_2": "num_objs_otype2"})
        .groupby(["ocel:type_1", "ocel:type_2"])
        .agg(
            {
                "num_objs_otype2": lambda g: pd_util.mmmmstr(g, latex=False),
                "ocel:oid_1": "nunique",
            }
        )
        .rename(columns={"ocel:oid_1": "nunique_obj_type1"})
        .reset_index()
    )
    otfg["rel_num_obj_type1"] = otfg["nunique_obj_type1"] / otfg["ocel:type_1"].map(
        ocel.otype_counts
    )
    otfg["every_obj_type1"] = otfg["rel_num_obj_type1"] == 1
    otfg["label"] = otfg.apply(
        lambda row: row["num_objs_otype2"]
        + (f' ({row["rel_num_obj_type1"]:.1%})' if not row["every_obj_type1"] else ""),
        axis=1,
    )
    otfg["style"] = np.where(otfg["every_obj_type1"], "", "dashed")
    # OTFG = nx.from_pandas_edgelist(
    #     otfg,
    #     source="ocel:type_1",
    #     target="ocel:type_2",
    #     create_using=nx.DiGraph,
    #     edge_attr=["num_objs_otype2", "style"],
    # )
    # OTFG_GV = graph_util.nx_to_graphviz(OTFG, G=OTFG_GV, edge_label="num_objs_otype2", edge_attr=["style"])
    OTFG = init_otg_gv_nodes(
        alloc,
        node_order=node_order,
        graph_mode=graph_mode,
        directed=True,
        show_excluded_otypes=show_excluded_otypes,
    )
    OTFG = graph_util.df_to_gv(
        otfg,
        G=OTFG,
        src="ocel:type_1",
        trg="ocel:type_2",
        directed=True,
        # stroke="freq",
        # log_stroke=True,
        label="label",
        edge_attr=["style"],
    )
    OTFG.graph_attr["rankdir"] = "LR"
    return OTFG
