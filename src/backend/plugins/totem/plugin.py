import threading
from typing import Annotated, Optional

from fastapi import APIRouter
from fastapi.params import Depends

from api.dependencies import ApiOcel, ApiSession
from api.exceptions import NotFound
from api.model.cache import CachableObject
from api.model.tasks import TaskResponse
from api.session import Session
from plugins.totem.util import mine_totem
from resources import Resource
from resources.totem import Totem
from util.tasks import TaskState, task

router = APIRouter()


class State(CachableObject):
    # ---------------- Events ---------------- #
    def __init__(self):
        super().__init__()
        self.totems: dict[tuple[str, float], Totem] = {}


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
) -> TaskResponse[Totem]:
    if (ocel.state_id, tau or 0.9) in state.totems:
        return TaskResponse(
            status=TaskState.SUCCESS, result=state.totems[(ocel.state_id, tau or 0.9)]
        )

    task_id = totem_task(
        session=session, ocel_id=ocel.id, field=ocel.state_id, tau=tau or 0.9
    )

    return TaskResponse(status=TaskState.STARTED, taskId=task_id)


@router.post("/totem", operation_id="saveTotem")
def save_totem(
    session: ApiSession,
    state: StateDep,
    ocel: ApiOcel,
    tau: float | None = None,
) -> Resource:
    if (ocel.state_id, tau or 0.9) not in state.totems:
        raise NotFound("Process model not discovered")

    resource = session.add_resource(
        source="totem", entity=state.totems[(ocel.state_id, tau or 0.9)]
    )
    return resource


@task(dedupe=True)
def totem_task(
    session: Session,
    ocel_id: str,
    field: str,
    tau: float,
    stop_event: Optional[threading.Event] = None,
):
    totem = mine_totem(session.get_ocel(ocel_id=ocel_id).ocel, tau)
    if stop_event and stop_event.is_set():
        return None

    session.get_plugin_state("totem", State).totems[(field, tau)] = totem
