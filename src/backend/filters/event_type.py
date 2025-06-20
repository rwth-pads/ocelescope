from typing import Literal, cast
from pydantic import Field
from pm4py.objects.ocel.obj import OCEL
from .base import BaseFilterConfig, FilterResult, register_filter
import pandas as pd


class EventTypeFilterConfig(BaseFilterConfig):
    type: Literal["event_type"]
    event_types: list[str] = Field(default_factory=list)


@register_filter(EventTypeFilterConfig)
def filter_event_type(ocel: OCEL, config: EventTypeFilterConfig) -> FilterResult:
    mask = cast(pd.Series, ocel.events["ocel:activity"].isin(config.event_types))
    if config.mode == "exclude":
        mask = ~mask

    return FilterResult(events=mask)
