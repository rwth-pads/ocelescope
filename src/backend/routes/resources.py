from __future__ import annotations

from typing import Optional

from fastapi.routing import APIRouter
from pydantic.main import BaseModel

from api.dependencies import ApiSession
from api.model.ocel import OCEL_Metadata, Uploading_OCEL_Metadata
from resources import Resource


resourceRouter = APIRouter(prefix="/resource", tags=["resource"])


class GetOcelResponse(BaseModel):
    current_ocel_id: Optional[str]
    ocels: list[OCEL_Metadata]
    uploading_ocels: list[Uploading_OCEL_Metadata]


@resourceRouter.get(
    "/", summary="Returns all available resources", operation_id="getResources"
)
def getResources(session: ApiSession) -> list[Resource]:
    return session.list_resources()


@resourceRouter.get("/{resource_id}")
def getResource(resource_id: str, session: ApiSession) -> Resource:
    return session.get_resource(resource_id)


@resourceRouter.delete("/{resource_id}", operation_id="deleteResource")
def deleteResource(resource_id: str, session: ApiSession):
    session.delete_resource(resource_id)
