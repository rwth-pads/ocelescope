from typing import Annotated, Callable, List, Literal, Any, Union
from pydantic import BaseModel
from pydantic.fields import Field


class BaseInputSchema(BaseModel):
    name: str
    description: str = ""
    default: Any = None


class NumberInput(BaseInputSchema):
    type: Literal["number"]
    min: float | None = None
    max: float | None = None


class EnumInput(BaseInputSchema):
    type: Literal["enum"]
    options: List[str]


class RInupt(BaseInputSchema):
    type: Literal["resource"]
    resource_types: list[str]


class OcelInput(BaseInputSchema):
    type: Literal["ocel"]


InputDefinition = Annotated[
    Union[NumberInput, EnumInput, RInupt, OcelInput],
    Field(discriminator="type"),
]


class OutputDefinition(BaseModel):
    type: Literal["resource"]
    name: str
    resource_types: str


class MethodDefinition(BaseModel):
    input_types: list[InputDefinition]
    output_types: OutputDefinition
    run: Callable[[Any, dict], dict]
