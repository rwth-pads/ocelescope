from __future__ import annotations

from typing import Optional

from fastapi.routing import APIRouter
from pydantic.main import BaseModel

from api.dependencies import ApiSession
from api.model.ocel import OCEL_Metadata, Uploading_OCEL_Metadata
from resources import ResourceUnion


resourceRouter = APIRouter(prefix="/resource", tags=["resource"])


class GetOcelResponse(BaseModel):
    current_ocel_id: Optional[str]
    ocels: list[OCEL_Metadata]
    uploading_ocels: list[Uploading_OCEL_Metadata]


@resourceRouter.post(
    "/", summary="Returns all available resources", operation_id="getResources"
)
def getResources(session: ApiSession) -> list[ResourceUnion]:
    return []
