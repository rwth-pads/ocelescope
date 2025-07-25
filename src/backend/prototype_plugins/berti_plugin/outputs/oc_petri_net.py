from typing import Literal, Optional

from pydantic.main import BaseModel
from outputs import OutputBase, register_output


class Place(BaseModel):
    id: str
    object_type: str
    place_type: Optional[Literal["sink", "source", None]]


class Transition(BaseModel):
    id: str
    label: Optional[str]


class Arc(BaseModel):
    source: str
    target: str
    variable: bool = False


@register_output(label="Petri Net")
class ObjectCentricPetriNet(OutputBase):
    places: list[Place]
    transitions: list[Transition]
    arcs: list[Arc]
    type: str = "ocpn"
