import threading
from typing import Annotated, Optional

import pm4py
from fastapi import APIRouter
from fastapi.params import Depends

from api.dependencies import ApiSession
from api.exceptions import NotFound
from api.model.cache import CachableObject
from api.model.process_models import OCDFG, ObjectCentricPetriNet
from api.model.tasks import TaskResponse
from api.session import Session
from plugins.berti.util import compute_ocdfg, convert_flat_pm4py_to_ocpn
from util.tasks import TaskState, task

router = APIRouter()


class State(CachableObject):
    def __init__(self):
        super().__init__()
        self.petri_nets: dict[str, ObjectCentricPetriNet] = {}
        self.ocdfgs: dict[str, OCDFG] = {}


def get_state(session: ApiSession):
    return session.get_plugin_state("berti", State)


StateDep = Annotated[State, Depends(get_state)]

meta = {
    "name": "berti",
    "prefix": "/berti",
    "tags": ["berti"],
    "description": "Process Model discovery by Allesandro Berti",
    "config": {"enabled": True},
}


@router.get("/petriNet", operation_id="petriNet")
def get_petri_net(
    session: ApiSession,
    state: StateDep,
) -> TaskResponse[ObjectCentricPetriNet]:
    ocel_id = session.current_ocel_id

    if ocel_id is None:
        raise NotFound("There is no OCEL to be mined")

    if ocel_id in state.petri_nets:
        return TaskResponse(status=TaskState.SUCCESS, result=state.petri_nets[ocel_id])

    test = mine_petri_net(session=session, ocel_id=ocel_id)

    return TaskResponse(status=TaskState.STARTED, taskId=test)


@task(dedupe=True)
def mine_petri_net(
    session: Session, ocel_id: str, stop_event: Optional[threading.Event] = None
):
    petri_net = pm4py.discover_oc_petri_net(session.get_ocel(ocel_id).ocel)
    petri_net = convert_flat_pm4py_to_ocpn(petri_net["petri_nets"])

    if stop_event is not None and not stop_event.is_set():
        plugin_state = session.get_plugin_state("berti", State)
        plugin_state.petri_nets[ocel_id] = petri_net


@router.get("/ocdfg", operation_id="ocdfg")
def get_ocdfg(
    session: ApiSession,
    state: StateDep,
) -> TaskResponse[OCDFG]:
    ocel_id = session.current_ocel_id

    if ocel_id is None:
        raise NotFound("There is no OCEL to be mined")

    if ocel_id in state.ocdfgs:
        return TaskResponse(status=TaskState.SUCCESS, result=state.ocdfgs[ocel_id])

    test = mine_ocdfg(session=session, ocel_id=ocel_id)

    return TaskResponse(status=TaskState.STARTED, taskId=test)


@task(dedupe=True)
def mine_ocdfg(
    session: Session, ocel_id: str, stop_event: Optional[threading.Event] = None
):
    ocdfg = compute_ocdfg(session.get_ocel(ocel_id).ocel)

    if stop_event is not None and not stop_event.is_set():
        plugin_state = session.get_plugin_state("berti", State)
        plugin_state.ocdfgs[ocel_id] = ocdfg
