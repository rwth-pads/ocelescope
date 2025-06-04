from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, Response
from fastapi.params import Cookie, Query

from api.config import config
from api.exceptions import BadRequest, NotFound
from api.session import Session
from api.task_api import MainTask
from ocel.ocel_wrapper import OCELWrapper


from fastapi import Request, HTTPException
from api.session import Session


def get_session(request: Request) -> Session:
    session = getattr(request.state, "session", None)
    if not session:
        raise HTTPException(status_code=500, detail="Session middleware not set")
    return session


ApiSession = Annotated[Session, Depends(get_session)]


def get_task(session: ApiSession, task_id: str) -> MainTask:
    task = session.get_task(task_id)
    if task is None:
        raise BadRequest("The requested task was not found on the server")
    return task


ApiTask = Annotated[MainTask, Depends(get_task)]


def get_ocel(session: ApiSession, ocel_id: str | None = None):
    try:
        return session.get_ocel(ocel_id)
    except NotFound:
        raise HTTPException(status_code=404, detail="OCEL not found")


ApiOcel = Annotated[OCELWrapper, Depends(get_ocel)]
