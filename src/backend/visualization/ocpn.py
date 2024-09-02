from __future__ import annotations

import random
import uuid
from enum import Enum
from typing import Any

from graphviz import Digraph
from pm4py.visualization.ocel.ocpn.variants.wo_decoration import (
    PetriNet,
    constants,
    exec_utils,
)
from pydantic import Field

from api.model.base import ApiBaseModel


class OcpnStructure(ApiBaseModel):
    activity_transitions: dict[str, str]
    source_places: dict[str, str]
    target_places: dict[str, str]
    silent_transitions: dict[str, list[str]]
    places: dict[str, list[str]]
    arcs: list[Arc]


class Arc(ApiBaseModel):
    source: str
    target: str
    double: bool


class OCPN(ApiBaseModel):
    object_types: set[str]
    dot_string: str | None
    graphviz_obj: Digraph | None = Field(exclude=True, default=None)
    structure: OcpnStructure


def random_color():
    r = lambda: random.randint(0, 255)
    return "#%02X%02X%02X" % (r(), r(), r())


class Style:
    SOURCE_PLACE = lambda color: dict(
        shape="ellipse",
        style="filled",
        fontcolor="white",
        color=color,
    )
    TARGET_PLACE = lambda color: dict(
        shape="underline",
        color=color,
        fontcolor=color,
    )
    PLACE = lambda color: dict(
        label=" ",
        shape="circle",
        fixedsize="true",
        width=".4",
        height=".4",
        style="filled",
        color=color,
    )
    ARC = lambda color, double: dict(
        color=color if not double else f"{color}:{color}",
    )
    PLACE_ELLIPSIS = lambda color: dict(
        label="...",
        shape="plaintext",
        fixedsize="true",
        width=".4",
        height=".4",
        # style="filled",
        fontcolor=color,
    )
    SILENT_TRANSITION = lambda color: dict(
        # label=" ",
        label="",
        margin="0,0",
        shape="square",
        fixedsize="true",
        width=".2",
        height=".2",
        style="filled",
        color="black",
        # fillcolor="white",
        fillcolor="black",
    )
    ACTIVITY_TRANSITION = lambda color: dict(
        shape="box",
        color=color,
    )

    def __init__(self, ot_colors: dict[str, str]):
        self.ot_colors = ot_colors

    def source_place(self, ot: str):
        return Style.SOURCE_PLACE(color=self.ot_colors[ot])

    def target_place(self, ot: str):
        return Style.TARGET_PLACE(color=self.ot_colors[ot])

    def place(self, ot: str):
        return Style.PLACE(color=self.ot_colors[ot])

    def silent_transition(self, ot: str):
        return Style.SILENT_TRANSITION(color=self.ot_colors[ot])

    def activity_transition(self, ot: str | None = None):
        return Style.ACTIVITY_TRANSITION(color=self.ot_colors[ot] if ot else "black")

    def arc(self, ot: str, double: bool = False):
        return Style.ARC(color=self.ot_colors[ot], double=double)


class Parameters(Enum):
    FORMAT = "format"
    BGCOLOR = "bgcolor"
    RANKDIR = "rankdir"
    UUIDS = "uuids"


# TODO Separate this function (One for getting a gv.Digraph, one for building the OCPN Model to pass via API)
def visualize(
    ocpn: dict[str, Any],
    parameters: dict[Any, Any] | None = None,
    graphviz: bool = False,
    ot_colors: dict[str, str] | None = None,
    ot_order: list[str] | None = None,
    hide_outgoing_arcs: tuple[str, str] | None = None,
    hide_ingoing_arcs: tuple[str, str] | None = None,
    double_arcs: bool = True,
) -> OCPN:
    """
    Parts of this function were copied from pm4py (https://github.com/pm4py/pm4py-core)

    Obtains a visualization of the provided object-centric Petri net (without decoration).
    Reference paper: van der Aalst, Wil MP, and Alessandro Berti. "Discovering object-centric Petri nets." Fundamenta informaticae 175.1-4 (2020): 1-40.

    Parameters
    ----------------
    ocpn
        Object-centric Petri net
    parameters
        Variant-specific parameters:
        - Parameters.FORMAT => the format of the visualization ("png", "svg", ...)
        - Parameters.BGCOLOR => the background color
        - Parameters.RANKDIR => the rank direction (LR = left-right, TB = top-bottom)
        - Parameters.UUIDS => use uuid4 for place/transition ids, instead of numbers

    Returns
    ---------------
    ocpn
        OCPN object
    """
    if parameters is None:
        parameters = {}

    if hide_ingoing_arcs or hide_outgoing_arcs:
        raise NotImplementedError

    image_format = exec_utils.get_param_value(Parameters.FORMAT, parameters, "png")
    bgcolor = exec_utils.get_param_value(Parameters.BGCOLOR, parameters, constants.DEFAULT_BGCOLOR)
    rankdir = exec_utils.get_param_value(Parameters.RANKDIR, parameters, "LR")
    uuids = exec_utils.get_param_value(Parameters.UUIDS, parameters, False)

    if graphviz:
        # filename = tempfile.NamedTemporaryFile(suffix='.gv')
        # G = Digraph("ocpn", filename=filename.name, engine='dot', graph_attr={'bgcolor': bgcolor})
        G = Digraph("ocpn", engine="dot", graph_attr={"bgcolor": bgcolor})
        G.attr("node", shape="ellipse", fixedsize="false")
        if ot_colors is None:
            ot_colors = {ot: random_color() for ot in ocpn["object_types"]}  # type: ignore
    else:
        G = None
    if ot_colors is None:
        ot_colors = {}

    style = Style(ot_colors=ot_colors)

    if ot_order is None:
        ot_order = ocpn["object_types"]
    else:
        ot_order = [ot for ot in ot_order if ot in ocpn["object_types"]]
    assert ot_order

    activity_transitions = {}
    ot_source_places = {}
    ot_target_places = {}
    ot_places = {}
    ot_silent_transitions = {}

    transitions = {}
    places = {}
    arcs: list[Arc] = []
    place_ot = {}

    # node_attr_keys = ["fillcolor", "fontcolor", "color"]
    # edge_attr_keys = ["color", "penwidth"]
    node_attr_keys = []
    edge_attr_keys = []

    # DEPR Set graphviz attribute values to placeholders to be replaced in frontend
    node_attrs = lambda node: {key: f"{key}[{node}]" for key in node_attr_keys}
    edge_attrs = lambda source, target: {
        key: f"{key}[arc({source},{target})]" for key in edge_attr_keys
    }

    for act in ocpn["activities"]:
        activity_transitions[act] = str(uuid.uuid4()) if uuids else f"t_{act}"
        if G:
            G.node(
                activity_transitions[act],
                label=act,
                **style.activity_transition(),
                **node_attrs(activity_transitions[act]),
            )
            # G.node(activity_transitions[act])

    for ot in ot_order:
        ot_source_places[ot] = str(uuid.uuid4()) if uuids else f"p_src_{ot}"
        ot_target_places[ot] = str(uuid.uuid4()) if uuids else f"p_trg_{ot}"
        place_ot[ot_source_places[ot]] = ot
        place_ot[ot_target_places[ot]] = ot
        if G:
            G.node(
                ot_source_places[ot],
                **style.source_place(ot),
                label=ot,
                **node_attrs(ot_source_places[ot]),
            )
            G.node(
                ot_target_places[ot],
                **style.target_place(ot),
                label=ot,
                **node_attrs(ot_target_places[ot]),
            )
            # G.node(source_places[ot])
            # G.node(target_places[ot])

    i_place, i_trans = 0, 0
    for ot in ot_order:
        net, im, fm = ocpn["petri_nets"][ot]
        ot_places[ot] = []
        ot_silent_transitions[ot] = []

        for place in net.places:
            if place in im:
                # Source place - already created
                places[place] = ot_source_places[ot]
            elif place in fm:
                # Target place - already created
                places[place] = ot_target_places[ot]
            else:
                # Create normal place
                i_place += 1
                places[place] = str(uuid.uuid4()) if uuids else f"p_{i_place}_{ot}"
                place_ot[places[place]] = ot
                ot_places[ot].append(places[place])
                if G:
                    G.node(
                        places[place],
                        **style.place(ot),
                        **node_attrs(places[place]),
                    )
                    # G.node(places[place])

        for trans in net.transitions:
            if trans.label is not None:
                # Activity transition - already created
                transitions[trans] = activity_transitions[trans.label]
            else:
                # Create silent transition
                i_trans += 1
                transitions[trans] = str(uuid.uuid4()) if uuids else f"t_{i_trans}_{ot}"
                ot_silent_transitions[ot].append(transitions[trans])
                if G:
                    G.node(
                        transitions[trans],
                        **style.silent_transition(ot),
                        **node_attrs(transitions[trans]),
                    )
                    # G.node(transitions[trans])

        for arc in net.arcs:
            if type(arc.source) is PetriNet.Place:
                # Place -> Transition
                src, trg = arc.source, arc.target
                src_id, trg_id = places[src], transitions[trg]
                ot, act = place_ot[src_id], trg.label
            elif type(arc.source) is PetriNet.Transition:
                # Transition -> Place
                src, trg = arc.source, arc.target
                src_id, trg_id = transitions[src], places[trg]
                act, ot = src.label, place_ot[trg_id]
            else:
                raise TypeError
            is_double = double_arcs and ocpn["double_arcs_on_activity"][ot].get(act, False)
            arcs.append(Arc(source=src_id, target=trg_id, double=is_double))
            # print(ot, act, is_double)
            if G:
                # if hide_outgoing_arcs == (ot, arc.source.name):
                #     ellipsis_node = (
                #         str(uuid.uuid4())
                #         if uuids
                #         else f"p_ell_{ot}_{places[arc.source]}_{transitions[arc.target]}"
                #     )
                #     source_place_node = ellipsis_node
                #     G.node(ellipsis_node, **place_ellipsis_attrs(ot))
                # else:
                G.edge(
                    src_id,
                    trg_id,
                    label=None,
                    **style.arc(ot, is_double),
                    **edge_attrs(src_id, trg_id),
                )

        # if G and hide_outgoing_arcs and hide_outgoing_arcs[0] == ot:
        #     if is_double:
        #         raise NotImplementedError
        #     place_node = places[[p for p in places if p.name == hide_outgoing_arcs[1]][0]]
        #     ellipsis_node = str(uuid.uuid4()) if uuids else f"p_ell_{ot}_{place_node}_XXX"
        #     G.node(ellipsis_node, **place_ellipsis_attrs(ot))
        #     G.edge(place_node, ellipsis_node, **arc_attrs(ot, is_double))
        # if G and hide_ingoing_arcs and hide_ingoing_arcs[0] == ot:
        #     if is_double:
        #         raise NotImplementedError
        #     place_node = places[[p for p in places if p.name == hide_ingoing_arcs[1]][0]]
        #     ellipsis_node = str(uuid.uuid4()) if uuids else f"p_ell_{ot}_XXX_{place_node}"
        #     G.node(ellipsis_node, **place_ellipsis_attrs(ot))
        #     G.edge(ellipsis_node, place_node, **arc_attrs(ot, is_double))

    if G:
        G.attr(rankdir=rankdir)
        G.format = image_format

    return OCPN(
        object_types=set(ocpn["object_types"]),
        dot_string=str(G) if G else None,
        graphviz_obj=G,
        structure=OcpnStructure(
            activity_transitions=activity_transitions,
            source_places=ot_source_places,
            target_places=ot_target_places,
            places=ot_places,
            silent_transitions=ot_silent_transitions,
            # transitions=transitions,
            arcs=arcs,
        ),
    )
