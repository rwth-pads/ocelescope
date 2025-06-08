from typing import Annotated, Optional

import pm4py
from fastapi import APIRouter
from fastapi.params import Depends, Query

from api.dependencies import ApiOcel, ApiSession
from api.model.cache import CachableObject
from api.model.process_models import ObjectCentricPetriNet
from plugins.berti.util import convert_flat_pm4py_to_ocpn

router = APIRouter()


class State(CachableObject):
    # ---------------- Events ---------------- #
    def test(self):
        return ""


def get_state(session: ApiSession):
    return session.get_plugin_state("ocelot", State)


StateDep = Annotated[State, Depends(get_state)]

meta = {
    "name": "berti",
    "prefix": "/berti",
    "tags": ["berti"],
    "description": "Process Model discovery by Allesandro Berti",
    "config": {"enabled": True},
}


@router.get("/petriNet", response_model=ObjectCentricPetriNet, operation_id="petriNet")
def get_objects_info(
    ocel: ApiOcel,
    objectTypes: Annotated[Optional[list[str]], Query()] = None,
) -> ObjectCentricPetriNet:
    petri_net = pm4py.discover_oc_petri_net(ocel.ocel)
    return convert_flat_pm4py_to_ocpn(petri_net["petri_nets"])
