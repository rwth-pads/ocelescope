from fastapi import Request

from api.config import config
from api.model.with_ocel import ocel_ctx
from api.session import Session


async def ocel_access_middleware(request: Request, call_next):
    """Middleware extracting the session ID from the incomping request header.
    The session ID is saved to a ContextVar for further processing, allowing for validation of deeply nested pydantic models.
    """

    # Save session_id from header to ContextVar
    session_id = request.headers.get(config.SESSION_ID_HEADER.lower())
    session = Session.get(session_id) if session_id else None
    if session:
        ocel_token = ocel_ctx.set(session.ocel)

    response = await call_next(request)
    return response
