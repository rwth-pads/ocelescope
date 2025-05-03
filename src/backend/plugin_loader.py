import importlib
import os
import pkgutil

from fastapi import Depends, FastAPI

from api.session import Session

# Use direct path-based loading for safety
plugins_path = [os.path.join(os.path.dirname(__file__), "plugins")]


def register_plugins(app: FastAPI):
    for _, module_name, _ in pkgutil.iter_modules(plugins_path):
        mod = importlib.import_module(f"plugins.{module_name}.plugin")

        if hasattr(mod, "router"):
            meta = getattr(mod, "meta", {})
            prefix = meta.get("prefix", f"/{module_name}")
            tags = meta.get("tags", [module_name])
            app.include_router(mod.router, prefix=prefix, tags=tags)

        if hasattr(mod, "State"):
            state_class = mod.State
            key = module_name

            def make_dependency(key=key, cls=state_class):
                def _get(session: Session = Depends()):
                    return session.get_plugin_state(key, cls)

                return _get

            for route in mod.router.routes:
                for dep in route.dependant.dependencies:
                    if dep.call == mod.State:
                        dep.call = make_dependency()

            setattr(mod, "_plugin_state", state_class)

        if hasattr(mod, "meta"):
            setattr(mod, "_plugin_meta", mod.meta)


def init_plugin_states(session: Session):
    for _, module_name, _ in pkgutil.iter_modules(plugins_path):
        mod = importlib.import_module(f"plugins.{module_name}.plugin")
        if hasattr(mod, "_plugin_state"):
            cls = getattr(mod, "_plugin_state")
            session.set_plugin_state(module_name, cls())  # Call constructor
