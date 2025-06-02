from tempfile import NamedTemporaryFile

from fastapi.responses import FileResponse

from api.model.base import ApiBaseModel


class BaseResponse(ApiBaseModel):
    session: str  # TODO might remove session completely from response (security)
    route: str
    state: str
    status: int = 200
    msg: str | None = None


class TempFileResponse(FileResponse):
    def __init__(
        self, prefix: str | None = None, suffix: str | None = None, **kwargs
    ) -> None:
        self.tmp_file = NamedTemporaryFile(prefix=prefix, suffix=suffix)
        super().__init__(path=self.tmp_file.name, **kwargs)

    @property
    def tmp_path(self):
        return self.tmp_file.name

    def __del__(self):
        self.tmp_file.close()
