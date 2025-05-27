from pydantic.main import BaseModel


class EventTimeInfo(BaseModel):
    start_time: str
    end_time: str
