from typing import Annotated

from fastapi import APIRouter
from fastapi.params import Depends

from api.model.cache import CachableObject

router = APIRouter()


class State(CachableObject):
    message: str = "Hello from plugin!"


StateDep = Annotated[State, Depends()]
meta = {
    "name": "helloworld",
    "prefix": "/helloworld",  # used by the loader
    "tags": ["helloworld"],  # used by the loader
    "description": "Say hello 🌍",
    "permissions": ["read:hello"],  # optional
    "config": {"enabled": True},  # optional config
}


@router.get("/")
def hello(state: StateDep):
    return {"message": state.message}
