from pydantic import BaseModel

from ocelescope.resource.resource import Resource
from ocelescope.visualization import generate_color_map
from ocelescope.visualization.default.graph import Graph, GraphEdge, GraphNode, GraphvizLayoutConfig


class Edge(BaseModel):
    """Represents a directed connection between two activities in a Directly Follows Graph.

    Each edge links a source activity to a target activity, annotated with
    the object type that connects them.

    Attributes:
        source (str): The identifier or label of the source activity.
        target (str): The identifier or label of the target activity.
        object_type (str): The object type mediating the directly-follows relation.
    """

    source: str
    target: str
    object_type: str


class ObjectActivityEdge(BaseModel):
    """Represents a connection between an object type and an activity node.

    Used to describe start and end relations between object types and
    their corresponding activities in a Directly Follows Graph.

    Attributes:
        object_type (str): The type of object participating in the relation.
        activity (str): The name of the activity associated with this object type.
    """

    object_type: str
    activity: str


class DirectlyFollowsGraph(Resource):
    """Resource representation of an Object-Centric Directly Follows Graph (DFG).

    This graph visualizes how activities directly follow one another in an OCEL,
    differentiated by object types. It also includes start and end nodes for each
    object type to indicate where execution begins and ends.

    Attributes:
        label (str): Display label for the resource.
        description (str): Short textual description of the resource.
        object_types (list[str]): List of object types included in the graph.
        activities (list[str]): List of activity names (nodes) in the graph.
        edges (list[Edge]): Directed edges between activities by object type.
        start_activities (list[ObjectActivityEdge]): Mappings from object types to start activities.
        end_activities (list[ObjectActivityEdge]): Mappings from object types to end activities.
    """

    label = "Directly Follows Graph"
    description = "A object-centric directly follows graph"

    object_types: list[str]
    activities: list[str]
    edges: list[Edge]
    start_activities: list[ObjectActivityEdge]
    end_activities: list[ObjectActivityEdge]

    def visualize(self):
        color_map = generate_color_map(self.object_types)

        activity_nodes = [
            GraphNode(id=activity, label=activity, shape="rectangle")
            for activity in self.activities
        ]

        start_nodes = [
            GraphNode(
                id=f"start_{object_type}",
                label=object_type,
                shape="circle",
                color=color_map[object_type],
                width=40,
                height=40,
                label_pos="top",
            )
            for object_type in self.object_types
        ]

        end_nodes = [
            GraphNode(
                id=f"end_{object_type}",
                label=object_type,
                shape="circle",
                color=color_map[object_type],
                width=40,
                height=40,
                label_pos="bottom",
            )
            for object_type in self.object_types
        ]

        nodes: list[GraphNode] = activity_nodes + start_nodes + end_nodes

        # Create edges
        activity_edges = [
            GraphEdge(
                source=edge.source,
                target=edge.target,
                end_arrow="triangle",
                color=color_map[edge.object_type],
            )
            for edge in self.edges
        ]

        start_edges = [
            GraphEdge(
                source=f"start_{start_edge.object_type}",
                target=start_edge.activity,
                end_arrow="triangle",
                color=color_map[start_edge.object_type],
            )
            for start_edge in self.start_activities
        ]

        end_edges = [
            GraphEdge(
                target=f"end_{end_edge.object_type}",
                source=end_edge.activity,
                end_arrow="triangle",
                color=color_map[end_edge.object_type],
            )
            for end_edge in self.end_activities
        ]

        edges: list[GraphEdge] = activity_edges + start_edges + end_edges

        return Graph(
            type="graph",
            nodes=nodes,
            edges=edges,
            layout_config=GraphvizLayoutConfig(
                engine="dot",
                graphAttrs={
                    "rankdir": "BT",
                    "splines": "True",
                    "nodesep": "0.8",
                    "ranksep": "0.5",
                },
            ),
        )
