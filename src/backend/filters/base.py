from typing import Callable, Dict, Type, TypeVar, cast
from dataclasses import dataclass
from typing import Optional, Literal
from pm4py.objects.ocel.obj import OCEL
import pandas as pd
from pydantic import BaseModel


class BaseFilterConfig(BaseModel):
    mode: Optional[Literal["include", "exclude"]] = "include"


F = TypeVar("F", bound=BaseFilterConfig)


@dataclass
class FilterResult:
    events: Optional[pd.Series] = None
    objects: Optional[pd.Series] = None

    def and_merge(self, other: "FilterResult") -> "FilterResult":
        def _and(a, b):
            if a is not None and b is not None:
                return a & b
            elif a is not None:
                return a
            elif b is not None:
                return b
            else:
                return None

        return FilterResult(
            events=_and(self.events, other.events),
            objects=_and(self.objects, other.objects),
        )


FILTER_REGISTRY: Dict[
    Type[BaseFilterConfig], Callable[[OCEL, BaseFilterConfig], FilterResult]
] = {}


def register_filter(config_cls: Type[F]):
    def decorator(func: Callable[[OCEL, F], FilterResult]):
        FILTER_REGISTRY[config_cls] = cast(
            Callable[[OCEL, BaseFilterConfig], FilterResult], func
        )
        return func

    return decorator
