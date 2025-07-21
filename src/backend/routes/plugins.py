from fastapi.routing import APIRouter
from plugins import loaded_plugins

plugin_router = APIRouter(prefix="/plugins", tags=["plugins"])


@plugin_router.get("/")
def list_plugins():
    return [plugin.describe() for plugin in loaded_plugins]
