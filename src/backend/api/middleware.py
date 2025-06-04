from fastapi import Request
from fastapi.responses import Response

from api.config import config
from api.session import Session


EXCLUDED_PATHS = ["/logout"]


async def ocel_access_middleware(request: Request, call_next):
    if request.url.path in EXCLUDED_PATHS:
        return await call_next(request)

    session_id = request.cookies.get(config.SESSION_ID_HEADER)
    session = Session.get(session_id) if session_id else None

    # Auto-create session if not found
    if not session:
        session = Session()

    # Attach session to request state for dependency access
    request.state.session = session

    response: Response = await call_next(request)

    # Set the session cookie on the response
    response.set_cookie(
        key=config.SESSION_ID_HEADER,
        value=session.id,
        httponly=True,
        path="/",
        max_age=3600 * 24,  # 1 day
    )

    return response
