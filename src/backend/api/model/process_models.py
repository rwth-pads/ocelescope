from typing import List, Dict, Optional, Any
from pydantic import BaseModel


class Place(BaseModel):
    id: str
    object_type: str
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


class Marking(BaseModel):
    tokens: Dict[str, List[str]]
    annotations: Dict[str, Any] = {}


class ObjectCentricPetriNet(BaseModel):
    net: PetriNet
