from typing import Any
from fastapi.routing import APIRouter
from api.dependencies import ApiSession
from api.exceptions import NotFound
from plugins import plugin_registry
from plugins.base import PluginDescription

plugin_router = APIRouter(prefix="/plugins", tags=["plugins"])


@plugin_router.get("/", operation_id="plugins")
def list_plugins() -> list[PluginDescription]:
    return [plugin.describe() for plugin in plugin_registry.all_plugins().values()]


@plugin_router.post("/run/{name}/{version}/{method}", operation_id="runPlugin")
def run_plugin(
    name: str,
    version: str,
    method: str,
    input: dict[str, Any],
    input_ocels: dict[str, str],
    session: ApiSession,
) -> str:
    # TODO: Make better task plugin interactions
    method_map = plugin_registry.get_plugin(name=name, version=version).get_method_map(
        f"{name}_{version}"
    )
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
        "metadata": {
            "type": "plugin",
            "name": name,
            "version": version,
            "method": method,
        },
    }
    result = runner["method"](**method_kwargs)

    return result
