from typing import List, Literal, Union

import pandas as pd
import pm4py
from pm4py.objects.ocel.obj import OCEL
from pydantic.main import BaseModel


class NumericalAttribute(BaseModel):
    attribute: str
    type: Literal["numerical"]
    min: float
    max: float


class NominalAttribute(BaseModel):
    attribute: str
    type: Literal["nominal"]
    sample_values: list[Union[str, int, float]]
    num_unique: int


AttributeSummary = Union[NumericalAttribute, NominalAttribute]


def melt_df(df: pd.DataFrame, type_col: str, cols: list[str]) -> pd.DataFrame:
    return (
        df[[type_col] + cols]
        .melt(id_vars=type_col, var_name="attribute", value_name="value")
        .dropna(subset=["value"])
    )


def summarize_attribute(df: pd.DataFrame, type_collumn: str):
    summary_by_type: dict[str, List[AttributeSummary]] = {}

    grouped = df.groupby([type_collumn, "attribute"])

    for (type_name, attr), group in grouped:  ## type:ignore
        values = group["value"].dropna()

        if type_name not in summary_by_type:
            summary_by_type[type_name] = []

        try:
            numeric_values = pd.to_numeric(values, errors="raise")
            is_numeric = True
        except Exception:
            is_numeric = False

        if is_numeric:
            summary = NumericalAttribute(
                attribute=attr,
                type="numerical",
                min=numeric_values.min(),  # type:ignore
                max=numeric_values.max(),  # type:ignore
            )
        else:
            unique_vals = values.unique()
            summary = NominalAttribute(
                attribute=attr,
                type="nominal",
                sample_values=unique_vals.tolist(),
                num_unique=len(unique_vals),
            )

        summary_by_type.setdefault(type_name, []).append(summary)

    return summary_by_type


def summarize_event_attributes(ocel: OCEL) -> dict[str, list[AttributeSummary]]:
    event_attribute_names = [
        col for col in pm4py.ocel_get_attribute_names(ocel) if col in ocel.events.columns
    ]

    melted_event_attributes = melt_df(ocel.events, ocel.event_activity, event_attribute_names)

    return summarize_attribute(melted_event_attributes, ocel.event_activity)


def summarize_object_attributes(ocel: OCEL) -> dict[str, list[AttributeSummary]]:
    obj_type_col = ocel.object_type_column

    # Get valid attributes per dataset
    attribute_names = pm4py.ocel_get_attribute_names(ocel)
    object_cols = [col for col in attribute_names if col in ocel.objects.columns]
    object_changes_cols = [col for col in attribute_names if col in ocel.object_changes.columns]

    melted_objects = melt_df(ocel.objects.mask(ocel.objects == "null"), obj_type_col, object_cols)
    melted_changes = melt_df(
        ocel.object_changes.mask(ocel.object_changes == "null"),
        obj_type_col,
        object_changes_cols,
    )

    metadata = pd.concat([melted_objects, melted_changes], ignore_index=True)

    return summarize_attribute(metadata, obj_type_col)
