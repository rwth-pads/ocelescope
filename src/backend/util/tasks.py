import threading
import functools
from enum import Enum


class TaskState(str, Enum):
    PENDING = "PENDING"
    STARTED = "STARTED"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"


class Task:
    def __init__(self, name, fn, args, kwargs, session):
        self.name = name
        self.fn = fn
        self.args = args
        self.kwargs = kwargs
        self.session = session
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
            result = self.fn(
                *self.args,
                session=self.session,
                stop_event=self.stop_event,
                **self.kwargs,
            )
            self.state = TaskState.SUCCESS
            self.result = result
        except Exception:
            self.state = TaskState.FAILURE
            raise
        finally:
            self.session._running_tasks.pop(self.key, None)

    def cancel(self):
        self.stop_event.set()
        self.state = TaskState.CANCELLED

    def join(self, timeout=None):
        if self.thread:
            self.thread.join(timeout)

    @property
    def key(self):
        return self.name


def task(name=None, dedupe=False, run_once=False):
    def decorator(fn):
        task_name = name or fn.__name__

        @functools.wraps(fn)
        def wrapper(*args, session=None, **kwargs):
            if session is None:
                raise ValueError("Task functions must be called with a session.")

            registry = session._tasks
            running = session._running_tasks

            key = (
                task_name
                if run_once
                else (task_name, tuple(args), frozenset(kwargs.items()))
            )

            if dedupe or run_once:
                if key in registry:
                    print(f"[Task: {task_name}] Skipped (deduplicated)")
                    return

            task_obj = Task(
                name=task_name, fn=fn, args=args, kwargs=kwargs, session=session
            )
            registry[key] = task_obj
            running[key] = task_obj
            print(f"[Task: {task_name}] Starting in thread")
            task_obj.start()

        return wrapper

    return decorator
