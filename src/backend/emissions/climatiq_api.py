from __future__ import annotations

import json
from typing import Annotated, Any, Literal

import numpy as np
import pandas as pd
import requests
from pydantic import Field, model_validator

from api.config import config
from api.logger import logger
from api.model.base import ApiBaseModel
from api.model.climatiq import ClimatiqApiError
from api.model.ocean_units import KG_CO2E, Quantity, Unit
from ocel.attribute import AttributeDefinitionBase
from units.climatiq import ClimatiqUnitType, quantity_to_climatiq
from units.pint import PintQuantity, PintUnit, ureg


class ClimatiqDataVersionInformationUpToDate(ApiBaseModel):
    status: Literal["up_to_date"]


class ClimatiqDataVersionInformationReplaced(ApiBaseModel):
    status: Literal["replaced"]
    replaced_in: str
    replaced_by: str


class ClimatiqDataVersionInformationRemoved(ApiBaseModel):
    status: Literal["removed"]
    replaced_in: str


ClimatiqDataVersionInformation = Annotated[
    ClimatiqDataVersionInformationUpToDate
    | ClimatiqDataVersionInformationReplaced
    | ClimatiqDataVersionInformationRemoved,
    Field(discriminator="status"),
]


CO2ECalculationMethod = Literal["ar4", "ar5", "ar6"]


class ClimatiqEmissionFactorDetails(ApiBaseModel):
    id: str
    activity_id: str
    access_type: Literal["private", "public"]
    name: str
    category: str
    sector: str
    source: str
    source_link: str
    uncertainty: float | None = None
    year: int
    year_released: int
    region: str
    region_name: str
    description: str
    unit: str
    unit_type: str
    source_lca_activity: str
    supported_calculation_methods: list[CO2ECalculationMethod]
    factor: float | None = None
    factor_calculation_method: CO2ECalculationMethod | None = None
    constituent_gases: dict[str, float | None]
    data_version_information: ClimatiqDataVersionInformation

    @model_validator(mode="before")
    @classmethod
    def convert_frontend_region_object(cls, v: dict[str, Any]):
        region = v["region"]
        if isinstance(region, dict):
            v["region"] = region["id"]
            v["region_name"] = region["name"]
        return v


class ClimatiqAuditTrailEmissionFactorDetails(ApiBaseModel):
    id: str
    activity_id: str
    access_type: Literal["private", "public"]
    name: str
    category: str
    source: str
    source_dataset: str
    year: int
    region: str
    source_lca_activity: str
    data_quality_flags: list[str]


class ClimatiqEstimation(ApiBaseModel):
    co2e: float
    co2e_unit: Literal["kg"]
    co2e_calculation_method: Literal["ar4", "ar5", "ar6"]
    co2e_calculation_origin: Literal["source", "climatiq"]
    emission_factor: ClimatiqAuditTrailEmissionFactorDetails | None = None
    constituent_gases: dict[str, float | None] | None = None
    audit_trail: Literal["enabled", "disabled", "selector"]
    activity_data: Any


def get_climatiq_emission_factor_value(
    ef: ClimatiqEmissionFactorDetails,
    input_unit: PintUnit,
    unit_mode: Literal["strict", "simple"],
) -> Quantity:
    input_qty: PintQuantity = 1 * input_unit
    climatiq_qty = quantity_to_climatiq(input_qty, climatiq_unit_type=ef.unit_type)

    req_body = {
        "emission_factor": {"id": ef.id},
        "parameters": climatiq_qty,
    }

    logger.info(f"Accessing climatiq API ...")

    res = requests.post(
        "https://api.climatiq.io/data/v1/estimate",
        data=json.dumps(req_body),
        headers={"Authorization": f"Bearer {config.CLIMATIQ_API_KEY.get_secret_value()}"},
    ).json()
    if "error" in res:
        raise ClimatiqApiError(**res)

    # pprint(res)
    estimation = ClimatiqEstimation(**res)
    # print(estimation)

    assert (
        estimation.co2e_unit in ClimatiqUnitType._UNIT_TYPES["Weight"].units["weight_unit"]
    ), "Encountered co2e unit that is not a weight"
    if estimation.co2e_unit != "kg":
        raise NotImplementedError("Currently only supporting kg as co2e unit")

    co2e: Quantity = estimation.co2e * KG_CO2E
    if unit_mode == "simple":
        return co2e
    if unit_mode == "strict":
        return co2e / input_qty
    raise ValueError


def climatiq_batch_estimate(
    x: np.ndarray,
    /,
    climatiq_factor_id: str,
    attribute: AttributeDefinitionBase,
    input_unit: Unit,
    unit_type: str,
) -> np.ndarray | float:
    """Calculates attribute-based emissions using climatiq.
    Uses the batch estimate endpoint after discretizing the attribute values to minimize the number of requests.
    """
    raise DeprecationWarning(
        f"climatiq_batch_estimate() is deprecated/untested. Replaced by get_climatiq_emission_factor_value()."
    )

    ATTR_PRECISION = 0.1 * ureg.kg
    MAX_BATCH_SIZE = 100

    binsize = ATTR_PRECISION.to(input_unit).magnitude
    bins = np.arange(x.min(), x.max() + binsize, binsize)

    ix = np.digitize(x, bins)

    # Maximum discretization error
    logger.info(f"Maximum discretization error: {np.abs(x - bins[ix - 1]).max() * input_unit}")

    req_ix, ix_inverse = np.unique(ix, return_inverse=True)
    req_values: np.ndarray = bins[req_ix - 1]
    if len(req_values) > MAX_BATCH_SIZE:
        # TODO allow more values. Either just pass 2 values and interpolate linearly, or issue multiple requests.
        # If interpolating, use one api request for all rules (issue from EmissionModel), and then change value_per_attribute
        raise NotImplementedError(f"Exceeded number of values for climatiq batch request.")

    climatiq_quantities = quantities_to_climatiq(
        list(req_values),
        unit=input_unit,
        climatiq_unit_type=unit_type,
    )

    req_body = [
        {
            "emission_factor": {"id": climatiq_factor_id},
            "parameters": qty,
        }
        for qty in climatiq_quantities
    ]

    res = requests.post(
        "https://api.climatiq.io/data/v1/estimate/batch",
        data=json.dumps(req_body),
        headers={"Authorization": f"Bearer {config.CLIMATIQ_API_KEY.get_secret_value()}"},
    ).json()
    if "error" in res:
        raise ClimatiqApiError(**res)
    rdf = pd.DataFrame(res["results"])
    if "error" in rdf.columns:
        raise ClimatiqApiError(**rdf.iloc[0, :].to_dict())

    assert (
        rdf["co2e_unit"].isin(ClimatiqUnitType._UNIT_TYPES["Weight"].units["weight_unit"]).all()
    ), "Encountered co2e unit that is not a weight"
    if not (rdf["co2e_unit"] == "kg").all():
        raise NotImplementedError("Currently only supporting kg as co2e unit")

    res_co2e = rdf["co2e"].values
    co2e = res_co2e[ix_inverse] * KG_CO2E
    return co2e
