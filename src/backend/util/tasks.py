import inspect
import threading
import functools
from enum import Enum
import uuid

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from api.session import Session


class TaskState(str, Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"


class Task:
    def __init__(self, id, name, fn, args, kwargs, session, metadata=None):
        self.id = id
        self.name = name
        self.fn = fn
        self.args = args
        self.kwargs = kwargs
        self.session = session
        self.metadata = metadata or {}
        self.state = TaskState.PENDING
        self.thread = None
        self.result = None
        self.stop_event = threading.Event()

    def start(self):
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()

    def run(self):
        self.state = TaskState.STARTED
        try:
            sig = inspect.signature(self.fn)
            accepted_params = sig.parameters

            # Include session and stop_event only if explicitly declared
            safe_kwargs = {
                k: v
                for k, v in {
                    **self.kwargs,
                    "session": self.session,
                    "stop_event": self.stop_event,
                }.items()
                if k in accepted_params
            }

            self.result = self.fn(*self.args, **safe_kwargs)
            self.state = TaskState.SUCCESS
        except Exception:
            self.state = TaskState.FAILURE
            raise
        finally:
            self.session.running_tasks.pop(self.id, None)

    def cancel(self):
        self.stop_event.set()
        self.state = TaskState.CANCELLED

    def join(self, timeout=None):
        if self.thread:
            self.thread.join(timeout)


def task(name=None, dedupe=False, run_once=False):
    def decorator(fn):
        task_name = name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args, session: "Session", metadata: dict[str, Any] = {}, **kwargs):
            # Compute a hashable deduplication key
            dedupe_key = (
                task_name
                if run_once
                else (task_name, tuple(args), frozenset(kwargs.items()))
            )

            # Deduplication check
            if dedupe or run_once:
                task_id = session._dedupe_keys.get(dedupe_key)
                if task_id and task_id in session.tasks:
                    print(f"[Task: {task_name}] Skipped (deduplicated)")
                    return task_id

            # Always create a unique task ID
            task_id = str(uuid.uuid4())
            task_obj = Task(
                id=task_id,
                name=task_name,
                fn=fn,
                args=args,
                kwargs=kwargs,
                session=session,
                metadata=metadata,
            )

            # Register task
            session.tasks[task_id] = task_obj
            session.running_tasks[task_id] = task_obj
            if dedupe or run_once:
                session._dedupe_keys[dedupe_key] = task_id

            print(f"[Task: {task_name}] Starting in thread (ID: {task_id})")
            task_obj.start()
            return task_id

        return wrapper

    return decorator
