from typing import Optional
from pydantic.main import BaseModel

from filters.config_union import FilterConfig


class OcelMetadata(BaseModel):
    id: str
    name: str
    created_at: str
    extensions: list[str]


class UploadingOcelMetadata(BaseModel):
    name: str
    task_id: str
    uploaded_at: str


class OcelListResponse(BaseModel):
    current_ocel_id: Optional[str]
    ocels: list[OcelMetadata]
    uploading_ocels: list[UploadingOcelMetadata]


class Filter(BaseModel):
    pipeline: list[FilterConfig]
