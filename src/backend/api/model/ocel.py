from pydantic.main import BaseModel


class OCEL_Metadata(BaseModel):
    id: str
    name: str
    created_at: str
