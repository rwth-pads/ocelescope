from __future__ import annotations

from dataclasses import dataclass
from typing import (
    Annotated,
    Callable,
    Dict,
    Literal,
    Optional,
    Type,
    TypeVar,
    Union,
    cast,
)

import pandas as pd
import pm4py
from pm4py.objects.ocel.obj import OCEL
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------------------------------
# Filter config classes


class BaseFilterConfig(BaseModel):
    mode: Optional[Literal["include", "exclude"]] = "include"


class EventTypeFilterConfig(BaseFilterConfig):
    type: Literal["event_type"]
    event_types: list[str]


class ObjectTypeFilterConfig(BaseFilterConfig):
    type: Literal["object_type"]
    object_types: list[str]


class TimeFrameFilterConfig(BaseFilterConfig):
    type: Literal["time_frame"]
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class E2OCountFilterConfig(BaseFilterConfig):
    type: Literal["e2o_count"]
    object_type: str
    event_type: str
    min: int
    max: Optional[int] = None


FilterConfig = Annotated[
    Union[
        EventTypeFilterConfig,
        ObjectTypeFilterConfig,
        TimeFrameFilterConfig,
        E2OCountFilterConfig,
    ],
    Field(discriminator="type"),
]

# --------------------------------------------------------------------------------------------------
# Filter result container


@dataclass
class FilterResult:
    events: Optional[pd.Series] = None
    objects: Optional[pd.Series] = None
    e2o: Optional[pd.Series] = None
    o2o: Optional[pd.Series] = None

    def and_merge(self, other: FilterResult) -> FilterResult:
        return FilterResult(
            events=self._and(self.events, other.events),
            objects=self._and(self.objects, other.objects),
            e2o=self._and(self.e2o, other.e2o),
            o2o=self._and(self.o2o, other.o2o),
        )

    @staticmethod
    def _and(a: Optional[pd.Series], b: Optional[pd.Series]) -> Optional[pd.Series]:
        if a is None:
            return b
        if b is None:
            return a
        return a & b


# --------------------------------------------------------------------------------------------------
# Filter registry and decorator

F = TypeVar("F", bound=BaseFilterConfig)

FILTER_REGISTRY: Dict[
    Type[BaseFilterConfig], Callable[[OCEL, BaseFilterConfig], FilterResult]
] = {}


def register_filter(config_cls: Type[F]):
    def decorator(func: Callable[[OCEL, F], FilterResult]):
        # Cast needed for Pyright compatibility
        FILTER_REGISTRY[config_cls] = cast(
            Callable[[OCEL, BaseFilterConfig], FilterResult], func
        )
        return func

    return decorator


# --------------------------------------------------------------------------------------------------
# Example filter implementations


@register_filter(EventTypeFilterConfig)
def filter_event_type(ocel: OCEL, config: EventTypeFilterConfig) -> FilterResult:
    mask = ocel.events["ocel:activity"].isin(config.event_types)
    if config.mode == "exclude":
        mask = ~mask
    return FilterResult(events=mask)


@register_filter(ObjectTypeFilterConfig)
def filter_object_type(ocel: OCEL, config: ObjectTypeFilterConfig) -> FilterResult:
    mask = ocel.objects["ocel:type"].isin(config.object_types)
    if config.mode == "exclude":
        mask = ~mask
    return FilterResult(objects=mask)


@register_filter(TimeFrameFilterConfig)
def filter_by_time_range(
    ocel: OCEL,
    config: TimeFrameFilterConfig,
):
    start_time = config.start_time
    end_time = config.end_time

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


@register_filter(E2OCountFilterConfig)
def filter_by_e2o_counts(ocel: OCEL, config: E2OCountFilterConfig, target="event"):
    target_id = ocel.event_id_column if target == "event" else ocel.object_id_column
    target_type_column = (
        ocel.event_activity if target == "event" else ocel.object_type_column
    )

    target_df = ocel.events if target == "event" else ocel.objects

    mask = (ocel.relations[ocel.event_activity] == config.event_type) & (
        ocel.relations[ocel.object_type_column] == config.object_type
    )

    filtered_relations = ocel.relations[mask]

    entity_counts = (
        filtered_relations.groupby(target_id).size().reset_index(name="entity_count")
    )

    if config.max is not None:
        entity_counts = entity_counts[
            (entity_counts["entity_count"] >= config.min)
            & (entity_counts["entity_count"] <= config.max)
        ]
    else:
        entity_counts = entity_counts[entity_counts["entity_count"] >= config.min]

    is_not_target_type = target_df[target_type_column] != (
        config.event_type if target == "event" else config.object_type
    )
    is_in_filtered_ids = target_df[target_id].isin(entity_counts[target_id])

    if config.mode == "exclude":
        is_in_filtered_ids = ~is_in_filtered_ids

    final_mask = is_not_target_type | is_in_filtered_ids

    if target == "event":
        return FilterResult(events=final_mask)

    return FilterResult(objects=final_mask)


# --------------------------------------------------------------------------------------------------
# Filter combination


def compute_combined_masks(ocel: OCEL, filters: list[FilterConfig]) -> FilterResult:
    combined = FilterResult(
        events=pd.Series(True, index=ocel.events.index),
        objects=pd.Series(True, index=ocel.objects.index),
        e2o=pd.Series(True, index=ocel.relations.index),
        o2o=pd.Series(True, index=ocel.o2o.index),
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

    filtered_event_ids = (
        ocel.events[ocel.event_id_column][masks.events]
        if masks.events is not None
        else None
    )
    filtered_object_ids = (
        ocel.objects[ocel.object_id_column][masks.objects]
        if masks.objects is not None
        else None
    )
    if masks.events is not None:
        ocel = pm4py.filter_ocel_events(ocel, filtered_event_ids, positive=True)

    if masks.objects is not None:
        ocel = pm4py.filter_ocel_objects(ocel, filtered_object_ids, positive=True)

    return ocel
