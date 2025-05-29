from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header
from fastapi.params import Cookie

from api.config import config
from api.exceptions import BadRequest, Unauthorized
from api.logger import logger
from api.session import Session
from api.task_api import MainTask
from ocel.ocel_wrapper import OCELWrapper

session_cookie_param = Cookie(alias=config.SESSION_ID_HEADER)


def get_session(session_id: Annotated[str, session_cookie_param]):
    session = Session.get(session_id)
    if session is None:
        repr = lambda s: f"'{s[:5]}...'"
        logger.info(
            f"Request with session_id {repr(session_id)} failed. Available sessions: [{', '.join([repr(s.id) for s in Session.sessions.values()])}]"
        )
        raise Unauthorized("The session has expired.")
    return session


ApiSession = Annotated[Session, Depends(get_session)]


def get_task(session: ApiSession, task_id: str) -> MainTask:
    task = session.get_task(task_id)
    if task is None:
        raise BadRequest("The requested task was not found on the server")
    return task


ApiTask = Annotated[MainTask, Depends(get_task)]


def get_ocel(session: ApiSession):
    return session.ocel


ApiOcel = Annotated[OCELWrapper, Depends(get_ocel)]
