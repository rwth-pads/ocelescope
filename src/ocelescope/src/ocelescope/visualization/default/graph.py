from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, Field

from ocelescope.util.pydantic import uuid_str
from ocelescope.visualization.default.dot import GraphvizLayoutEngineName
from ocelescope.visualization.visualization import Visualization

T = TypeVar("T", bound=Visualization)


class AnnotatedElement(BaseModel, Generic[T]):
    annotation: T | None = None


GraphShapes = Literal["circle", "triangle", "rectangle", "diamond", "hexagon"]


EdgeArrow = (
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
    | None
)


class GraphNode(AnnotatedElement):
    """Represents a node (vertex) in a graph visualization.

    Each node can be styled with color, size, shape, and label attributes,
    and may optionally include annotation metadata for richer visualization.

    Attributes:
        id (str): Unique identifier for the node (auto-generated UUID by default).
        label (str | None): Optional display label for the node.
        shape (GraphShapes): Visual shape of the node.
        width (float | None): Node width in layout units.
        height (float | None): Node height in layout units.
        color (str | None): Fill color of the node (e.g., hex or CSS color).
        x (float | None): X-coordinate for fixed layouts.
        y (float | None): Y-coordinate for fixed layouts.
        border_color (str | None): Color of the node border.
        label_pos (Literal["top", "center", "bottom"]): Label placement relative to node shape.
        rank (Literal["source", "sink"] | int | None): Layout ranking hint for hierarchical graphs.
        layout_attrs (dict[str, str | int | float | bool] | None): Additional layout or rendering attributes.
    """

    id: str = Field(default_factory=uuid_str)
    label: str | None = None
    shape: GraphShapes
    width: float | None = None
    height: float | None = None
    color: str | None = None
    x: float | None = None
    y: float | None = None
    border_color: str | None = None
    label_pos: Literal["top", "center", "bottom"] = "center"

    rank: Literal["source", "sink"] | int | None = None
    layout_attrs: dict[str, str | int | float | bool] | None = None


class GraphEdge(AnnotatedElement):
    """Represents a directed or undirected connection between two nodes.

    Edges define relationships between graph nodes and can be styled with
    colors, labels, and arrowheads. Each edge may also include optional
    annotation data for custom rendering.

    Attributes:
        id (str): Unique identifier for the edge (auto-generated UUID by default).
        source (str): ID of the source node.
        target (str): ID of the target node.
        color (str | None): Line color for the edge.
        label (str | None): Optional label displayed along the edge.
        start_arrow (EdgeArrow | None): Arrowhead type at the source end.
        end_arrow (EdgeArrow | None): Arrowhead type at the target end.
        start_label (str | None): Optional text label near the source end.
        end_label (str | None): Optional text label near the target end.
        layout_attrs (dict[str, str | int | float | bool] | None): Additional layout or rendering attributes.
    """

    id: str = Field(default_factory=uuid_str)
    source: str
    target: str
    color: str | None = None
    label: str | None = None
    start_arrow: EdgeArrow = None
    end_arrow: EdgeArrow = None
    start_label: str | None = None
    end_label: str | None = None

    layout_attrs: dict[str, str | int | float | bool] | None = None


class GraphvizLayoutConfig(BaseModel):
    """Configuration for Graphviz layout engine and global styling attributes.

    Defines which Graphviz layout engine to use and allows setting global
    graph, node, and edge attributes.

    Attributes:
        engine (GraphvizLayoutEngineName): Name of the Graphviz layout engine (e.g., "dot", "neato").
        graphAttrs (dict[str, str | int | float | bool] | None): Global graph-level Graphviz attributes.
        nodeAttrs (dict[str, str | int | float | bool] | None): Default node-level Graphviz attributes.
        edgeAttrs (dict[str, str | int | float | bool] | None): Default edge-level Graphviz attributes.
    """

    engine: GraphvizLayoutEngineName = "dot"
    graphAttrs: dict[str, str | int | float | bool] | None = None
    nodeAttrs: dict[str, str | int | float | bool] | None = None
    edgeAttrs: dict[str, str | int | float | bool] | None = None


class Graph(Visualization):
    """Represents a complete graph visualization resource.

    Combines nodes, edges, and layout configuration into a unified
    graph structure that can be rendered using Graphviz or similar
    visualization backends.

    Attributes:
        type (Literal["graph"]): Visualization type identifier ("graph").
        nodes (list[GraphNode]): List of nodes contained in the graph.
        edges (list[GraphEdge]): List of edges connecting the nodes.
        layout_config (GraphvizLayoutConfig): Layout engine and styling configuration.
    """

    type: Literal["graph"] = "graph"
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    layout_config: GraphvizLayoutConfig = GraphvizLayoutConfig()
