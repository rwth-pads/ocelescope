from __future__ import annotations

from typing import Annotated

import pandas as pd
from pydantic import BaseModel, PlainSerializer, WithJsonSchema

from api.utils import custom_snake2camel


class ApiBaseModel(BaseModel):
    class Config:
        alias_generator = custom_snake2camel
        populate_by_name = True
        arbitrary_types_allowed = True


class RequestBody(ApiBaseModel):
    pass


SerializableSeries = Annotated[
    pd.Series,
    PlainSerializer(lambda x: x.to_dict()),
    WithJsonSchema({"type": "object", "additionalProperties": {"type": "number"}}),
]


SerializableDataFrame = Annotated[
    pd.DataFrame,
    PlainSerializer(lambda df: df.to_dict("records")),
]


class NumberStats(ApiBaseModel):
    empty: bool
    count: int
    sum: float
    mean: float
    min: float
    median: float
    max: float
    nonzero: float
