from __future__ import annotations

from typing import Optional

from fastapi.routing import APIRouter
from pydantic.main import BaseModel

from api.dependencies import ApiOcel, ApiSession
from api.model.ocel import OCEL_Metadata, Uploading_OCEL_Metadata
from fastapi import Request
from fastapi.responses import Response, JSONResponse

from api.config import config
from api.session import Session
from util.tasks import TaskState


sessionRouter = APIRouter(prefix="/session", tags=["session"])


class GetOcelResponse(BaseModel):
    current_ocel_id: Optional[str]
    ocels: list[OCEL_Metadata]
    uploading_ocels: list[Uploading_OCEL_Metadata]


@sessionRouter.post("/logout", summary="Deletes the Session", operation_id="logout")
def logout(request: Request, response: Response):
    session_id = request.cookies.get(config.SESSION_ID_HEADER)

    response = JSONResponse({"message": "Logged out"}, status_code=200)
    if session_id is not None and session_id in Session.sessions:
        Session.sessions.pop(session_id)

    if session_id is not None:
        response.delete_cookie(
            key=config.SESSION_ID_HEADER,
            httponly=True,
            path="/",
        )

    return response


@sessionRouter.get("/ocels", summary="Get Uploaded OCELs", operation_id="getOcels")
def getOcels(session: ApiSession) -> GetOcelResponse:
    return GetOcelResponse(
        current_ocel_id=session.current_ocel_id,
        ocels=[
            OCEL_Metadata(
                created_at=value.original.meta["uploadDate"],
                id=key,
                name=value.original.meta["fileName"],
                extensions=[
                    extension.name for extension in value.original.get_extensions_list()
                ],
            )
            for key, value in session.ocels.items()
        ],
        uploading_ocels=[
            Uploading_OCEL_Metadata(
                task_id=task.key,
                name=task.metadata["file_name"],
                uploaded_at=task.metadata["upload_date"],
            )
            for task in session.list_tasks()
            if (task.name == "import_ocel_task") & (task.state == TaskState.STARTED)
        ],
    )


@sessionRouter.post(
    "/ocel", summary="Get Uploaded OCELs", operation_id="setCurrentOcel"
)
def set_current_ocel(session: ApiSession, ocel_id: str):
    session.set_current_ocel(ocel_id)


@sessionRouter.post(
    "/ocel/delete", summary="Deletes the ocel with the id", operation_id="deleteOcel"
)
def delete_ocel(session: ApiSession, ocel_id: str):
    session.delete_ocel(ocel_id)


@sessionRouter.post(
    "/ocel/rename", summary="Renames the ocel with the id", operation_id="renameOcel"
)
def rename_ocel(session: ApiSession, ocel: ApiOcel, new_name: str):
    ocel.rename(new_name)
