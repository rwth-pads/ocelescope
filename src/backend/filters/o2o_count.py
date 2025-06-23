from typing import Literal, Optional, cast

from pandas.core.series import Series
from filters.base import BaseFilterConfig, FilterResult, register_filter


from lib.relations import getO2OWithTypes


class O2OCountFilterConfig(BaseFilterConfig):
    type: Literal["o2o_count"]
    source: str
    target: str
    min: int
    max: Optional[int] = None
    direction: Literal["source", "target"] = "source"


@register_filter(O2OCountFilterConfig)
def filter_objects_by_relation_counts(
    ocel,
    config: O2OCountFilterConfig,
) -> FilterResult:
    # Get o2o with types if not provided
    relation_table = getO2OWithTypes(ocel)

    target = config.direction
    source = "target" if config.direction == "source" else "source"

    target_type_col = f"{target}_type"
    source_type_col = f"{source}_type"

    # Filter based on source and target types
    mask = (relation_table[source_type_col] == config.source) & (
        relation_table[target_type_col] == config.target
    )
    filtered_o2o = relation_table[mask]

    # Count how many times each target appears
    entity_counts = cast(Series, filtered_o2o.groupby(target).size()).reset_index(
        name="entity_count"
    )

    # Filter based on count thresholds
    if config.max is not None:
        entity_counts = entity_counts[
            (entity_counts["entity_count"] >= config.min)
            & (entity_counts["entity_count"] <= config.max)
        ]
    else:
        entity_counts = entity_counts[entity_counts["entity_count"] >= config.min]

    # Mask for non-target-type objects (always kept)
    is_not_target_type = ocel.objects[ocel.object_type_column] != config.target

    # Mask for objects meeting the relation count condition
    is_in_filtered_ids = ocel.objects[ocel.object_id_column].isin(entity_counts[target])

    # Invert if in exclude mode
    if config.mode == "exclude":
        is_in_filtered_ids = ~is_in_filtered_ids

    # Final mask: keep non-target-type or qualifying objects
    final_mask = cast(Series, is_not_target_type | is_in_filtered_ids)

    return FilterResult(objects=final_mask)
