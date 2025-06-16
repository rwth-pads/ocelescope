import threading
from typing import Annotated, Optional

from fastapi import APIRouter
from fastapi.params import Depends

from api.dependencies import ApiOcel, ApiSession
from api.model.cache import CachableObject
from api.model.tasks import TaskResponse
from api.session import Session
from plugins.totem.models import TotemResult
from plugins.totem.util import mine_totem
from util.tasks import TaskState, task

router = APIRouter()


class State(CachableObject):
    # ---------------- Events ---------------- #
    def __init__(self):
        super().__init__()
        self.totems: dict[tuple[str, str], TotemResult] = {}


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
    ocel: ApiOcel, session: ApiSession, state: StateDep, tau: float | None = None
) -> TaskResponse[TotemResult]:
    if ocel.state_id in state.totems:
        return TaskResponse(
            status=TaskState.SUCCESS, result=state.totems[ocel.state_id]
        )

    task_id = totem_task(session=session, ocel_id=ocel.id, tau=tau or 0.9)

    return TaskResponse(status=TaskState.STARTED, taskId=task_id)


@task(dedupe=True)
def totem_task(
    session: Session,
    ocel_id: str,
    tau: float,
    stop_event: Optional[threading.Event] = None,
):
    ocel = session.get_ocel(ocel_id=ocel_id)
    totem = mine_totem(session.get_ocel(ocel_id=ocel_id).ocel, tau)
    if stop_event and stop_event.is_set():
        return None

    session.get_plugin_state("totem", State).totems[ocel.state_id] = totem
