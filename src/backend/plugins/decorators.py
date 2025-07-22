from typing import Callable, Optional, TypedDict, cast
import functools


from api.session import Session
from ocel.ocel_wrapper import OCELWrapper
from resources import ResourceBase, ResourceUnion


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
            # Pop internal args injected by system/task manager
            session: Optional[Session] = kwargs.pop("session", None)
            kwargs.pop("stop_event", None)

            result = func(*args, **kwargs)

            injected_entities: PluginMethodResult = {"ocel_ids": [], "resource_ids": []}
            if session is not None:
                result_items = result if isinstance(result, (list, tuple)) else [result]
                for result in result_items:
                    if isinstance(result, OCELWrapper):
                        injected_entities["ocel_ids"].append(session.add_ocel(result))
                    if isinstance(result, ResourceBase):
                        injected_entities["resource_ids"].append(
                            session.add_resource(
                                entity=cast(ResourceUnion, result), source="plugin"
                            ).id
                        )

            return result

        setattr(
            wrapped,
            "_plugin_method_metadata",
            {label: label, "description": description, "tags": tags or []},
        )

        return wrapped

    return decorator
