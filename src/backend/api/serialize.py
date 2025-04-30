from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

import pandas as pd

from api.model.base import ApiBaseModel
from api.model.with_ocel import ModelWithOcel
from util.pandas import series_to_nested_dict

if TYPE_CHECKING:
    from api.session import Session
    from ocel.ocel_wrapper import OCELWrapper


class OcelData(ModelWithOcel):
    meta: dict[str, Any]  # TODO meta to Model
    num_events: int
    num_objects: int
    activities: set[str]
    activity_counts: dict[str, int]
    object_types: set[str]
    object_type_counts: dict[str, int]
    # auto_hu_object_types: set[str]
    # auto_resource_object_types: set[str]
    median_num_events_per_object_type: dict[str, float]
    e2o_counts: dict[str, dict[str, int]]
    e2o_qualifier_counts: dict[str, dict[str, dict[str, int]]]
    attributes: list[dict[str, Any]]  # TODO OCELAttribute to Model


def ocel_to_api(
    ocel: OCELWrapper,
    session: Session | None = None,
) -> OcelData:
    """
    Returns serialized basic OCEL information and metadata, to be passed via the API.
    """
    return OcelData.instantiate(
        dict(
            meta=ocel.meta,
            num_events=len(ocel.events),
            num_objects=len(ocel.objects),
            object_types=set(ocel.otypes),
            object_type_counts=ocel.otype_counts.to_dict(),
            # auto_hu_object_types=set(ocel.auto_hu_otypes),
            # auto_resource_object_types=set(ocel.auto_resource_otypes),
            median_num_events_per_object_type=ocel.median_num_events_per_otype.to_dict(),
            activities=set(ocel.activities),
            activity_counts=ocel.activity_counts.to_dict(),
            e2o_counts={
                act: ocel.type_relation_frequencies.xs(act).to_dict()
                for act in ocel.activities
            },
            e2o_qualifier_counts=series_to_nested_dict(
                ocel.qualifier_frequencies.set_index(
                    ["ocel:activity", "ocel:type", "ocel:qualifier"]
                )["freq"]
            ),
            attributes=[attr.to_api() for attr in ocel.attributes],
        ),
        ocel=ocel,
    )
