from __future__ import annotations

import json
from functools import cached_property

import pandas as pd
import pint
from pydantic import Field

from api.config import config
from api.model.base import ApiBaseModel
from units.pint import PintQuantity, PintUnit, UnitMismatchError, ureg, UNITS_DIR

ClimatiqQuantity = dict[str, str | float]

# Define map from climatiq units to pint units, if not correctly recognized by ureg.parse_units()
CLIMATIQ_PINT_UNIT_REPRESENTATIONS = pd.read_json(
    config.DATA_DIR / "units" / "climatiq_pint_unit_representations.json"
)

CLIMATIQ_PINT_UNIT_MAP: dict[tuple[str, str] | str, str] = {
    "m2": "m**2",
    "km2": "km**2",
    "ft2": "ft**2",
    ("m", "time"): "minute",
    "standard_cubic_foot": "ft**3",
    "gallon_us": "gallon",
    "m3": "m**3",
    "MMBTU": "megabritish_thermal_unit",
}
CLIMATIQ_PINT_UNIT_MAP.update(
    {
        (row["unit"], row["unit_type"]): row["pint_short"]
        for _, row in CLIMATIQ_PINT_UNIT_REPRESENTATIONS.iterrows()
        if row["pint_short"] != row["unit"]
    }
)
del CLIMATIQ_PINT_UNIT_REPRESENTATIONS


class ClimatiqUnitType(ApiBaseModel):
    _UNIT_TYPES: dict[str, ClimatiqUnitType] = {}

    # unit_type: Literal[*climatiq_unit_types]  # TODO unpacking in Literal needs Python 3.11
    unit_type: str = Field(examples=["Weight", "DistancceOverTime"])
    units: dict[str, list[str]] = Field(
        examples=[
            {"weight_unit": ["g", "kg", "t", "lb", "ton"]},
            {
                "distance_unit": ["m", "km", "ft", "mi", "nmi"],
                "time_unit": ["ms", "s", "m", "h", "day", "year"],
            },
        ]
    )

    @property
    def is_composed(self):
        return "Over" in self.unit_type

    @cached_property
    def default_climatiq_unit(self):
        # Returns default units for non-composed unit types (except for Number and Money)
        # Quantities are always converted to these units before making a request.
        simple = {
            "Area": "km2",
            "Data": "MB",
            "Distance": "km",
            "Energy": "kWh",
            "Time": "h",
            "Volume": "l",
            "Weight": "kg",
        }.get(self.unit_type, None)

        if simple is not None:
            return simple

    @cached_property
    def default_pint_unit(self) -> PintUnit | None:
        if self.default_climatiq_unit is None:
            return None
        unit = CLIMATIQ_PINT_UNIT_MAP.get(
            (self.default_climatiq_unit, self.unit_type), self.default_climatiq_unit
        )
        if unit is not None:
            return ureg.parse_units(unit)
        return None

    def serialize_quantity(self, x: PintQuantity) -> ClimatiqQuantity:
        """
        Serializes a pint Quantity of this unit type to the format accepted by the climatiq API.
        https://www.climatiq.io/docs/api-reference/models/parameters
        """
        if self.unit_type == "Money":
            # let climatiq handle currency conversions
            currency = str(x.units).lower()
            if currency not in self.units["money_unit"]:
                raise UnitMismatchError(f"Currency '{currency}' not supported by Climatiq")
            return {"money": x.magnitude, "money_unit": currency}
        if self.unit_type == "Number":
            return {"number": x.magnitude}
        if self.default_climatiq_unit is not None:
            # Simple unit types (Weight, Energy, ...)
            climatiq_unit = self.default_climatiq_unit
            pint_unit = self.default_pint_unit
            if pint_unit is None:
                raise UnitMismatchError(
                    f"{self}.serialize_quantity({x}): No pint unit found for default climatiq unit '{climatiq_unit}'."
                )
            # Convert to default unit
            y = x.to(self.default_pint_unit)
            print(f"{self}.serialize_quantity({x}): converted to {y}")

            ut_key = self.unit_type.lower()
            return {
                ut_key: y.magnitude,
                f"{ut_key}_unit": climatiq_unit,
            }
        if self.unit_type == "NumberOverTime":
            return {
                **ClimatiqUnitType._UNIT_TYPES["Number"].serialize_quantity(x),
                "number": 1,
            }
        if self.unit_type == "ContainerOverDistance":
            return {
                **ClimatiqUnitType._UNIT_TYPES["Distance"].serialize_quantity(x),
                "twenty_foot_equivalent": 1,
            }
        if self.unit_type == "PassengerOverDistance":
            return {
                **ClimatiqUnitType._UNIT_TYPES["Distance"].serialize_quantity(x),
                "passengers": 1,
            }

        # Composed unit types (AreaOverTime, WeightOverDistance, ...)
        if not self.is_composed:
            raise NotImplementedError
        parts = self.unit_type.split("Over")
        uts = [ClimatiqUnitType.get(p) for p in parts]
        default_climatiq_units = [ut.default_climatiq_unit for ut in uts]
        default_pint_units = [ut.default_pint_unit for ut in uts]
        if len(uts) != 2:
            raise NotImplementedError
        ut1, ut2 = uts
        ut1_key, ut2_key = ut1.unit_type.lower(), ut2.unit_type.lower()
        cu1, cu2 = default_climatiq_units
        pu1, pu2 = default_pint_units
        if cu1 is None or pu1 is None:
            raise ValueError(f"{self}.serialize_quantity({x}): No unit found for unit type {ut1}.")
        if cu2 is None or pu2 is None:
            raise ValueError(f"{self}.serialize_quantity({x}): No unit found for unit type {ut2}.")

        y1 = (x / pu2).to(pu1)
        return {
            **ut1.serialize_quantity(y1),
            ut2_key: 1,
            f"{ut2_key}_unit": cu2,
        }
        # Same as above the other way round?
        # Not needed as of now, above case always works.

    def __str__(self):
        return self.unit_type

    def __repr__(self):
        return f"ClimatiqUnitType.{self.unit_type}"

    @staticmethod
    def get(ut: ClimatiqUnitType | str):
        return ClimatiqUnitType._UNIT_TYPES[ut] if isinstance(ut, str) else ut


ClimatiqUnitType._UNIT_TYPES = {
    d["unit_type"]: ClimatiqUnitType(**d)
    for d in json.load(open(UNITS_DIR / "climatiq_unit_types.json", "r", encoding="utf8"))["unit_types"]
}

# NOTE .to_base_units() raises a DimensionalityError for units just made from "Byte". Probably an issue with overriding an existing unit's dimension (Money does not have that problem)
CLIMATIQ_UNIT_TYPE_DIMENSIONALITY = {
    "Area": {"[length]": 2},
    "AreaOverTime": {"[length]": 2, "[time]": 1},
    "ContainerOverDistance": {"[length]": 1},
    "Data": {"[information]": 1},
    "DataOverTime": {"[information]": 1, "[time]": 1},
    "Distance": {"[length]": 1},
    "DistanceOverTime": {"[length]": 1, "[time]": 1},
    "Energy": {"[mass]": 1, "[length]": 2, "[time]": -2},
    "Money": {"[currency]": 1},
    "Number": {},
    "NumberOverTime": {"[time]": 1},
    "PassengerOverDistance": {"[length]": 1},
    "Time": {"[time]": 1},
    "Volume": {"[length]": 3},
    "Weight": {"[mass]": 1},
    "WeightOverDistance": {"[mass]": 1, "[length]": 1},
    "WeightOverTime": {"[mass]": 1, "[time]": 1},
}
"""Translation of climatiq unit types to dimensions with exponents"""

CLIMATIQ_NUMBER_LIKE_UNIT_TYPES = ["Number", "Container", "Passenger"]


def infer_climatiq_unit_types_from_dimensionality(x: PintQuantity | PintUnit, /) -> list[str]:
    """For a pint quantity or unit, return the list of matching climatiq unit types based on the unit's dimensionality."""
    dim = x.dimensionality
    return [ut for ut, d in CLIMATIQ_UNIT_TYPE_DIMENSIONALITY.items() if d == dim]


def quantity_to_climatiq(
    x: pint.Quantity,
    /,
    *,
    climatiq_unit_type: ClimatiqUnitType | str,
) -> ClimatiqQuantity:
    """
    Serializes a pint Quantity to the format accepted by the climatiq API.
    https://www.climatiq.io/docs/api-reference/models/parameters
    """
    climatiq_unit_type = ClimatiqUnitType.get(climatiq_unit_type)
    err_prefix = "Conversion to climatiq quantity failed"

    # Check if unit type matches Quantity dimensionality
    possible_climatiq_unit_types = infer_climatiq_unit_types_from_dimensionality(x)
    if not possible_climatiq_unit_types:
        raise ValueError(f"{err_prefix}: No matching climatiq unit types found.")
    if climatiq_unit_type.unit_type not in possible_climatiq_unit_types:
        raise UnitMismatchError(
            f"{err_prefix}: Expected {climatiq_unit_type}, found {'/'.join(possible_climatiq_unit_types)}."
        )

    return climatiq_unit_type.serialize_quantity(x)


def quantities_to_climatiq(
    values: list[float],
    /,
    *,
    unit: PintUnit,
    climatiq_unit_type: str,
) -> list[ClimatiqQuantity]:
    """Serializes a list of quantities in the format accepted by climatiq API."""
    raise DeprecationWarning(f"quantities_to_climatiq() is deprecated/untested.")
    err_prefix = "Batch conversion to climatiq quantities failed"
    if not values:
        return []

    # Convert one quantity to climatiq representation
    q0: PintQuantity = values[0] * unit  # type: ignore
    y0 = quantity_to_climatiq(q0, climatiq_unit_type=climatiq_unit_type)

    # Find key containing the magnitude and replicate
    try:
        magnitude_key: str = [k for k, v in y0.items() if v == values[0]][0]
    except KeyError:
        raise ValueError(f"{err_prefix}: Magnitude key not found")
    assert not magnitude_key.endswith("_unit")

    res = [y0]
    for q in values[1:]:
        res.append({**y0, magnitude_key: q})
    return res
