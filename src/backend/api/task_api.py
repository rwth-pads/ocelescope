from __future__ import annotations

import functools
import threading
import uuid
from typing import TYPE_CHECKING, Any, Callable, Generic, Iterable

from api.config import config
from api.logger import logger
from api.model.task import ResponseT, TaskResponse, TaskStatusResponse
from api.task_base import SubTask, Task, TaskState, send_iter_progress, send_progress

if TYPE_CHECKING:
    from api.session import Session
    from ocel.ocel_wrapper import OCELWrapper


class MainTask(Task, Generic[ResponseT]):
    def __init__(
        self,
        session: Session,
        target: Callable[..., ResponseT],
        route: str,
        args: tuple,
        kwargs: dict,
    ):
        id = str(uuid.uuid4())
        name = target.__name__
        super().__init__(id=id, name=name)
        self.session = session
        self.session._tasks[self.id] = self

        self.route = route
        self._target = target
        self._args = args
        self._kwargs = kwargs
        self._thread = threading.Thread(target=self._run)
        self._state = TaskState.PENDING
        self._percentage = 0
        self._msg = None
        self._result: ResponseT | None = None
        self._lock = threading.Lock()

    def _run(self):
        with self._lock:
            self._state = TaskState.STARTED

        try:
            result = self._target(self, self.session, *self._args, **self._kwargs)
            with self._lock:
                self._state = TaskState.SUCCESS
                self._result = result
        except Exception as exc:
            with self._lock:
                self._state = TaskState.FAILURE
                self._msg = str(exc) if config.EXPOSE_ERROR_DETAILS else "Internal Server Error"
            logger.error(f'Task "{self.name}/#{self.id}" failed: {exc}')
            raise exc  # TODO dev only

    def start(self):
        self._thread.start()

    def join(self, timeout: float | None = None):
        self._thread.join(timeout=timeout)

    def is_alive(self):
        return self._thread.is_alive()

    def update(
        self,
        percentage: float | None = None,
        msg: str | None = None,
        subtask: SubTask | None = None,
    ):
        """Assigns a progress percentage and/or a message to the task object. Sets the state to PROGRESS."""
        with self._lock:
            super().update(percentage=percentage, msg=msg, subtask=subtask)
            self._state = TaskState.PROGRESS
            if percentage is not None:
                self._percentage = percentage
            if msg is not None:
                self._msg = msg

    def _progress(
        self,
        msg: str | None = None,
        p: float | None = None,
        subtask: SubTask | None = None,
    ):
        send_progress(self, msg=msg, p=p, subtask=subtask)

    def _iter_progress(
        self,
        it: Iterable,
        msg: str | None = None,
        step: int | None = None,
        start: float = 0,
        end: float = 1,
        total: int | None = None,
        subtask: SubTask | None = None,
    ):
        return send_iter_progress(
            self,
            it,
            msg=msg,
            step=step,
            start=start,
            end=end,
            total=total,
            subtask=subtask,
        )

    def reset(self):
        summary = super().reset()
        self.update(percentage=0, msg="Resetting task")
        return summary

    def get_percentage(self):
        with self._lock:
            return self._percentage

    def get_state(self):
        with self._lock:
            return self._state

    def get_msg(self):
        with self._lock:
            return self._msg

    def ready(self):
        return self.get_state() == TaskState.SUCCESS

    def get_result(self) -> ResponseT | None:
        with self._lock:
            return self._result

    def respond_with_result(
        self, msg: str | None = None, status: int = 200, **data
    ) -> dict[str, Any]:
        """Builds the API response for the next task-status call after the task has finished."""
        return self.session.respond(task=self, include_task=False, status=status, msg=msg, **data)

    def serialize(self) -> TaskResponse[ResponseT]:
        """Serializes an ApiTask to send progress state via the API"""
        with self._lock:
            res: dict[str, Any] = {
                "id": self.id,
                "route": self.route,
                "task_state": self._state.name,
            }

            if self._msg is not None:
                res["msg"] = self._msg

            if self._state == TaskState.PENDING:
                default_msg = "Pending"
            elif (
                self._state == TaskState.STARTED
                or self._state == TaskState.PROGRESS
                or self._state == TaskState.RETRY
            ):
                res["percentage"] = self._percentage  # type: ignore
                default_msg = "Running"
            elif self._state == TaskState.FAILURE:
                res["result"] = self._result
                default_msg = "Failure"
            elif self._state == TaskState.SUCCESS:
                res["result"] = self._result
                default_msg = "Finished"
            else:
                raise ValueError(f"Unknown task state '{self._state}', failed to serialize.")

            if default_msg is not None and "msg" not in res:
                res["msg"] = default_msg

            return TaskResponse(**res)

    def export(self, ocel: OCELWrapper, pex_params: dict[str, Any] | None = None):
        """Export Task data to JSON for file logging"""
        raise NotImplementedError()


def task(route: str):
    """Decorator to define tasks. When calling a function decorated with this, a new thread is started, and a Task object returned."""

    def decorator(func: Callable[..., ResponseT]):
        @functools.wraps(func)
        def wrapper(session: Session, *args, is_cached: bool = False, **kwargs):
            # Create and start the task
            task = MainTask(session=session, target=func, route=route, args=args, kwargs=kwargs)
            task.start()

            if is_cached:
                # It is expected that the task finishes very quickly
                # Make the thread blocking, waiting for the task to be finished
                task.join(timeout=config.CACHED_TASK_TIMEOUT)
                if not task.is_alive():
                    # task has finished within the timeout
                    # Respond as if no task had been used

                    # result: dict = copy(task._result)
                    # result.pop("route")
                    # msg = result.pop("msg", None)
                    # status = result.pop("status", 200)
                    if result := task.get_result():
                        return result
                    raise ValueError("Task finished without a result.")
                    # return session.respond(route=route, msg=msg, status=status, **result)

            return TaskStatusResponse[ResponseT](**session.respond(route=route, task=task))

        # TODO remove this, functools.wraps should take care of this
        # get the original signature
        # signature = inspect.signature(func)
        # parameters = list(signature.parameters.values())
        # # create a new signature, removing the first parameter for outside view (task: Task)
        # # -> (session: Session, *args, **kwargs), but args and kwargs as specified in func.
        # if parameters:
        #     # parameters[0] = parameters[0].replace(name="session", annotation=Session)
        #     object.__setattr__(wrapper, "__signature__", signature.replace(parameters=parameters[1:]))
        #     # object.__setattr__(wrapper, "__signature__", signature.replace(parameters=parameters[1:], return_annotation=ApiTask))

        return wrapper

    return decorator
