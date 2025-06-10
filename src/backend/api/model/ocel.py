from pydantic.main import BaseModel


class OCEL_Metadata(BaseModel):
    id: str
    name: str
    created_at: str
    extensions: list[str]


class Uploading_OCEL_Metadata(BaseModel):
    name: str
    task_id: str
    uploaded_at: str
