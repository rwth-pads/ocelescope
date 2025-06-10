from __future__ import annotations
from typing import Optional


from fastapi.routing import APIRouter


from api.dependencies import ApiSession
from api.exceptions import NotFound
from api.model.tasks import TaskSummary

taskRouter = APIRouter(prefix="/tasks", tags=["session"])


@taskRouter.get("/", summary="returns all tasks of a session", operation_id="getTasks")
def getTasks(session: ApiSession) -> list[TaskSummary]:
    return session.list_tasks()


@taskRouter.get(
    "/task", summary="returns the task of a given taskId", operation_id="getTask"
)
def getTask(session: ApiSession, task_id: str) -> TaskSummary:
    task = session.get_task(task_id)
    if task is None:
        raise NotFound("Session not found")
    return TaskSummary(
        key=task.id,
        name=task.name,
        state=task.state,
        has_result=task.result is not None,
        metadata=task.metadata,
    )
