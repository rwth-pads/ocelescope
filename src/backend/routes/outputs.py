from __future__ import annotations


from fastapi.routing import APIRouter
from api.dependencies import ApiSession
from outputs.base import OutputApi
from outputs import output_registry
from outputs.vizualizations import Visualization


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


@output_router.get(path="/{output_id}", operation_id="output")
def get_output(session: ApiSession, output_id: str) -> Visualization:
    output = session.get_output(output_id)

    return output_registry.visualize(output=output.output)
