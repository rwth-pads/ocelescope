from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from api.dependencies import ApiOcel, ApiSession
from api.model.cache import CachableObject
from util.cache import instance_lru_cache

router = APIRouter()


class State(CachableObject):
    def __init__(self):
        super().__init__()
        self.counter = 0

    @property
    @instance_lru_cache()
    def cached_method(self):
        print("I am cached")
        return "Cached Method Result"

    def increment_counter(self):
        self.counter += 1


def get_state(session: ApiSession):
    return session.get_plugin_state("ocelot", State)


StateDep = Annotated[State, Depends(get_state)]

meta = {
    "name": "example",
    "prefix": "/example",
    "tags": ["example"],
    "description": "small example plugin",
    "config": {"enabled": True},
}


@router.post("/increase-counter", operation_id="increaseCounter", response_model=dict[str, int])
def increaseCounter(state: StateDep) -> dict[str, int]:
    state.increment_counter()
    return {"counter": state.counter}


@router.get("/activities", operation_id="paginatedEvents")
def get_events(
    ocel: ApiOcel,
) -> list[str]:
    return ocel.activities
