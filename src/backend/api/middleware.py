from fastapi import Request

from api.config import config
from api.model.with_ocel import ocel_ctx
from api.session import Session


async def ocel_access_middleware(request: Request, call_next):
    """Middleware extracting the session ID from the incomping request header.
    The session ID is saved to a ContextVar for further processing, allowing for validation of deeply nested pydantic models.
    """

    # Save session_id from header to ContextVar
    session_id = request.cookies.get(config.SESSION_ID_HEADER)
    session = Session.get(session_id) if session_id else None
    if session:
        ocel_ctx.set(session.get_ocel())

    response = await call_next(request)

    # Delete the cookie if the session is not valid anymore
    if session_id and not session:
        response.delete_cookie(
            key=config.SESSION_ID_HEADER,
            path="/",
        )

    return response
