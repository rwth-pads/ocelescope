from __future__ import annotations


from fastapi.routing import APIRouter


from api.dependencies import ApiSession
from util.tasks import task
from api.model.tasks import TaskSummary

taskRouter = APIRouter(prefix="/tasks", tags=["session"])


@task(dedupe=True)
def count_to_five(task_name: str, session=None, stop_event=None):
    import time

    for i in range(5):
        if stop_event and stop_event.is_set():
            print(f"Hello from task {task_name} for the {i} time")
            return None
        time.sleep(5)

    return f"Task ${task_name} finished"


@taskRouter.get("/", summary="returns all tasks of a session", operation_id="getTasks")
def getTasks(session: ApiSession) -> list[TaskSummary]:
    return session.list_tasks()


@taskRouter.post(
    "/test", summary="returns all tasks of a session", operation_id="testTask"
)
def test(session: ApiSession, taskName: str) -> str:
    count_to_five(taskName, session=session)

    return "Task run"
