from typing import Literal, Optional, cast

from pm4py.objects.ocel.obj import OCEL
from pydantic.main import BaseModel

import pandas as pd


class RelationCountSummary(BaseModel):
    qualifier: str
    source: str
    target: str
    min_count: int
    max_count: int
    sum: int


def getO2OWithTypes(ocel):
    o2o_with_types = pd.merge(
        ocel.o2o,
        ocel.objects[[ocel.object_id_column, ocel.object_type_column]],
        how="left",
    )
    o2o_with_types = pd.merge(
        o2o_with_types,
        ocel.objects[[ocel.object_id_column, ocel.object_type_column]],
        how="left",
        left_on=f"{ocel.object_id_column}_2",
        right_on=ocel.object_id_column,
        suffixes=["", "_new"],  # type:ignore
    )
    o2o_with_types = o2o_with_types[
        [
            ocel.object_id_column,
            f"{ocel.object_id_column}_2",
            ocel.qualifier,
            ocel.object_type_column,
            f"{ocel.object_type_column}_new",
        ]
    ]
    rename_map = {
        ocel.object_id_column: "source",
        f"{ocel.object_id_column}_2": "target",
        ocel.qualifier: "qualifier",
        ocel.object_type_column: "source_type",
        f"{ocel.object_type_column}_new": "target_type",
    }
    return o2o_with_types.rename(columns=rename_map)  # type:ignore


def summarize_relation_counts(
    relation_table: pd.DataFrame,
    qualifier_col: str,
    source_type_col: str,
    target_type_col: str,
    source_id_col: str,
    target_id_col: str,
    direction: Literal["source", "target"],
) -> list[RelationCountSummary]:
    group_key = source_id_col if direction == "source" else target_id_col

    grouped_relations = (
        relation_table.groupby(
            [group_key, qualifier_col, source_type_col, target_type_col]
        )
        .size()
        .reset_index()
        .rename(columns={0: "count"})
    )

    summary = (
        grouped_relations.groupby([qualifier_col, source_type_col, target_type_col])[
            "count"
        ]
        .agg(["min", "max", "sum"])
        .reset_index()
        .rename(columns={"min": "min_count", "max": "max_count"})
    )

    summaries = [
        RelationCountSummary(
            qualifier=cast(str, row[qualifier_col]),
            source=cast(str, row[source_type_col]),
            target=cast(str, row[target_type_col]),
            min_count=cast(int, row["min_count"]),
            max_count=cast(int, row["max_count"]),
            sum=cast(int, row["sum"]),
        )
        for _, row in summary.iterrows()
    ]

    return summaries


def summarize_e2o_counts(
    ocel: OCEL, direction: Optional[Literal["source", "target"]] = "source"
) -> list[RelationCountSummary]:
    return summarize_relation_counts(
        relation_table=ocel.relations,
        direction="target" if direction == "target" else "source",
        qualifier_col=ocel.qualifier,
        source_type_col=ocel.event_activity,
        target_type_col=ocel.object_type_column,
        source_id_col=ocel.event_id_column,
        target_id_col=ocel.object_id_column,
    )


def summarize_o2o_counts(
    ocel: OCEL, direction: Optional[Literal["source", "target"]] = "source"
):
    o2o = getO2OWithTypes(ocel)
    return summarize_relation_counts(
        relation_table=o2o,
        qualifier_col="qualifier",
        source_type_col="source_type",
        target_type_col="target_type",
        source_id_col="source",
        target_id_col="target",
        direction="target" if direction == "target" else "source",
    )
