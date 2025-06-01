from __future__ import annotations

from typing import Optional

from fastapi.routing import APIRouter
from pydantic.main import BaseModel

from api.dependencies import ApiSession
from api.model.ocel import OCEL_Metadata

sessionRouter = APIRouter(prefix="/session", tags=["session"])


class GetOcelResponse(BaseModel):
    current_ocel_id: Optional[str]
    ocels: list[OCEL_Metadata]


@sessionRouter.get("/ocels", summary="Get Uploaded OCELs", operation_id="getOcels")
def getOcels(session: ApiSession) -> GetOcelResponse:
    return GetOcelResponse(
        current_ocel_id=session.current_ocel_id,
        ocels=[
            OCEL_Metadata(
                created_at=value.meta["uploadDate"],
                id=key,
                name=value.meta["fileName"],
                extensions=[extension.name for extension in value.get_extensions_list()],
            )
            for key, value in session.ocels.items()
        ],
    )


@sessionRouter.post("/ocel", summary="Get Uploaded OCELs", operation_id="setCurrentOcel")
def set_current_ocel(session: ApiSession, ocel_id: str):
    session.set_current_ocel(ocel_id)
