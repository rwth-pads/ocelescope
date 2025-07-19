import importlib
import os
import pkgutil

from fastapi import FastAPI
from fastapi.routing import APIRoute, APIRouter

from api.extensions import OcelExtension, register_extension


# Use direct path-based loading for safety
modules_path = [os.path.join(os.path.dirname(__file__), "modules")]
extensions_path = [os.path.join(os.path.dirname(__file__), "extensions")]


def register_modules(app: FastAPI):
    for _, module_name, _ in pkgutil.iter_modules(modules_path):
        try:
            mod = importlib.import_module(f"modules.{module_name}.module")
        except ModuleNotFoundError as e:
            print(f"Module '{module_name}' skipped: {e}")
            continue
        except Exception as e:
            print(f"Failed to load module '{module_name}': {e}")
            continue

        if hasattr(mod, "router"):
            router: APIRouter = mod.router

            for route in router.routes:
                if isinstance(route, APIRoute):
                    route.operation_id = (
                        f"{module_name}_{route.operation_id or route.name}"
                    )

            meta = getattr(mod, "meta", {})
            prefix = meta.get("prefix", f"/{module_name}")
            tags = meta.get("tags", [module_name])
            app.include_router(mod.router, prefix=prefix, tags=tags)

        if hasattr(mod, "State"):
            setattr(mod, "_module_state", mod.State)

        if hasattr(mod, "meta"):
            setattr(mod, "_module_meta", mod.meta)


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
