from __future__ import annotations


from fastapi.routing import APIRouter


from api.dependencies import ApiSession
from api.model.tasks import TaskSummary

taskRouter = APIRouter(prefix="/tasks", tags=["session"])


@taskRouter.post("/", summary="returns all tasks of a session", operation_id="getTasks")
def logout(session: ApiSession) -> list[TaskSummary]:
    return session.list_tasks()
