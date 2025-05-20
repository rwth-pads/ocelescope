from typing import cast

import pandas as pd
from pm4py.objects.ocel.obj import OCEL
from pydantic.main import BaseModel

from api.dependencies import ApiOcel


class RelationCountSummary(BaseModel):
    qualifier: str
    activity: str
    object_type: str
    min_count: int
    max_count: int


def get_ocel_object_relations(ocel: OCEL) -> list[RelationCountSummary]:
    qualifier_col = ocel.qualifier
    activity_col = ocel.event_activity
    object_type_col = ocel.object_type_column
    event_id_col = ocel.event_id_column

    grouped_relations = (
        ocel.relations.groupby([event_id_col, qualifier_col, activity_col, object_type_col])
        .size()
        .reset_index()
        .rename(columns={0: "count"})
    )

    summary: pd.DataFrame = (
        grouped_relations.groupby([qualifier_col, activity_col, object_type_col])["count"]
        .agg(["min", "max"])
        .reset_index()
        .rename(columns={"min": "min_count", "max": "max_count"})
    )

    summaries = [
        RelationCountSummary(
            qualifier=cast(str, row[qualifier_col]),
            activity=cast(str, row[activity_col]),
            object_type=cast(str, row[object_type_col]),
            min_count=cast(int, row["min_count"]),
            max_count=cast(int, row["max_count"]),
        )
        for _, row in summary.iterrows()
    ]
    return summaries


class O2ORelation(BaseModel):
    src: str
    target: str
    qualifier: str
    freq: int


def get_o2o_relations(ocel: ApiOcel) -> list[O2ORelation]:
    o2oRelations: list[O2ORelation] = [
        O2ORelation(**row.to_dict())
        for _, row in ocel.o2o_type_frequencies.rename(
            columns={
                "ocel:type_1": "src",
                "ocel:type_2": "target",
                "ocel:qualifier": "qualifier",
            }
        ).iterrows()
    ]

    return o2oRelations
