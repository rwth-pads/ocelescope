from typing import List, Dict, Literal, Optional, Any
from pydantic import BaseModel


# Petri Nets
class Place(BaseModel):
    id: str
    object_type: str
    place_type: Optional[Literal["sink", "source"]] = None
    annotations: Dict[str, Any] = {}


class Transition(BaseModel):
    id: str
    label: Optional[str]
    annotations: Dict[str, Any] = {}


class Arc(BaseModel):
    source: str
    target: str
    variable: bool = False
    annotations: Dict[str, Any] = {}


class PetriNet(BaseModel):
    places: List[Place]
    transitions: List[Transition]
    arcs: List[Arc]


class ObjectCentricPetriNet(BaseModel):
    net: PetriNet


# DFG


class DFG_EDGE(BaseModel):
    source: str
    target: str
    object_type: str


class OCDFG(BaseModel):
    object_types: list[str]
    activities: list[str]
    edges: list[DFG_EDGE]
    start_activities: dict[str, list[str]]
    end_activities: dict[str, list[str]]
