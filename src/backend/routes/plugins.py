from typing import Any
from fastapi.routing import APIRouter
from api.dependencies import ApiSession
from api.exceptions import NotFound
from plugins import loaded_plugins
from plugins.base import PluginDescription

plugin_router = APIRouter(prefix="/plugins", tags=["plugins"])


@plugin_router.get("/", operation_id="plugins")
def list_plugins() -> dict[str, PluginDescription]:
    return {id: plugin.describe() for id, plugin in loaded_plugins.items()}


@plugin_router.post("/run/{id}/{method}", operation_id="runPlugin")
def run_plugin(
    id: str,
    method: str,
    input: dict[str, Any],
    input_ocels: dict[str, str],
    session: ApiSession,
) -> str:
    method_map = loaded_plugins[id].get_method_map(id)
    runner = method_map[method]
    if runner is None:
        raise NotFound("Plugin mehtod could not be found")

    input_arg = (
        runner["input_model"](**input) if runner["input_model"] is not None else None
    )

    ocel_kwargs = {a: session.get_ocel(b) for a, b in input_ocels.items()}
    method_kwargs = {
        "input": input_arg,
        **ocel_kwargs,
        "session": session,
        "metadata": {"plugin_id": id, "method_map": method},
    }
    result = runner["method"](**method_kwargs)

    return result
