from typing import Annotated, List, Optional

from fastapi import APIRouter
from fastapi.params import Depends, Query
import pm4py

from api.dependencies import ApiOcel, ApiSession
from api.model.cache import CachableObject
from plugins.berti.models import OCNetModel
from plugins.berti.util import parse_pm4py_ocpn
from plugins.ocelot.models import PaginatedResponse

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


@router.get("/petriNet", response_model=OCNetModel, operation_id="petriNet")
def get_objects_info(
    ocel: ApiOcel,
    objectTypes: Annotated[Optional[list[str]], Query()] = None,
) -> OCNetModel:
    filtered_ocel = ocel.ocel
    if objectTypes is not None:
        filtered_ocel = pm4py.filter_ocel_object_types(
            filtered_ocel, objectTypes[0].split(","), True
        )

    petri_net = pm4py.discover_oc_petri_net(filtered_ocel)

    return parse_pm4py_ocpn(petri_net["petri_nets"])
