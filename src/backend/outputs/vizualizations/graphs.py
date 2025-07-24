from typing import Literal, Optional
from pydantic.main import BaseModel

GraphShapes = Literal["circle", "triangle", "rectangle", "diamond", "hexagon"]

EdgeArrow = Optional[
    Literal[
        "triangle",
        "circle-triangle",
        "trinagle-backcurve",
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
    label: Optional[str]
    shape: GraphShapes
    width: float
    height: float
    color: str
    x: str
    y: str


class GraphEdge(BaseModel):
    source: str
    target: str
    arrows: tuple[EdgeArrow, EdgeArrow]
    color: str
    label: str


class Graph(BaseModel):
    type: Literal["graph"]
    nodes: list[GraphNode]
    edges: list[GraphEdge]
