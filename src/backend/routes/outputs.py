from __future__ import annotations


from fastapi.routing import APIRouter
from api.dependencies import ApiSession
from outputs.base import OutputApi
from outputs import output_registry


output_router = APIRouter(prefix="/outputs", tags=["outputs"])


@output_router.get(path="/", operation_id="outputs")
def get_outputs(session: ApiSession) -> list[OutputApi]:
    return [
        OutputApi(
            **output.model_dump(),
            type_label=output_registry.outputs[output.output.type].label,
        )
        for output in session.list_outputs()
    ]
