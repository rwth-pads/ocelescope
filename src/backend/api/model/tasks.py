from pydantic.main import BaseModel

from util.tasks import TaskState


class TaskSummary(BaseModel):
    key: str
    state: TaskState
    has_result: bool
