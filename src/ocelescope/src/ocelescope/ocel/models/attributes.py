# --- Attribute Type Models ---
from dataclasses import dataclass
from typing import Annotated, Literal

from pydantic import Field


@dataclass()
class IntegerAttribute:
    attribute: str
    type: Literal["integer"]
    min: int
    max: int


@dataclass
class FloatAttribute:
    attribute: str
    type: Literal["float"]
    min: float
    max: float


@dataclass
class BooleanAttribute:
    attribute: str
    type: Literal["boolean"]
    true_count: int
    false_count: int


@dataclass
class DateAttribute:
    attribute: str
    type: Literal["date"]
    min: str
    max: str


@dataclass
class NominalAttribute:
    attribute: str
    type: Literal["nominal"]
    num_unique: int


AttributeSummary = Annotated[
    IntegerAttribute | FloatAttribute | BooleanAttribute | DateAttribute | NominalAttribute,
    Field(discriminator="type"),
]
