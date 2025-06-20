from dataclasses import dataclass

from .ocdfg import ObjectCentricDirectlyFollowsGraph
from .ocpn import ObjectCentricPetriNet


from typing import Annotated, Any, Union
from pydantic import Field

__all__ = [
    "ObjectCentricDirectlyFollowsGraph",
    "ObjectCentricPetriNet",
    "ResourceUnion",
    "Resource",
]

ResourceUnion = Annotated[
    Union[ObjectCentricDirectlyFollowsGraph, ObjectCentricPetriNet],
    Field(discriminator="type"),
]


@dataclass
class Resource:
    id: str
    name: str
    created_at: str
    source: str
    meta_data: dict[str, Any]
    resource: ResourceUnion
