import importlib
import os
import pkgutil
from typing import Annotated, Type, TypeVar, cast

from fastapi import Depends, FastAPI

from api.dependencies import ApiSession

# Use direct path-based loading for safety
plugins_path = [os.path.join(os.path.dirname(__file__), "plugins")]


def register_plugins(app: FastAPI):
    for _, module_name, _ in pkgutil.iter_modules(plugins_path):
        mod = importlib.import_module(f"plugins.{module_name}.plugin")

        # Register plugin router
        if hasattr(mod, "router"):
            meta = getattr(mod, "meta", {})
            prefix = meta.get("prefix", f"/{module_name}")
            tags = meta.get("tags", [module_name])
            app.include_router(mod.router, prefix=prefix, tags=tags)

        # Register plugin state class for session-based caching
        if hasattr(mod, "State"):
            setattr(mod, "_plugin_state", mod.State)

        # Store plugin metadata for inspection (optional)
        if hasattr(mod, "meta"):
            setattr(mod, "_plugin_meta", mod.meta)


T = TypeVar("T")
AnnotatedDep = Annotated[T, Depends]  # This is mostly for clarity


def makeDependency(state_type: Type[T]):
    def get_state(session: "ApiSession") -> T:
        return session.get_plugin_state("ocelot", state_type)

    return cast(Annotated[T, Depends], Annotated[state_type, Depends(get_state)])
