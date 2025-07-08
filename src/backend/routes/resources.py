from __future__ import annotations

from io import BytesIO
import json
from typing import Optional

from fastapi.routing import APIRouter
from pydantic.main import BaseModel
from starlette.responses import StreamingResponse

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
def resources(session: ApiSession) -> list[Resource]:
    return session.list_resources()


@resourceRouter.post(
    "/", summary="Adds a resource to the session", operation_id="addResource"
)
def add_resource(session: ApiSession, resource: Resource):
    resource = session.add_resource(
        entity=resource.entity,
        source=resource.source,
        name=resource.name,
        meta_data=resource.meta_data,
    )
    return resource.id


@resourceRouter.get("/{resource_id}")
def get_resource(resource_id: str, session: ApiSession) -> Resource:
    return session.get_resource(resource_id)


@resourceRouter.post("/{resource_id}", operation_id="updateResource")
def update_resource(resource_id: str, session: ApiSession, name: str) -> Resource:
    return session.update_resource(resource_id, name)


@resourceRouter.get("/{resource_id}/download", operation_id="downloadResource")
def download_resource(resource_id: str, session: ApiSession) -> StreamingResponse:
    resource = session.get_resource(resource_id)

    json_str = json.dumps(resource.model_dump(), indent=2)
    buffer = BytesIO(json_str.encode("utf-8"))

    # Return as file download
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={resource.name}.json"},
    )


@resourceRouter.delete("/{resource_id}", operation_id="deleteResource")
def delete_resource(resource_id: str, session: ApiSession):
    session.delete_resource(resource_id)
