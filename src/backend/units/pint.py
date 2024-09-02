from typing import Union

import pint
from pint.facets.plain.quantity import PlainQuantity
from pint.facets.plain.unit import PlainUnit

from api.config import config

UNITS_DIR = config.DATA_DIR / "units"

# https://pint.readthedocs.io/en/stable/advanced/currencies.html
PINT_CURRENCY_CONTEXT = f"FX_{config.CURRENCY_EXCHANGE_DATE}"

# Init pint registry and load custom unit definitions
# https://pint.readthedocs.io/en/0.10.1/defining.html
ureg = pint.UnitRegistry()
ureg.load_definitions(UNITS_DIR / f"{config.CURRENCY_EXCHANGE_DATE}_climatiq_pint_currencies.txt")
ureg.load_definitions(UNITS_DIR / f"pint_byte_units.txt")

# More custom units
ureg.define("Lp100km = L/(100km) = _ = Lphkm")

ureg.enable_contexts(PINT_CURRENCY_CONTEXT)
ureg.default_format = "~P"


class UnitMismatchError(Exception):
    pass


PintUnit = Union[pint.Unit, PlainUnit]
PintQuantity = Union[pint.Quantity, PlainQuantity]

dimensionless: pint.Unit = ureg.dimensionless  # type: ignore
"""Instance of an empty unit (Number)"""


def is_dimensionless(x: PintQuantity | PintUnit | None):
    if x is None:
        return False
    return len(x.dimensionality) == 0


def is_weight(x: PintQuantity | PintUnit | None):
    if x is None:
        return False
    return dict(x.dimensionality) == {"[mass]": 1}


def get_unit(x: PintQuantity | PintUnit | int | float) -> PintUnit:
    if isinstance(x, int | float):
        return dimensionless
    if isinstance(x, (pint.Quantity, PlainQuantity)):
        return x.units
    return x
