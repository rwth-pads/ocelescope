from __future__ import annotations

from datetime import datetime
import json
import uuid
from typing import Any, Optional, Type, TypeVar, cast

from api.exceptions import NotFound
from api.model.cache import CachableObject
from api.model.tasks import TaskSummary
from ocel.ocel_wrapper import OCELWrapper
from resources import Resource, ResourceUnion
from util.tasks import Task


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

        # Resources
        self._resources: dict[str, Resource] = {}

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
                metadata=task.metadata,
            )
            for task in self._tasks.values()
        ]

    def get_plugin_state(self, key: str, cls: Type[T]) -> T:
        if key not in self._plugin_states:
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
        self.ocels[ocel.id] = ocel

        if not self.current_ocel_id:
            self.current_ocel_id = ocel.id

        return ocel.id

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

    def delete_ocel(self, ocel_id: str):
        if ocel_id not in self.ocels:
            return

        if ocel_id == self.current_ocel_id:
            self.current_ocel_id = None

        self.ocels.pop(ocel_id, None)

        self.invalidate_plugin_states()

    # Resources
    def get_resource(self, resource_id: str) -> Resource:
        resource = self._resources.get(resource_id)
        if resource is None:
            raise NotFound(f"Resource with id {resource_id} not found")

        return resource

    def add_resource(
        self,
        resource: ResourceUnion,
        source: str,
        name: Optional[str] = None,
        meta_data: Optional[dict[str, Any]] = None,
    ) -> Resource:
        new_resource = Resource(
            id=str(uuid.uuid4()),
            source=source,
            resource=resource,
            created_at=datetime.now().isoformat(),
            meta_data=meta_data if meta_data is not None else {},
            name=name if name is not None else resource.type,
        )

        self._resources[new_resource.id] = new_resource

        return new_resource

    def delete_resource(self, resource_id: str):
        self._resources.pop(resource_id)

    def list_resources(self) -> list[Resource]:
        return list(self._resources.values())

    def invalidate_plugin_states(self):
        for plugin_state in self._plugin_states.values():
            plugin_state.clear_cache()

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
