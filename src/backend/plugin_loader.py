import importlib
import os
import pkgutil

from fastapi import FastAPI


# Use direct path-based loading for safety
plugins_path = [os.path.join(os.path.dirname(__file__), "plugins")]


def register_plugins(app: FastAPI):
    for _, module_name, _ in pkgutil.iter_modules(plugins_path):
        try:
            mod = importlib.import_module(f"plugins.{module_name}.plugin")
        except ModuleNotFoundError as e:
            # Skip if plugin.py does not exist
            print(f"Plugin '{module_name}' skipped: {e}")
            continue
        except Exception as e:
            # Catch other unexpected import errors
            print(f"Failed to load plugin '{module_name}': {e}")
            continue

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
