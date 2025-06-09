from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from api.dependencies import ApiOcel, ApiSession
from api.model.cache import CachableObject
from plugins.totem.models import TotemResult
from plugins.totem.util import mine_totem

router = APIRouter()


class State(CachableObject):
    # ---------------- Events ---------------- #
    def test(self):
        return ""


def get_state(session: ApiSession):
    return session.get_plugin_state("ocelot", State)


StateDep = Annotated[State, Depends(get_state)]


meta = {
    "name": "totem",
    "prefix": "/totem",
    "tags": ["totem"],
    "description": "Totem discover by lukas ApiSession",
    "config": {"enabled": True},
}


@router.get("/totem", response_model=TotemResult, operation_id="totem")
def get_objects_info(
    ocel: ApiOcel,
) -> TotemResult:
    return mine_totem(ocel.ocel, tau=0.9)
