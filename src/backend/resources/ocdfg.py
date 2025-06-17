from dataclasses import dataclass
from typing import Literal
from resources.base import AnnotatedClass, Resource


@dataclass
class Edge(AnnotatedClass):
    source: str
    target: str
    object_type: str


@dataclass
class ObjectCentricDirectlyFollowsGraph(Resource):
    object_types: list[str]
    activities: list[str]
    edges: list[Edge]
    start_activities: dict[str, list[str]]
    end_activities: dict[str, list[str]]
    type: Literal["ocdfg"] = "ocdfg"
