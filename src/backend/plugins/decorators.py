from typing import Callable, Optional, TypedDict
import functools


class PluginMethodResult(TypedDict):
    ocel_ids: list[str]
    resource_ids: list[str]


def plugin_metadata(name: str, version: str, description: Optional[str] = None):
    def decorator(cls):
        cls._plugin_metadata = {
            "name": name,
            "version": version,
            "description": description,
        }
        return cls

    return decorator


def plugin_method(
    label: Optional[str], description: str = "", tags: Optional[list[str]] = None
):
    def decorator(func: Callable):
        @functools.wraps(func)
        def wrapped(*args, **kwargs):
            kwargs.pop("session", None)
            kwargs.pop("stop_event", None)

            return func(*args, **kwargs)

        setattr(
            wrapped,
            "_plugin_method_metadata",
            {"label": label, "description": description, "tags": tags or []},
        )

        return wrapped

    return decorator
