import importlib
import os
import pkgutil

from fastapi import FastAPI

from api.extensions import OcelExtension, register_extension


# Use direct path-based loading for safety
plugins_path = [os.path.join(os.path.dirname(__file__), "plugins")]
extensions_path = [os.path.join(os.path.dirname(__file__), "extensions")]


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


def register_extensions():
    for _, module_name, _ in pkgutil.iter_modules(extensions_path):
        try:
            # Attempt to load the extension module
            mod = importlib.import_module(f"extensions.{module_name}.extension")
        except ModuleNotFoundError as e:
            print(f"Extension '{module_name}' skipped: {e}")
            continue
        except Exception as e:
            print(f"Failed to load extension '{module_name}': {e}")
            continue

        # Find OcelExtension subclasses and register them
        for attr_name in dir(mod):
            attr = getattr(mod, attr_name)
            if (
                isinstance(attr, type)
                and issubclass(attr, OcelExtension)
                and attr is not OcelExtension
            ):
                try:
                    register_extension(attr)
                    print(f"Registered extension: {attr.name}")
                except Exception as e:
                    print(f"Error registering extension '{attr.__name__}': {e}")
