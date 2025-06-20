from typing import Literal, cast

from pm4py.objects.ocel.obj import OCEL

from lib.filters import BaseFilterConfig, FilterResult, register_filter
import pandas as pd


class ObjectTypeFilterConfig(BaseFilterConfig):
    type: Literal["object_type"]
    object_types: list[str]


@register_filter(ObjectTypeFilterConfig)
def filter_object_type(ocel: OCEL, config: ObjectTypeFilterConfig) -> FilterResult:
    mask = cast(pd.Series, ocel.objects["ocel:type"].isin(config.object_types))
    if config.mode == "exclude":
        mask = ~mask
    return FilterResult(objects=mask)
