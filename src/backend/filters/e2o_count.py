from typing import Literal, Optional, cast

from pandas.core.series import Series
from pm4py.objects.ocel.obj import OCEL
from filters.base import BaseFilterConfig, FilterResult, register_filter


class E2OCountFilterConfig(BaseFilterConfig):
    type: Literal["e2o_count"]
    object_type: str
    event_type: str
    min: int
    max: Optional[int] = None


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

    entity_counts = cast(
        Series, filtered_relations.groupby(target_id).size()
    ).reset_index(name="entity_count")

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

    is_in_filtered_ids = target_df[target_id].isin(
        cast(Series, entity_counts[target_id])
    )

    if config.mode == "exclude":
        is_in_filtered_ids = ~is_in_filtered_ids

    final_mask = is_not_target_type | is_in_filtered_ids

    if target == "event":
        return FilterResult(events=final_mask)

    return FilterResult(objects=final_mask)
