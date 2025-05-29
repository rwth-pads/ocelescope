from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, Response
from fastapi.params import Cookie

from api.config import config
from api.exceptions import BadRequest
from api.session import Session
from api.task_api import MainTask
from ocel.ocel_wrapper import OCELWrapper


def get_session(
    response: Response,
    session_id: Annotated[Optional[str], Cookie(alias=config.SESSION_ID_HEADER)] = None,
):
    if session_id is None:
        session = Session()

        response.set_cookie(
            key=config.SESSION_ID_HEADER,
            value=session.id,
            httponly=True,
            secure=False,
            samesite="lax",
        )
    else:
        session = Session.sessions.get(session_id)

    return session


ApiSession = Annotated[Session, Depends(get_session)]


def get_task(session: ApiSession, task_id: str) -> MainTask:
    task = session.get_task(task_id)
    if task is None:
        raise BadRequest("The requested task was not found on the server")
    return task


ApiTask = Annotated[MainTask, Depends(get_task)]


def get_ocel(session: ApiSession):
    return session.get_ocel()


ApiOcel = Annotated[OCELWrapper, Depends(get_ocel)]
