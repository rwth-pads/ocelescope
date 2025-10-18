from typing import Literal, Optional

import pandas as pd

from ocelescope.ocel.filter.base import BaseFilter, FilterResult


class TimeFrameFilter(BaseFilter):
    """Filter events in an OCEL based on their timestamp range.

    This filter includes or excludes events whose timestamps fall within
    a specified time interval. The time range can be open-ended by setting
    either boundary to None.

    Attributes:
        time_range (tuple[Optional[str], Optional[str]]):
            The start and end of the time window as ISO 8601 strings.
            Use None for an unbounded start or end.
        mode (Literal["exclude", "include"]):
            Determines whether matching events are kept ("include") or removed
            ("exclude"). Defaults to "include".
    """

    time_range: tuple[Optional[str], Optional[str]]
    mode: Literal["exclude", "include"] = "include"

    def filter(self, ocel):
        start_time, end_time = self.time_range

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
        if self.mode == "exclude":
            mask = ~mask

        return FilterResult(events=mask)
