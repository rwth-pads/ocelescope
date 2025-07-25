from pydantic.main import BaseModel
from outputs import register_output, OutputBase, register_vizulization
from outputs.vizualizations.graphs import Graph


class Edge(BaseModel):
    source: str
    target: str
    object_type: str


class ObjectActivityEdge(BaseModel):
    object_type: str
    activity: str


@register_output(label="Directly Follows Graph")
class ObjectCentricDirectlyFollowsGraph(OutputBase):
    type: str = "ocdfg"
    object_types: list[str]
    activities: list[str]
    edges: list[Edge]
    start_activities: list[ObjectActivityEdge]
    end_activities: list[ObjectActivityEdge]


@register_vizulization()
def visualize_ocdfg(output: ObjectCentricDirectlyFollowsGraph) -> Graph:
    return Graph(type="graph", edges=[], nodes=[])
