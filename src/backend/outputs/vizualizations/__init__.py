from typing import Annotated, Union

from pydantic.fields import Field

from .graphs import Graph


Visualization = Annotated[Union[Graph], Field(discriminator="type")]

__all__ = ["Visualization"]
