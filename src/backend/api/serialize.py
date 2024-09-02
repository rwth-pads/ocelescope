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
                act: ocel.type_relation_frequencies.xs(act).to_dict() for act in ocel.activities
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


class OcelObject(ApiBaseModel):
    id: str
    type: str
    attr: dict[str, Any]


def objects_to_api(
    objects: pd.DataFrame,
    include_empty_attrs: bool = False,
    include_empty_values: bool = False,
) -> list[OcelObject]:
    """
    Serializes an object DataFrame to a dict, to be passed via the API as json.
    Only includes the attribute values that are contained in the DataFrame.
    Dynamic (time-variant) attributes are not added. (To include them, first process object_changes at a specified point in time.)
    """
    attrs = [col for col in list(objects.columns) if col not in ["ocel:oid", "ocel:type"]]
    if not include_empty_attrs:
        attrs = [attr for attr in attrs if not objects[attr].isna().all()]

    if not attrs:
        objects["attr"] = [{} for _ in range(len(objects))]
    else:
        object_attr_values = objects[attrs]
        object_attr_values_notna = ~object_attr_values.isna()
        if include_empty_values:
            objects["attr"] = object_attr_values.to_dict("records")
        else:
            objects["attr"] = [
                {
                    k: v
                    for j, (k, v) in enumerate(row.items())
                    if object_attr_values_notna.iloc[i, j]
                }
                for i, row in enumerate(object_attr_values.to_dict("records"))
            ]
    return [
        OcelObject(
            id=row["ocel:oid"],
            type=row["ocel:type"],
            attr=row["attr"],
        )
        for i, row in objects.iterrows()
    ]


class OcelEvent(ApiBaseModel):
    id: str
    activity: str
    timestamp: datetime
    attr: dict[str, Any]


def events_to_api(
    events: pd.DataFrame, include_empty_attrs: bool = False, include_empty_values: bool = False
) -> list[OcelEvent]:
    """
    Serializes an event DataFrame to a dict, to be passed via the API as json.
    """
    attrs = [
        col
        for col in list(events.columns)
        if col not in ["ocel:eid", "ocel:timestamp", "ocel:activity"]
    ]
    if not include_empty_attrs:
        attrs = [attr for attr in attrs if not events[attr].isna().all()]

    # events = events.replace({np.nan: None})
    if not attrs:
        events["attr"] = [{} for _ in range(len(events))]
    else:
        event_attr_values = events[attrs]
        event_attr_values_notna = ~event_attr_values.isna()
        if include_empty_values:
            events["attr"] = event_attr_values.to_dict("records")
        else:
            events["attr"] = [
                {k: v for j, (k, v) in enumerate(row.items()) if event_attr_values_notna.iloc[i, j]}
                for i, row in enumerate(event_attr_values.to_dict("records"))
            ]

    return [
        OcelEvent(
            id=row["ocel:eid"],
            activity=row["ocel:activity"],
            timestamp=row["ocel:timestamp"],
            attr=row["attr"],
        )
        for i, row in events.iterrows()
    ]
