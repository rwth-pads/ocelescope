from abc import ABC
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime

from pydantic.fields import Field


class OutputBase(BaseModel, ABC):
    type: str


class Output(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    name: str
    output: OutputBase


class OutputApi(BaseModel):
    id: str = Field(default_factory=lambda: uuid4().hex)
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    name: str
    type_label: str
