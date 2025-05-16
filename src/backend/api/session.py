from __future__ import annotations

import json
import uuid
from typing import TYPE_CHECKING, Any, Type, TypeVar

import pandas as pd

from api.logger import logger
from ocel.ocel_wrapper import OCELWrapper
from util.types import PathLike

if TYPE_CHECKING:
    from api.model.app_state import AppState
    from api.task_api import MainTask


T = TypeVar("T")


class Session:
    sessions = {}

    def __init__(
        self,
        ocel: OCELWrapper,
        app_state: AppState,
        id: str | None = None,
    ):
        self.id = id or str(uuid.uuid4())
        self.ocel = ocel
        self.app_state = app_state

        self._tasks = {}
        self._plugin_states = {}

        self.response_cache: dict[str, Any] = {}
        # Set first state to UUID, to be updated on each response
        self.update_state()

        # Store session in static variable
        Session.sessions[self.id] = self

    def get_task(self, task_id: str):
        return self._tasks.get(task_id, None)

    def get_plugin_state(self, key: str, cls: Type[T]) -> T:
        if key not in self._tasks:
            self._tasks[key] = cls()
        return self._tasks[key]

    def respond(
        self,
        route: str | None = None,
        task: MainTask | None = None,
        include_task: bool = True,
        msg: str | None = None,
        status: int = 200,
        **kwargs,
    ) -> dict[str, Any]:
        if route is None:
            if task is None:
                raise ValueError("Session.respond() needs either route or task specified")
            # When building a task return value, mimic a normal API response. task-status then assigns it to res["task"]["result"].
            route = task.route

        # Need route for the following check
        # Session state should only be updated on some routes
        if route not in ["load", "update", "sample-objects", "sample-events"] and task is None:
            self.update_state()
        if task is not None and task.ready():
            # Task finished
            # TODO do all tasks require a status update after finishing? (use task.route)
            self.update_state()

        response: dict[str, Any] = dict(
            session=self.id,
            route=route,
            state=self.state,
            status=status,
            msg=msg,
        )

        # if route in ["update", "load", "import", "import-default", "interval-transformation"]:
        response["app_state"] = self.app_state
        if task is not None and include_task:
            response["task"] = task.serialize()

        # When is caching to/from self.data really necessary? Try to minimize API responses!
        # Examples when needed:
        # - After computing emissions, go back to start tab
        # Examples when not needed:
        # - task-status - Here, only task info (+result)
        if save_response_to_cache(route):
            # Cache the response content in the Session object, accumulating
            self.response_cache.update(**kwargs)
        if add_from_response_cache(route):
            # Add previous response contents
            response.update(**self.response_cache)

        # Add the actual response content, potentially overriding cached data
        response.update(**kwargs)
        return response

    @staticmethod
    def get(session_id: str) -> Session | None:
        if session_id is None:
            return None
        return Session.sessions.get(session_id, None)

    @staticmethod
    def info() -> str:
        return "[\n  " + ",\n  ".join([str(s) for s in Session.sessions.values()]) + "\n]"

    def update_state(self):
        self.state = str(uuid.uuid4())

    def export_sqlite(self, export_path: PathLike):
        # Write OCEL
        logger.info(f"Exporting OCEL to '{export_path}' ...")
        self.ocel.write_ocel2_sqlite(export_path)

        # Write app_state
        if self.app_state:
            logger.info(f"Writing app_state ...")
            self.app_state.export_sqlite(export_path)

    def __str__(self):
        d = {
            k: v
            for k, v in {
                "id": self.id,
                "tasks": (
                    ", ".join(
                        [
                            f"{count}x {state}"
                            for state, count in pd.Series(
                                [task.get_state().name for task in self._tasks.values()]
                            )
                            .value_counts()
                            .to_dict()
                            .items()
                        ]
                    )
                    if self._tasks
                    else "---"
                ),
                "ocel": str(self.ocel) if self.ocel else None,
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
