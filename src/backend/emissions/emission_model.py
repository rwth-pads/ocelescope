from __future__ import annotations

import json
from functools import cached_property
from threading import Lock
from typing import TYPE_CHECKING, Sequence

import numpy as np
import pandas as pd
import util.pandas as pd_util
from api.logger import logger
from api.model.base import ApiBaseModel, NumberStats
from api.model.ocean_units import KG_CO2E, Unit
from api.model.with_ocel import ModelWithOcel
from api.task_base import Task
from cachetools import LRUCache
from emissions.allocation import Allocator
from emissions.rules.emission_rule import EmissionRule
from ocel.attribute import AttributeDefinition
from pydantic import Field, computed_field, model_validator
from units.pint import PintUnit, UnitMismatchError, is_weight, ureg
from util.cache import instance_lru_cache
from util.misc import indent

if TYPE_CHECKING:
    from ocel.ocel_wrapper import OCELWrapper


EMISSIONS_NAME = "ocean:co2e"
EMISSIONS_KG_NAME = "ocean:co2e_kg"


class EmissionsState(ApiBaseModel):
    has_imported_emissions: bool = Field(default=False)
    has_rule_based_emissions: bool = Field(default=False)
    has_object_emissions: bool

    @computed_field
    @property
    def has_emissions(self) -> bool:
        return self.has_imported_emissions or self.has_rule_based_emissions


class ProcessEmissions(ModelWithOcel):
    imported_event_emissions: pd.Series | None = Field(exclude=True)
    rule_event_emissions: pd.Series | None = Field(exclude=True)
    rule_e2o_emissions: pd.Series | None = Field(exclude=True)
    unit: Unit
    api_state: str | None = None  # only added and used in frontend

    # Set manually at a later point in time
    object_emissions: pd.Series | None = Field(exclude=True, default=None)

    @model_validator(mode="after")
    def check_unit(self):
        if not is_weight(self.unit):
            raise UnitMismatchError
        if str(self.unit) != "kg":
            raise NotImplementedError(
                f'ProcessEmissions needs to be instantiated with unit set to KG_CO2E (got "{str(self.unit)}").'
            )
        return self

    @cached_property
    def event_emissions(self) -> pd.Series:
        """Adds imported_event_emissions and rule_event_emissions."""
        if self.imported_event_emissions is not None and self.rule_event_emissions is not None:
            return (
                pd_util.concat_dfs(
                    [
                        self.imported_event_emissions.to_frame(),
                        self.rule_event_emissions.to_frame(),
                    ],
                    columns=[EMISSIONS_KG_NAME],
                )
                .fillna(0)
                .groupby(level="ocel:eid")[EMISSIONS_KG_NAME]
                .agg("sum")
            )
        if self.imported_event_emissions is not None:
            return self.imported_event_emissions
        if self.rule_event_emissions is not None:
            return self.rule_event_emissions
        # event_emissions: Series, index ocel:eid
        raise ValueError("No event emission data is set - cannot compute event_emissions")

    @cached_property
    def e2o_emissions(self) -> pd.Series:
        if self.rule_e2o_emissions is not None:
            return self.rule_e2o_emissions
        return pd.Series(
            [],
            name=EMISSIONS_KG_NAME,
            index=pd.MultiIndex.from_tuples([], names=["ocel:eid", "ocel:oid"]),
        )
        # e2o_emissions: Series, multiindex [ocel:eid, ocel:oid]

    @cached_property
    def total_event_emissions(self) -> pd.DataFrame:
        """Computes the sum of event and E2O emissions for each event."""
        event_emissions = self.event_emissions
        e2o_emissions = self.e2o_emissions
        assert event_emissions.name == EMISSIONS_KG_NAME and e2o_emissions.name == EMISSIONS_KG_NAME

        if not event_emissions.empty or not e2o_emissions.empty:
            return self.ocel.events.join(
                (
                    pd_util.concat_dfs(
                        [
                            event_emissions.to_frame(),
                            e2o_emissions.to_frame().droplevel("ocel:oid"),
                        ],
                        columns=[EMISSIONS_KG_NAME],
                    )
                    .groupby(level="ocel:eid")[EMISSIONS_KG_NAME]
                    .agg("sum")
                ),
                on="ocel:eid",
                how="left",
            )
        else:
            total_event_emissions = self.ocel.events.copy()
            total_event_emissions[EMISSIONS_KG_NAME] = np.nan
            return total_event_emissions
        # total_event_emissions: DataFrame, default index, columns like ocel.events + EMISSIONS_KG_NAME.

    @computed_field
    @cached_property
    def overall_emissions(self) -> float:
        result = self.total_event_emissions[EMISSIONS_KG_NAME].fillna(0).sum()
        assert np.isclose(
            result, self.overall_imported_emissions + self.overall_rule_based_emissions
        )
        return result

    @computed_field
    @cached_property
    def overall_imported_emissions(self) -> float:
        if self.imported_event_emissions is None:
            return 0
        return self.imported_event_emissions.sum()

    @computed_field
    @cached_property
    def overall_rule_based_emissions(self) -> float:
        result = 0
        if self.rule_event_emissions is not None:
            result += self.rule_event_emissions.sum()
        if self.rule_e2o_emissions is not None:
            result += self.rule_e2o_emissions.sum()
        return result

    @computed_field
    @cached_property
    def activity_emissions(self) -> dict[str, NumberStats]:
        return agg_per_activity(self.total_event_emissions)

    @computed_field
    @property
    def state(self) -> EmissionsState:
        return EmissionsState(
            has_rule_based_emissions=(
                self.rule_event_emissions is not None or self.rule_e2o_emissions is not None
            ),
            # has_rule_based_emissions=self.overall_rule_based_emissions != 0,
            has_imported_emissions=self.imported_event_emissions is not None,
            has_object_emissions=self.object_emissions is not None,
        )


EVENT_EMISSIONS_COLUMNS = [
    "ocel:eid",
    "ocel:activity",
    "ocel:timestamp",
    EMISSIONS_KG_NAME,
]
E2O_EMISSIONS_COLUMNS = [
    "ocel:eid",
    "ocel:activity",
    "ocel:timestamp",
    "ocel:oid",
    "ocel:type",
    EMISSIONS_KG_NAME,
]


def agg_per_activity(total_event_emissions: pd.DataFrame) -> dict[str, NumberStats]:
    total_event_emissions = total_event_emissions.copy()
    total_event_emissions.fillna({EMISSIONS_KG_NAME: 0}, inplace=True)
    agg = [
        "count",
        "sum",
        "mean",
        "min",
        "median",
        "max",
        lambda xs: ((xs != 0) & xs.notna()).sum() / len(xs) if len(xs) != 0 else np.nan,
    ]
    return (
        total_event_emissions.groupby("ocel:activity")[EMISSIONS_KG_NAME]
        .agg(agg)
        .rename(columns={"<lambda>": "nonzero", "<lambda_0>": "nonzero"})
        .apply(lambda row: NumberStats(**row, empty=row["count"] == 0), axis=1)  # type: ignore
        .to_dict()
    )


class EmissionModel:

    def __init__(self, ocel: OCELWrapper):
        self.ocel = ocel
        self._rules: Sequence[EmissionRule] = []

        self.emissions: ProcessEmissions | None = None
        self.emissions_output_attrs: list[AttributeDefinition] = []
        self.alloc: Allocator | None = None

        # Instance-level cache object (using cachetools)
        self.cache = LRUCache(maxsize=128)
        self.cache_lock = Lock()

    def set_rules(self, rules: Sequence[EmissionRule]):
        self._rules = rules
        self.cache.clear()

    def set_imported_emissions(
        self,
        imported_event_emissions: pd.Series,
        *,
        unit: PintUnit,
    ) -> ProcessEmissions:
        assert imported_event_emissions.name == EMISSIONS_KG_NAME
        if not is_weight(unit):
            raise UnitMismatchError

        input_qty = ureg.Quantity(imported_event_emissions.values, unit)

        if self.emissions:
            # Emissions are already set. Extract rule-based results and keep unit.
            model_unit = self.emissions.unit
            rule_event_emissions = self.emissions.rule_event_emissions
            rule_e2o_emissions = self.emissions.rule_e2o_emissions

            if self.emissions.state.has_imported_emissions:
                # Imported emissions are already set. Overwrite, and issue a warning.
                overall_before = self.emissions.overall_imported_emissions * model_unit
                overall_after = imported_event_emissions.sum() * unit
                logger.warning(
                    f"Imported emissions are getting replaced in emission model (before: {overall_before}, after: {overall_after})"
                )
            if self.emissions.state.has_object_emissions:
                logger.warning(f"Object emissions are getting removed")

        else:
            # No emissions until now. ProcessEmissions will be initialized with just the new imported emissions.
            model_unit = KG_CO2E
            rule_event_emissions = None
            rule_e2o_emissions = None

        # Convert imported emissions to the unit inferred from current state
        imported_event_emissions = pd.Series(
            input_qty.to(model_unit).magnitude,
            name=EMISSIONS_KG_NAME,
            index=imported_event_emissions.index,
        )

        # make sure all dependent results are re-computed! Thus, always new object.
        self.emissions = ProcessEmissions(
            imported_event_emissions=imported_event_emissions,
            rule_event_emissions=rule_event_emissions,
            rule_e2o_emissions=rule_e2o_emissions,
            unit=model_unit,
        )
        return self.emissions

    @instance_lru_cache(ignore_task=True)
    def calculate_emissions(self, task: Task | None = None) -> ProcessEmissions:

        if self._rules:
            results = [rule.apply() for rule in self._rules]
            event_emissions = (
                pd_util.concat_dfs(
                    [df for df, lvl in results if lvl == "event"], columns=EVENT_EMISSIONS_COLUMNS
                )
                .groupby("ocel:eid")[EMISSIONS_KG_NAME]
                .agg("sum")
            )
            e2o_emissions = (
                pd_util.concat_dfs(
                    [df for df, lvl in results if lvl == "e2o"], columns=E2O_EMISSIONS_COLUMNS
                )
                .groupby(["ocel:eid", "ocel:oid"])[EMISSIONS_KG_NAME]
                .agg("sum")
            )

            assert (
                event_emissions.name == EMISSIONS_KG_NAME
                and event_emissions.index.name == "ocel:eid"
            )
            assert e2o_emissions.name == EMISSIONS_KG_NAME and e2o_emissions.index.names == [
                "ocel:eid",
                "ocel:oid",
            ]
            # event_emissions: Series, index ocel:eid
            # e2o_emissions: Series, multiindex [ocel:eid, ocel:oid]
        else:
            # No rules, 0 emissions
            event_emissions = None
            e2o_emissions = None

        Task.prog(task, p=1)

        # make sure all dependent results are re-computed! Thus, always new object.
        self.emissions = ProcessEmissions(
            imported_event_emissions=(
                self.emissions.imported_event_emissions if self.emissions is not None else None
            ),
            rule_event_emissions=event_emissions,
            rule_e2o_emissions=e2o_emissions,
            unit=KG_CO2E,
        )
        return self.emissions

    def __str__(self) -> str:
        children_string = "[]"
        if self._rules:
            children_string = "[\n" + ",\n".join([indent(str(ec), 1) for ec in self._rules]) + "\n]"
        return f"EmissionModel({children_string})"

    def serialize(self) -> list[dict]:
        return [ec.model_dump() for ec in self._rules]

    @staticmethod
    def rules_hash(rules: Sequence[EmissionRule]) -> int:
        sorted_hashes = sorted([hash(ec) for ec in rules])
        return hash(json.dumps(sorted_hashes))

    def __hash__(self) -> int:
        return EmissionModel.rules_hash(self._rules)
