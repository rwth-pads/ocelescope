from fastapi import UploadFile, File, HTTPException
from api.dependencies import ApiSession
from fastapi.routing import APIRouter
from plugin.plugin_registry import PluginRegistry, PluginSummary


plugin_router = APIRouter(prefix="/plugin", tags=["plugin"])
registry = PluginRegistry()


@plugin_router.get("/")
def list_plugins() -> list[PluginSummary]:
    return registry.list_plugins()


@plugin_router.post("/{plugin_id}/run")
def run_plugin(plugin_id: str, session: ApiSession, inputs: dict):
    try:
        return registry.run_plugin(plugin_id, inputs, session=session)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@plugin_router.post("/")
async def upload_plugin(zip_file: UploadFile = File(...)):
    try:
        plugin_ids = registry.load_plugins_from_zip(zip_file.file)
        return {"loaded_plugins": plugin_ids}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
