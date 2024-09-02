from __future__ import annotations

import json
import sqlite3
from typing import Annotated, Literal

from pydantic import StringConstraints, ValidationInfo, field_serializer

from api.model.emissions import EmissionRuleDiscr
from api.model.ocean_units import Unit
from api.model.with_ocel import ModelWithOcel, model_ocel_validator

# if TYPE_CHECKING:
from ocel.attribute import AttributeDefinition, OCELAttribute
from ocel.ocel_wrapper import OCELWrapper
from units.pint import dimensionless
from util.types import PathLike

Color = Annotated[str, StringConstraints(pattern=r"#?(?:[0-9a-fA-F]{3}){1,2}")]

ObjectTypeClass = Literal["handling_unit", "resource"]
# ActivityClass = Literal["operation", "transport"]

APP_STATE_TABLE = "ocean_app_state"


class ObjectAllocationConfig(ModelWithOcel):
    target_object_types: set[str]
    rule: Literal["AllTargets", "ParticipatingTargets", "ClosestTargets"]
    graph_mode: Literal["full", "HU"] | None = None
    remove_otype_loops: bool | None = None
    max_distance: int | Literal[False] | None = None

    @model_ocel_validator()
    def check_ocel_components(self, ocel: OCELWrapper | None, info: ValidationInfo):
        if ocel:
            if not ocel.has_object_types(self.target_object_types):
                raise ValueError("Unknown object types")
        return self

    @field_serializer("target_object_types", when_used="json")
    def serialize_target_object_types(self, target_object_types):
        return sorted(target_object_types)


class AppState(ModelWithOcel):
    object_type_colors: dict[str, Color] | None = None
    object_type_classes: dict[str, ObjectTypeClass] | None = None
    attribute_units: list[AttributeDefinition] | None = None
    emission_attributes: list[AttributeDefinition] | None = None
    emission_rules: list[EmissionRuleDiscr] | None = None
    object_allocation_config: ObjectAllocationConfig | None = None

    @model_ocel_validator()
    def check_ocel_components(self, ocel: OCELWrapper | None, info: ValidationInfo):
        if ocel:
            if self.object_type_colors and not ocel.has_object_types(
                self.object_type_colors.keys()
            ):
                raise ValueError("Unknown object types")
            if self.object_type_classes and not ocel.has_object_types(
                self.object_type_classes.keys()
            ):
                raise ValueError("Unknown object types")
            # validate_attribute_definition(self, ocel)
        return self

    @property
    def hu_otypes(self):
        if self.object_type_classes is None:
            return set(self.ocel.otypes)
        return {
            ot
            for ot in self.ocel.otypes
            if self.object_type_classes.get(ot, "handling_unit") == "handling_unit"
        }

    @property
    def resource_otypes(self):
        return set(self.ocel.otypes).difference(self.hu_otypes)

    def get_attribute_unit(self, attr: OCELAttribute) -> Unit | None:
        if not self.attribute_units:
            return None
        attr_units = [a for a in self.attribute_units if attr.matches_definition(a)]
        if not attr_units:
            return dimensionless
        if len(attr_units) == 1:
            return attr_units[0].unit
        raise ValueError(
            f"Duplicate attribute unit definition for '{attr.name}':\n"
            + ",\n".join([str(au) for au in attr_units])
        )

    def get_attribute_definition(self, attr: OCELAttribute) -> AttributeDefinition | None:
        unit = self.get_attribute_unit(attr)
        if unit is None:
            unit = dimensionless
        return attr.to_definition(unit=unit)

    @property
    def empty(self):
        return not any(bool(v) for k, v in iter(self))

    def export_sqlite(self, path: PathLike):
        data = [
            (k, json.dumps(v)) for k, v in self.model_dump(mode="json").items() if v is not None
        ]
        con = sqlite3.connect(path)
        con.execute(f"DROP TABLE IF EXISTS {APP_STATE_TABLE}")
        con.execute(
            f"CREATE TABLE {APP_STATE_TABLE} (key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL)"
        )
        con.executemany(f"INSERT INTO {APP_STATE_TABLE} (key, value) VALUES (?, ?)", data)
        con.commit()
        con.close()
        return True

    @staticmethod
    def import_sqlite(path: PathLike, *, ocel: OCELWrapper) -> AppState:
        con = sqlite3.connect(path)
        res = con.execute(
            f"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{APP_STATE_TABLE}';"
        ).fetchall()
        if res[0][0] != 1:
            # No app state metadata. Return empty app state
            data = {}
        else:
            res = con.execute(f"SELECT key, value FROM {APP_STATE_TABLE}").fetchall()
            data = {k: json.loads(v) for k, v in res}
        con.commit()
        con.close()

        return AppState.instantiate(data, ocel=ocel)
