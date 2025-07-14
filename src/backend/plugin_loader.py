import importlib
import os
import pkgutil

from api.extensions import OcelExtension, register_extension


# Use direct path-based loading for safety
plugins_path = [os.path.join(os.path.dirname(__file__), "plugins")]
extensions_path = [os.path.join(os.path.dirname(__file__), "extensions")]


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
