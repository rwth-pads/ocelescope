from __future__ import annotations


from pydantic import BaseModel

from api.utils import custom_snake2camel


class ApiBaseModel(BaseModel):
    class Config:
        alias_generator = custom_snake2camel
        populate_by_name = True
        arbitrary_types_allowed = True


class RequestBody(ApiBaseModel):
    pass
