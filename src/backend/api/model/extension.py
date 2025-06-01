from pydantic.main import BaseModel


class ExtensionMetadata(BaseModel):
    name: str
    version: str
    description: str
    acceptedExtensions: list[str]
