import sys
import importlib
from pathlib import Path
from types import ModuleType
from uuid import uuid4
from .base import BasePlugin

loaded_plugins: dict[str, BasePlugin] = {}


def load_plugins_from_folder(folder: Path):
    """Dynamically load all plugins from subfolders inside `folder`."""
    if str(folder) not in sys.path:
        sys.path.insert(0, str(folder))

    for pkg in folder.iterdir():
        if not pkg.is_dir() or not (pkg / "plugin.py").exists():
            continue

        module_name = f"{pkg.name}.plugin"

        try:
            module = importlib.import_module(module_name)
            _register_plugins_from_module(module)
        except Exception as e:
            print(f"Error loading plugin from {pkg.name}: {e}")


def _register_plugins_from_module(module: ModuleType):
    """Find and instantiate all subclasses of BasePlugin in a module."""
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if (
            isinstance(attr, type)
            and issubclass(attr, BasePlugin)
            and attr is not BasePlugin
        ):
            instance = attr()
            loaded_plugins[str(uuid4())] = instance
