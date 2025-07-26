from typing import Literal, Optional
from graphviz import Digraph
from typing import Dict
from pydantic.main import BaseModel
import json

from outputs.base import OutputBase

GraphShapes = Literal["circle", "triangle", "rectangle", "diamond", "hexagon"]

EdgeArrow = Optional[
    Literal[
        "triangle",
        "circle-triangle",
        "triangle-backcurve",
        "tee",
        "circle",
        "chevron",
        "triangle-tee",
        "triangle-cross",
        "vee",
        "square",
        "diamond",
    ]
]


class GraphNode(BaseModel):
    id: str
    label: Optional[str] = None
    shape: GraphShapes
    width: Optional[float] = None
    height: Optional[float] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    label_pos: Optional[Literal["top", "center", "bottom"]] = None


class GraphEdge(BaseModel):
    source: str
    target: str
    arrows: tuple[EdgeArrow, EdgeArrow]
    color: Optional[str] = None
    label: Optional[str] = None


class Graph(OutputBase):
    type: Literal["graph"]
    nodes: list[GraphNode]
    edges: list[GraphEdge]


def layout_graph(graph: Graph, engine: str = "dot") -> Graph:
    dot = Digraph(
        engine=engine,
    )

    dot.attr("graph", rankdir="RL", splines="true", nodesep="0.8", ranksep="0.5")

    for node in graph.nodes:
        node_kwargs = {
            "label": node.label or node.id,
            "shape": node.shape,
            "style": "filled",
            "fillcolor": node.color,
        }

        if node.width and node.height:
            node_kwargs["width"] = str(node.width / 72)
            node_kwargs["height"] = str(node.height / 72)
            node_kwargs["fixedsize"] = "true"

        dot.node(node.id, **node_kwargs)

    for edge in graph.edges:
        dot.edge(edge.source, edge.target, label=edge.label)

    dot_output = dot.pipe(format="json").decode("utf-8")
    dot_json = json.loads(dot_output)

    layout_info: Dict[str, Dict[str, float]] = {}

    for obj in dot_json.get("objects", []):
        if "pos" in obj:
            x_str, y_str = obj["pos"].split(",")
            layout_info[obj["name"]] = {
                "x": float(x_str),
                "y": float(y_str),
                "width": float(obj.get("width", 0)) * 72,
                "height": float(obj.get("height", 0)) * 72,
            }

    updated_nodes = []
    for node in graph.nodes:
        layout = layout_info.get(node.id, {})
        updated_nodes.append(
            GraphNode(
                **node.model_dump(exclude={"x", "y", "width", "height"}),
                x=layout.get("x", 0),
                y=layout.get("y", 0),
                width=layout.get("width", node.width),
                height=layout.get("height", node.height),
            )
        )

    return Graph(type=graph.type, nodes=updated_nodes, edges=graph.edges)
