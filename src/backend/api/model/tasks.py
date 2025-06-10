from typing import Any, Generic, Optional, TypeVar
from pydantic.main import BaseModel

from util.tasks import TaskState


T = TypeVar("T")


class TaskSummary(BaseModel):
    key: str
    name: str
    state: TaskState
    has_result: bool
    metadata: dict[str, Any]


class TaskResponse(BaseModel, Generic[T]):
    status: TaskState
    taskId: Optional[str] = None
    result: Optional[T] = None
    error: Optional[str] = None
