from typing import List, Optional, Dict
from pydantic import BaseModel


class Transition(BaseModel):
    id: str
    label: Optional[str]


class Arc(BaseModel):
    source: str
    target: str
    label: Optional[str] = None


class OCNet(BaseModel):
    places: List[str]
    transitions: List[Transition]
    arcs: List[Arc]


class OCNetModel(BaseModel):
    objects: Dict[str, OCNet]
