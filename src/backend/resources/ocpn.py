from dataclasses import dataclass
from typing import Literal, Optional

from resources.base import AnnotatedClass, Resource


@dataclass
class Place(AnnotatedClass):
    id: str
    object_type: str
    place_type: Optional[Literal["sink", "source", None]]


@dataclass
class Transition(AnnotatedClass):
    id: str
    label: Optional[str]


@dataclass
class Arc(AnnotatedClass):
    source: str
    target: str
    variable: bool = False


@dataclass
class ObjectCentricPetriNet(Resource):
    places: list[Place]
    transitions: list[Transition]
    arcs: list[Arc]
    type: Literal["ocpn"]
