from typing import Optional, cast
import pm4py
from pm4py.objects.ocel.obj import OCEL
import pandas as pd

from filters.base import FILTER_REGISTRY, FilterResult
from filters.config_union import FilterConfig


def compute_combined_masks(ocel: OCEL, filters: list[FilterConfig]) -> FilterResult:
    combined = FilterResult(
        events=pd.Series(True, index=ocel.events.index),
        objects=pd.Series(True, index=ocel.objects.index),
    )

    for config in filters:
        handler = FILTER_REGISTRY.get(type(config))
        if handler is None:
            raise ValueError(f"No filter registered for config type {type(config)}")
        result = handler(ocel, config)
        combined = combined.and_merge(result)

    return combined


def apply_filters(ocel: OCEL, filters: list[FilterConfig]) -> OCEL:
    masks = compute_combined_masks(ocel, filters)

    filtered_event_ids: Optional[pd.Series] = (
        cast(pd.Series, ocel.events[ocel.event_id_column][masks.events])
        if masks.events is not None
        else None
    )

    filtered_object_ids: Optional[pd.Series] = (
        cast(pd.Series, ocel.objects[ocel.object_id_column][masks.objects])
        if masks.objects is not None
        else None
    )
    if filtered_event_ids is not None:
        ocel = pm4py.filter_ocel_events(ocel, filtered_event_ids, positive=True)

    if filtered_object_ids is not None:
        ocel = pm4py.filter_ocel_objects(ocel, filtered_object_ids, positive=True)

    return ocel
