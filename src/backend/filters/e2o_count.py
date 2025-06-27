from typing import Literal, Optional, cast

import pandas as pd
from pandas.core.series import Series
from pm4py.objects.ocel.obj import OCEL
from filters.base import BaseFilterConfig, FilterResult, register_filter


class E2OCountFilterConfig(BaseFilterConfig):
    type: Literal["e2o_count"]
    source: str
    target: str
    range: tuple[Optional[int], Optional[int]]
    direction: Literal["source", "target"] = "source"


@register_filter(E2OCountFilterConfig)
def filter_by_relation_count(
    ocel: OCEL,
    config: E2OCountFilterConfig,
):
    target_id = (
        ocel.event_id_column if config.direction == "source" else ocel.object_id_column
    )
    target_type_column = (
        ocel.event_activity if config.direction == "source" else ocel.object_type_column
    )

    target_df = ocel.events if config.direction == "source" else ocel.objects

    mask = (ocel.relations[ocel.event_activity] == config.source) & (
        ocel.relations[ocel.object_type_column] == config.target
    )

    filtered_relations = ocel.relations[mask]

    entity_counts = cast(
        Series, filtered_relations.groupby(target_id).size()
    ).reset_index(name="entity_count")

    min_count, max_count = config.range
    min_count = min_count if min_count is not None else 0

    if max_count is not None:
        entity_counts = entity_counts[
            (entity_counts["entity_count"] >= min_count)
            & (entity_counts["entity_count"] <= max_count)
        ]
    else:
        entity_counts = entity_counts[entity_counts["entity_count"] >= min_count]

    is_not_target_type = target_df[target_type_column] != (
        config.source if config.direction == "source" else config.target
    )

    entity_ids = cast(Series, entity_counts[target_id])

    if min_count == 0:
        merged = cast(
            Series,
            pd.merge(
                target_df[target_df[target_type_column] == config.source],
                ocel.relations[
                    (ocel.relations[ocel.event_activity] == config.source)
                    & (ocel.relations[ocel.object_type_column] == config.target)
                ],
                on=target_id,
                how="left",
                indicator=True,
            ),
        )

        entity_with_zero_relations = merged.loc[
            merged["_merge"] == "left_only", target_id
        ]

        entity_ids = pd.concat([entity_ids, entity_with_zero_relations])

    is_in_filtered_ids = target_df[target_id].isin(entity_ids)

    if config.mode == "exclude":
        is_in_filtered_ids = ~is_in_filtered_ids

    final_mask = is_not_target_type | is_in_filtered_ids

    if config.direction == "source":
        return FilterResult(events=final_mask)

    return FilterResult(objects=final_mask)
