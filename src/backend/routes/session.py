from __future__ import annotations

from fastapi.routing import APIRouter

from api.dependencies import ApiSession
from api.model.ocel import OCEL_Metadata

sessionRouter = APIRouter(prefix="/session", tags=["session"])


@sessionRouter.get("/ocels", summary="Get Uploaded OCELs", operation_id="getOcels")
def getOcels(session: ApiSession) -> list[OCEL_Metadata]:
    return [
        OCEL_Metadata(created_at=value.meta["uploadDate"], id=key, name=value.meta["fileName"])
        for key, value in session.ocels.items()
    ]
