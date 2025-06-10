import threading
from typing import Annotated, Optional

from fastapi import APIRouter
from fastapi.params import Depends

from api.dependencies import ApiOcel, ApiSession
from api.exceptions import NotFound
from api.model.cache import CachableObject
from api.model.tasks import TaskResponse
from api.session import Session
from plugins.totem.models import TotemResult
from plugins.totem.util import mine_totem
from util.hash import filters_hash
from util.tasks import TaskState, task

router = APIRouter()


class State(CachableObject):
    # ---------------- Events ---------------- #
    def __init__(self):
        super().__init__()
        self.totems: dict[str, TotemResult] = {}


def get_state(session: ApiSession):
    return session.get_plugin_state("totem", State)


StateDep = Annotated[State, Depends(get_state)]


meta = {
    "name": "totem",
    "prefix": "/totem",
    "tags": ["totem"],
    "description": "Totem discover by lukas ApiSession",
    "config": {"enabled": True},
}


@router.get("/totem", operation_id="totem")
def get_totem(
    session: ApiSession, state: StateDep, tau: float | None = None
) -> TaskResponse[TotemResult]:
    ocel_id = session.current_ocel_id

    if ocel_id is None:
        raise NotFound("There is no OCEL to be mined")

    ocel = session.get_ocel(ocel_id)
    hash = filters_hash(ocel.get_filters())

    if f"{ocel_id}_{hash}" in state.totems:
        return TaskResponse(
            status=TaskState.SUCCESS, result=state.totems[f"{ocel_id}_{hash}"]
        )

    task_id = totem_task(
        session=session, ocel_id=ocel_id, filter_hash=hash, tau=tau or 0.9
    )

    return TaskResponse(status=TaskState.STARTED, taskId=task_id)


@task(dedupe=True)
def totem_task(
    session: Session,
    ocel_id: str,
    filter_hash: str,
    tau: float,
    stop_event: Optional[threading.Event] = None,
):
    totem = mine_totem(session.get_ocel(ocel_id=ocel_id).ocel, tau)
    session.get_plugin_state("totem", State).totems[f"{ocel_id}_{filter_hash}"] = totem
