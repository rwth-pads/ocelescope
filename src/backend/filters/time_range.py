from typing import Literal, Optional

from pm4py.objects.ocel.obj import OCEL
from filters.base import BaseFilterConfig, FilterResult, register_filter
import pandas as pd


class TimeFrameFilterConfig(BaseFilterConfig):
    type: Literal["time_frame"]
    time_range: tuple[Optional[str], Optional[str]]


@register_filter(TimeFrameFilterConfig)
def filter_by_time_range(
    ocel: OCEL,
    config: TimeFrameFilterConfig,
):
    start_time, end_time = config.time_range

    if start_time is not None:
        start_time = pd.Timestamp(start_time, tz="UTC")
    if end_time is not None:
        end_time = pd.Timestamp(end_time, tz="UTC")

    events_df = ocel.events

    mask = pd.Series([True] * len(events_df), index=events_df.index)
    if start_time is not None:
        mask &= events_df["ocel:timestamp"] >= start_time
    if end_time is not None:
        mask &= events_df["ocel:timestamp"] <= end_time
    if config.mode == "exclude":
        mask = ~mask

    return FilterResult(events=mask)
