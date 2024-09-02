from typing import Generic, TypeVar

from api.model.base import ApiBaseModel
from api.model.response import BaseResponse
from api.task_base import TaskState

ResponseT = TypeVar("ResponseT", bound=BaseResponse)


class TaskResponse(ApiBaseModel, Generic[ResponseT]):
    id: str
    route: str
    task_state: TaskState
    percentage: float | None = None
    msg: str | None = None
    result: ResponseT | None = None


class TaskStatusResponse(BaseResponse, Generic[ResponseT]):
    task: TaskResponse[ResponseT]


LaunchTaskResponse = TaskStatusResponse[ResponseT] | ResponseT
