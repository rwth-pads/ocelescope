from typing import Literal, cast

import pandas as pd

from ocelescope.ocel.filter.base import BaseFilter, FilterResult


class EventTypeFilter(BaseFilter):
    """Filter events in an OCEL based on activity (event type) names.

    This filter allows inclusion or exclusion of events whose activity label
    matches one of the specified `event_types`.

    Attributes:
        event_types (list[str]): List of activity names to include or exclude.
        mode (Literal["exclude", "include"]):
            Determines whether matching events are kept ("include") or removed ("exclude").
    """

    event_types: list[str]
    mode: Literal["exclude", "include"] = "include"

    def filter(self, ocel):
        mask = cast(pd.Series, ocel.events["ocel:activity"].isin(self.event_types))
        if self.mode == "exclude":
            mask = ~mask

        return FilterResult(events=mask)


class ObjectTypeFilter(BaseFilter):
    """Filter objects in an OCEL based on their object type.

    This filter allows inclusion or exclusion of objects whose type
    matches one of the specified `object_types`.

    Attributes:
        object_types (list[str]): List of object types to include or exclude.
        mode (Literal["exclude", "include"]):
            Determines whether matching objects are kept ("include") or removed ("exclude").
    """

    object_types: list[str]
    mode: Literal["exclude", "include"] = "include"

    def filter(self, ocel):
        mask = cast(pd.Series, ocel.objects["ocel:type"].isin(self.object_types))

        if self.mode == "exclude":
            mask = ~mask

        return FilterResult(objects=mask)
