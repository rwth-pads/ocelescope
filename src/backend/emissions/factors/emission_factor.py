from __future__ import annotations

import re
from abc import ABC, abstractmethod
from functools import reduce
from operator import mul
from typing import TYPE_CHECKING, Annotated, Literal

import numpy as np
import pandas as pd
from pydantic import Field, ValidationInfo

from api.model.ocean_units import KG_CO2E, Quantity
from api.model.with_ocel import ModelWithOcel, model_ocel_validator
from emissions.climatiq_api import (
    ClimatiqEmissionFactorDetails,
    get_climatiq_emission_factor_value,
)
from emissions.utils import otq
from ocel.attribute import (
    AttributeDefinition,
    EventAttributeDefinition,
    ObjectAttributeDefinition,
)
from units.pint import (
    PintQuantity,
    PintUnit,
    UnitMismatchError,
    dimensionless,
    get_unit,
    is_dimensionless,
    ureg,
)

if TYPE_CHECKING:
    from ocel.ocel_wrapper import OCELWrapper


UNIT_MODE: Literal["simple", "strict"] = "simple"
"""
- `simple`: Emission factor values always have a weight unit (e.g. `5 kg`)
- `strict` **(untested)**: Emission factor values have more complex units, dividing by the input unit (e.g. `5 kg / (t*km)`)
"""


class QualifiedAttribute(ModelWithOcel):
    qualifier: str | None
    attribute: AttributeDefinition

    @model_ocel_validator()
    def validate_qualified_attribute(self, ocel: OCELWrapper | None, info: ValidationInfo):
        # TODO duplicated validator in EmissionRule
        if not ocel:
            return self
        if isinstance(self.attribute, EventAttributeDefinition):
            if self.qualifier is not None:
                raise ValueError(f"EmissionFactor: Cannot specify qualifier for event attribute")
        if isinstance(self.attribute, ObjectAttributeDefinition):
            if self.qualifier is not None:
                if self.qualifier not in ocel.get_qualifiers(otype=self.attribute.object_type):
                    raise ValueError(
                        f'Unknown qualifier "{self.qualifier}" for object type "{self.attribute.object_type}"'
                    )
        return self


class EmissionFactorBase(ABC, ModelWithOcel):
    source: Literal["local", "climatiq"]
    attributes: list[QualifiedAttribute]

    @property
    @abstractmethod
    def _value(self) -> Quantity:
        """Returns the emission factor as a pint Quantity"""
        ...

    @abstractmethod
    def get_result_unit(self) -> PintUnit:
        """Returns the unit of the result given by this factor."""
        ...

    def get_attributes_used(self) -> list[QualifiedAttribute]:
        """Returns a list of the attribute definitions used in this emission factor, together with their optional qualifier filter."""
        return self.attributes

    def get_input_unit(self) -> PintUnit:
        attr_units = [qa.attribute.unit for qa in self.get_attributes_used()]
        attr_units = [unit for unit in attr_units if unit is not None]
        inp = reduce(mul, attr_units, dimensionless)
        return get_unit(inp)

    def apply(self, events: pd.DataFrame) -> PintQuantity:
        """Computes emissions for this factor, given a DataFrame of events. Returns a pint Quantity array."""
        columns = []
        for qa in self.attributes:
            col = EmissionFactorBase.find_attr_column(events, qa)
            if col is None:
                raise KeyError(f"EmissionFactor: Attribute '{qa.attribute.name}' not found")
            columns.append(col)

        results: pd.Series = self._value.magnitude * np.prod(events[columns], axis=1)
        return ureg.Quantity(results.values, self.get_result_unit())

    def to_string(
        self,
        mode: Literal["normal", "compact"] = "normal",
    ) -> str:
        attr_reprs = []
        for qattr in self.attributes:
            q, attr = qattr.qualifier, qattr.attribute
            if attr.target == "event":
                attr_repr = attr.name
            elif attr.target == "object":
                attr_repr = f"{attr.name}({otq(attr.object_type, q)})"
            else:
                raise ValueError
            attr_reprs.append(attr_repr)

        try:
            factor_str = EmissionFactorBase.co2e_str(self._value)
        except UnitMismatchError:
            factor_str = "???"

        output = " × ".join([factor_str, *attr_reprs])

        if isinstance(self, ClimatiqEmissionFactor):
            output = f"{output} ({self.data.name})"
        return output

    def __str__(self):
        return self.to_string("normal")

    @staticmethod
    def co2e_str(value: Quantity):
        """String representation of a quantity as emission factor.
        Automatically detects a weight unit and outputs it like '3 g/km' -> '3 gCO2e / km"""

        # Infer CO2e weight unit from factor
        if value._units["kilogram"] > 0:
            co2e_unit = ureg.kilogram
        if value._units["gram"] > 0:
            co2e_unit = ureg.gram
        elif value._units["tonne"] > 0:
            co2e_unit = ureg.tonne
        else:
            # By default, use kgCO2e (including when dimensionless, yielding kgCO2e/kg)
            co2e_unit = ureg.kilogram

        wo_weight = value / co2e_unit
        weight_str = f"{(wo_weight.m * co2e_unit)}CO2e"
        if is_dimensionless(wo_weight):
            return weight_str
        if all(exp < 0 for dim, exp in wo_weight.dimensionality.items()):
            # Only negative exponent units, very common case (kgCO2e per X)
            inv_wo_weight_str = str((1 / wo_weight).u)  # type: ignore
            if len(wo_weight._units) >= 2:
                return weight_str + " / (" + inv_wo_weight_str + ")"
            return weight_str + " / " + inv_wo_weight_str

        wo_weight_str = str(wo_weight.u)
        match = re.match(r"^1\s*/\s*(.+)$", wo_weight_str)
        if match:
            return weight_str + " / " + match.group(1)
        return weight_str + " × " + wo_weight_str

    @staticmethod
    def find_attr_column(
        df: pd.DataFrame,
        qa: QualifiedAttribute,
    ) -> str | None:
        """Searches for attribute column representations, e.g. ["Weight", "Weight(Container)", "Weight(Container/Ctr loaded)"]"""
        qualifier, attr = qa.qualifier, qa.attribute
        possible_column_names = [
            attr.name,
            f"{attr.name}({attr.activity if attr.target == 'event' else attr.object_type})",
            *(
                [f"{attr.name}({otq(attr.object_type, qualifier)})"]
                if attr.target == "object" and qualifier is not None
                else []
            ),
        ]
        for col in possible_column_names:
            if col in df.columns:
                return col
        return None

    @model_ocel_validator()
    def check_attributes(self, ocel: OCELWrapper | None, info: ValidationInfo):
        if not ocel:
            return self
        for qa in self.attributes:
            qualifier, attrdef = qa.qualifier, qa.attribute
            attr = ocel.find_attribute(definition=attrdef)
            if attr is None:
                raise ValueError(f"EmissionFactor: Attribute '{attrdef.name}' not found.")
            if not attr.numeric:
                raise ValueError(f"EmissionFactor: Attribute '{attrdef.name}' is not numeric.")
            if qualifier is not None:
                if attr.target != "object":
                    raise ValueError(
                        f"EmissionFactor: Cannot specify qualifier for event attribute."
                    )
        return self


class ClimatiqEmissionFactor(EmissionFactorBase):
    source: Literal["climatiq"]  # type: ignore
    data: ClimatiqEmissionFactorDetails
    value: Quantity | None = Field(
        default=None,
        description="The emission factor. If not passed, the climatiq API is accessed to retrieve the factor.",
    )

    @property
    def _value(self) -> Quantity:
        if self.value:
            return self.value
        value = get_climatiq_emission_factor_value(
            self.data,
            input_unit=self.get_input_unit(),
            unit_mode=UNIT_MODE,
        )
        self.value = value
        return value

    def get_result_unit(self) -> PintUnit:
        """Returns the unit of the result given by this factor."""
        return KG_CO2E


class LocalEmissionFactor(EmissionFactorBase):
    source: Literal["local"]  # type: ignore
    value: Quantity

    @property
    def _value(self) -> Quantity:
        return self.value

    def get_result_unit(self) -> PintUnit:
        """Returns the unit of the result given by this factor."""
        if UNIT_MODE == "simple":
            # Forget the attribute units, use the `value` unit as result unit
            # value unit e.g. [kg]
            return self.value.units
        elif UNIT_MODE == "strict":
            # Multiply all attribute units. The `value` unit needs to be specified accordingly
            # value unit e.g. [kg / (t * km)]
            attr_units = [qa.attribute.unit for qa in self.attributes]
            # TODO what if attr has Quantity as 'unit'? (e.g. L/100km)
            return self._value.units * reduce(mul, attr_units, 1)
        raise ValueError


EmissionFactor = Annotated[
    LocalEmissionFactor | ClimatiqEmissionFactor,
    Field(discriminator="source"),
]
