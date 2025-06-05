from __future__ import annotations

import json
import uuid
from typing import Any, Optional, Type, TypeVar, cast

from api.exceptions import NotFound
from api.logger import logger
from api.model.cache import CachableObject
from api.model.tasks import TaskSummary
from ocel.ocel_wrapper import OCELWrapper
from util.tasks import Task
from util.types import PathLike


T = TypeVar("T", bound=CachableObject)  # Constrain T to CachableObject


class Session:
    sessions = {}

    def __init__(
        self,
        id: str | None = None,
    ):
        self.id = id or str(uuid.uuid4())

        # Tasks
        self._tasks: dict[str, Task] = {}
        self._running_tasks: dict[str, Task] = {}
        self._dedupe_keys: dict[tuple, str] = {}  # dedupe key → task_id

        # Plugins
        self._plugin_states: dict[str, CachableObject] = {}

        # OCELS
        self.ocels: dict[str, OCELWrapper] = {}
        self.current_ocel_id = None

        self.response_cache: dict[str, Any] = {}
        # Set first state to UUID, to be updated on each response
        self.update_state()

        # Store session in static variable
        Session.sessions[self.id] = self

    @property
    def tasks(self):
        return self._tasks

    @property
    def running_tasks(self):
        return self._running_tasks

    def get_task(self, task_id: str):
        return self._tasks.get(task_id, None)

    def list_tasks(self) -> list[TaskSummary]:
        return [
            TaskSummary(
                key=task.id,
                name=task.name,
                state=task.state,
                has_result=task.result is not None,
            )
            for task in self._tasks.values()
        ]

    def get_plugin_state(self, key: str, cls: Type[T]) -> T:
        if key not in self._tasks:
            self._plugin_states[key] = cls()
        return cast(T, self._plugin_states[key])

    @staticmethod
    def get(session_id: str) -> Session | None:
        return Session.sessions.get(session_id, None)

    @staticmethod
    def info() -> str:
        return (
            "[\n  " + ",\n  ".join([str(s) for s in Session.sessions.values()]) + "\n]"
        )

    def update_state(self):
        self.state = str(uuid.uuid4())

    def add_ocel(self, ocel: OCELWrapper) -> str:
        id = str(uuid.uuid4())
        is_ocels_empty = not self.ocels
        self.ocels[id] = ocel

        if is_ocels_empty:
            self.current_ocel_id = id

        return id

    def get_ocel(self, ocel_id: Optional[str] = None) -> OCELWrapper:
        id = ocel_id if ocel_id is not None else self.current_ocel_id

        if id not in self.ocels:
            raise NotFound(f"OCEL with id {ocel_id} not found")

        return self.ocels[id]

    def set_current_ocel(self, ocel_id: str):
        if ocel_id not in self.ocels:
            raise NotFound(f"OCEL with id {ocel_id} not found")

        self.current_ocel_id = ocel_id

        self.invalidate_plugin_states()

    def invalidate_plugin_states(self):
        for plugin_state in self._plugin_states.values():
            plugin_state.clear_cache()

    def export_sqlite(self, export_path: PathLike):
        # Write OCEL
        logger.info(f"Exporting OCEL to '{export_path}' ...")
        self.get_ocel().write_ocel2_sqlite(export_path)

    def __str__(self):
        d = {
            k: v
            for k, v in {
                "id": self.id,
                "ocel": str(self.get_ocel()) if self.get_ocel() else None,
            }.items()
            if v is not None
        }
        return json.dumps(d, indent=2)

    def __repr__(self):
        return str(self)


def save_response_to_cache(route: str):
    return route != "task-status"


def add_from_response_cache(route: str):
    return route == "load"
