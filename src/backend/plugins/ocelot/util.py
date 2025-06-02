from math import ceil
from typing import Literal, Optional, Tuple

import pandas as pd
from pandas.core.frame import DataFrame

from plugins.ocelot.models import OcelEntity, PaginatedResponse


def get_sorted_table(
    dataframe: DataFrame,
    type_field: str,
    type_value: str,
    sort_by: Optional[Tuple[str, Literal["asc", "desc"]]] = None,
):
    table = dataframe[dataframe[type_field] == type_value].copy()

    if sort_by:
        table = table.sort_values(
            by=sort_by[0], ascending=True if sort_by[1] == "asc" else False
        )  # type: ignore

    return table


def get_paginated_dataframe(
    df: DataFrame,
    non_attribute_fields: list[str],
    page: int,
    page_size: int,
    relation_table: DataFrame,
    from_field: str,
    to_field: str,
) -> PaginatedResponse:
    start = (page - 1) * page_size
    end = start + page_size
    paginated_df = df.iloc[start:end].copy()
    total_items = len(df)
    total_pages = ceil(total_items / page_size)

    # Only consider relations for this page
    related = relation_table[relation_table[from_field].isin(paginated_df[from_field])]

    # Pivot relation data
    relations = related.pivot_table(
        index=from_field,
        columns="ocel:qualifier",
        values=to_field,
        aggfunc=lambda x: list(x),
    ).reset_index()

    # Bundle relation columns into one 'relations' dict
    relations["relations"] = relations.drop(columns=[from_field]).to_dict(
        orient="records"
    )
    relations = relations[[from_field, "relations"]]

    # Drop non-informative columns
    paginated_df = paginated_df.dropna(axis=1, how="all")

    # Build attribute dict excluding non-attribute fields
    columns_to_drop = [
        col for col in non_attribute_fields if col in paginated_df.columns
    ]
    attribute_data = paginated_df.drop(columns=columns_to_drop)

    if attribute_data.shape[1] == 0:
        paginated_df["attributes"] = [{} for _ in range(len(paginated_df))]
    else:
        paginated_df["attributes"] = attribute_data.to_dict(orient="records")

    # Merge with relation info
    merged = pd.merge(paginated_df, relations, on=from_field, how="left")

    merged["relations"] = merged["relations"].apply(
        lambda r: {
            k: v if isinstance(v, list) else []
            for k, v in (r if isinstance(r, dict) else {}).items()
        }
    )
    # Convert rows to OcelEntity objects
    items = [
        OcelEntity(
            id=row[from_field],  # type:ignore
            timestamp=row.get("ocel:timestamp"),
            attributes=row["attributes"],  # type:ignore
            relations=row["relations"],  # type:ignore
        )
        for _, row in merged.iterrows()
    ]

    return PaginatedResponse(
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        total_items=total_items,
        items=items,
    )
