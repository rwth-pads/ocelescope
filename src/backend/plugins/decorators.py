from typing import Callable, Optional


def plugin_metadata(name: str, version: str, description: Optional[str] = None):
    def decorator(cls):
        cls._plugin_metadata = {
            "name": name,
            "version": version,
            "description": description,
        }
        return cls

    return decorator


def plugin_method(description: str = "", tags: Optional[list[str]] = None):
    def decorator(func: Callable):
        setattr(
            func,
            "_plugin_method_metadata",
            {"description": description, "tags": tags or []},
        )

        return func

    return decorator
