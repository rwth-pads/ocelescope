from __future__ import annotations

from typing import Annotated, Any

import numpy as np
import pint
from pint.facets.plain.quantity import PlainQuantity
from pint.facets.plain.unit import PlainUnit
from pydantic import (
    Field,
    PlainSerializer,
    PlainValidator,
    SerializationInfo,
    TypeAdapter,
    WithJsonSchema,
)

from api.logger import logger
from api.model.base import ApiBaseModel
from units.pint import PintQuantity, PintUnit, dimensionless, is_dimensionless, ureg


class OceanUnit(ApiBaseModel):
    symbol: str | None
    name: str | None
    dim: dict[str, int]


class OceanQuantity(ApiBaseModel):
    value: float
    unit: OceanUnit | None | None = Field(default=None)


def serialize_unit_to_ocean(unit: PintUnit) -> OceanUnit:
    if is_dimensionless(unit):
        # TODO or return just None and make all properties non-optional?
        return OceanUnit(
            symbol=None,
            name=None,
            dim=dict(),
        )

    return OceanUnit(
        symbol=f"{unit:~C}",
        name=f"{unit:C}",
        dim=dict(unit.dimensionality),  # type: ignore
    )


def serialize_quantity_to_ocean(value: pint.Quantity) -> OceanQuantity:
    u = serialize_unit_to_ocean(value.units)
    if u.symbol is None:
        u = None
    return OceanQuantity(value=value.magnitude, unit=u)


def parse_ocean_unit(v: str | dict[str, Any] | None) -> PintUnit:  # type: ignore
    """Parses a unit passed via the API, returning a pint Unit"""
    query: str | None = None
    if isinstance(v, str):
        query = v
    elif isinstance(v, dict):
        unit = OceanUnit(**v)
        query = unit.name or unit.symbol
    else:
        raise TypeError("Unit is malformatted")

    if query is None:
        logger.warning(
            f"Trying to parse unit with empty name and symbol. Continuing with dimensionless."
        )
        return dimensionless

    qty = parse_ocean_quantity(query)
    if not np.isclose(qty.magnitude, 1, rtol=0):
        raise ValueError(
            f'Input "{query}" has magnitude different from 1. Did you mean to use parse_ocean_quantity() instead?'
        )

    return qty.units


def parse_ocean_quantity(v: str | dict[str, Any]) -> pint.Quantity:
    """Parses a quantity passed via the API, returning a pint Quantity"""
    try:
        unit_query: str | None = None
        factor = 1
        if isinstance(v, str):
            unit_query = v
        elif isinstance(v, dict):
            oqty = OceanQuantity(**v)
            factor = oqty.value
            if oqty.unit is not None:
                unit_query = oqty.unit.name or oqty.unit.symbol
        else:
            raise TypeError("Quantity is malformatted")
        if unit_query is None:
            qty = dimensionless
        else:
            qty = ureg(unit_query)

        return factor * qty

    except pint.UndefinedUnitError as err:
        raise err


# TODO pint-pydantic integration: https://gist.github.com/sanbales/07206a7a7b88fa0bda8df524fd364895


def validate_unit_model(v: str | dict[str, Any] | PintUnit, /):  # type: ignore
    if isinstance(v, (pint.Unit, PlainUnit)):
        return v
    return parse_ocean_unit(v)


def serialize_unit_model(unit: Unit, /, info: SerializationInfo):
    return serialize_unit_to_ocean(unit)


def validate_quantity_model(v: str | dict[str, Any] | PintQuantity, /) -> PintQuantity:
    if isinstance(v, (pint.Quantity, PlainQuantity)):
        return v
    return parse_ocean_quantity(v)


def serialize_quantity_model(quantity: Quantity, /, info: SerializationInfo):
    return serialize_quantity_to_ocean(quantity)


class _UnitSchemaModel(ApiBaseModel):
    """This model is just used to generate a JSON schema used by the `Unit` annotation."""

    symbol: str | None = Field(
        description="Unit symbol",
        examples=["m/s"],
    )
    name: str | None = Field(
        description="Long name of the unit",
        examples=["meter/second"],
    )
    dim: dict[str, int] = Field(
        description="The unit dimensionality, compatible with the `pint` python package",
        examples=[{"[length]": 1, "[time]": -1}],
    )


Unit = Annotated[
    pint.Unit,
    PlainValidator(validate_unit_model),
    PlainSerializer(serialize_unit_model),
    WithJsonSchema(
        {
            **_UnitSchemaModel.model_json_schema(),
            "title": "Unit",
            "description": "A unit (physical, currency, ...), represented by a symbol, name, and dimensionality.",
        }
    ),
]


class _QuantitySchemaModel(ApiBaseModel):
    """This model is just used to generate a JSON schema used by the `Quantity` annotation."""

    value: float
    unit: Unit | None = Field(default=None)


# https://docs.pydantic.dev/latest/concepts/types/#adding-validation-and-serialization
Quantity = Annotated[
    pint.Quantity,
    PlainValidator(validate_quantity_model),
    PlainSerializer(serialize_quantity_model),
    WithJsonSchema(
        {
            **_QuantitySchemaModel.model_json_schema(),
            "title": "Quantity",
            "description": "A quantity (physical, currency, ...), containing a value and (optionally) a unit.",
        }
    ),
]


quantity_adapter = TypeAdapter(Quantity)  # type: ignore
unit_adapter = TypeAdapter(Unit)  # type: ignore


KG_CO2E: Unit = unit_adapter.validate_python("kg")
