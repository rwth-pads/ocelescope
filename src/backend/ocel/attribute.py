from __future__ import annotations

from dataclasses import asdict, dataclass
from functools import cached_property
from typing import TYPE_CHECKING, Annotated, Any, Literal

import numpy as np
import pandas as pd
from pydantic import Field, ValidationInfo
from pydantic.alias_generators import to_camel

from api.model.ocean_units import Unit
from api.model.with_ocel import ModelWithOcel, NoOcelError, model_ocel_validator
from ocel.utils import join_current_attr_values
from units.pint import PintUnit

if TYPE_CHECKING:
    from api.session import Session
    from ocel.ocel_wrapper import OCELWrapper


class AttributeDefinitionBase(ModelWithOcel):
    target: Literal["event", "object"]
    name: str
    unit: Unit | None = None

    @cached_property
    def attr_data(self) -> OCELAttribute:
        if not self.ocel:
            raise NoOcelError
        attr = self.ocel.find_attribute(definition=self)  # type: ignore
        if not attr:
            raise ValueError
        return attr


class EventAttributeDefinition(AttributeDefinitionBase):
    target: Literal["event"]  # type: ignore
    activity: str

    @model_ocel_validator()
    def check_activity_and_attribute(self, ocel: OCELWrapper | None, info: ValidationInfo):
        if ocel:
            if self.activity not in ocel.activities:
                raise ValueError("Unknown activity")
            validate_attribute_definition(self, ocel)
        return self


class ObjectAttributeDefinition(AttributeDefinitionBase):
    target: Literal["object"]  # type: ignore
    object_type: str
    dynamic: bool

    @model_ocel_validator()
    def check_object_type_and_attribute(self, ocel: OCELWrapper | None, info: ValidationInfo):
        if ocel:
            if self.object_type not in ocel.otypes:
                raise ValueError("Unknown object type")
            validate_attribute_definition(self, ocel)
        return self


AttributeDefinition = Annotated[
    EventAttributeDefinition | ObjectAttributeDefinition,
    Field(discriminator="target"),
]


def validate_attribute_definition(attr: AttributeDefinitionBase, ocel: OCELWrapper):
    if isinstance(attr, EventAttributeDefinition):
        ocel_attr = ocel.find_attribute(activity=attr.activity, name=attr.name)
        if not ocel_attr:
            raise ValueError("Event attribute not found")
    elif isinstance(attr, ObjectAttributeDefinition):
        ocel_attr = ocel.find_attribute(otype=attr.object_type, name=attr.name)
        if not ocel_attr:
            raise ValueError("Object attribute not found")
        if attr.dynamic != ocel_attr.dynamic:
            raise ValueError("Object attribute not found")
    return attr


# TODO when changing to Model, use response_model_exclude_unset in route
# https://fastapi.tiangolo.com/tutorial/response-model/#use-the-response_model_exclude_unset-parameter


@dataclass(frozen=True, eq=False)
# @dataclass(eq=False)
class OCELAttribute:
    # Attribute definition
    name: str
    target: Literal["event", "object"]
    num_values: int
    numeric: bool
    type: str
    dynamic: bool
    otype: str | None = None
    activity: str | None = None
    availability: dict[str, float] | None = None
    # Numeric attribute stats
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    median: float | None = None
    # Categorical attribute stats
    mode: Any | None = None
    mode_frequency: int | None = None
    frequent_values: dict[Any, int] | None = None
    num_unique: int | None = None

    def __post_init__(self):
        d = {k: v for k, v in asdict(self).items() if v is not None}
        object.__setattr__(self, "_dict", d)

    def to_dict(self):
        return getattr(self, "_dict")

    def to_api(self) -> dict[str, Any]:
        key_renamer = {"otype": "objectType"}
        return {key_renamer.get(k, to_camel(k)): v for k, v in self.to_dict().items()}

    def to_definition(
        self,
        *,
        unit: PintUnit | None = None,
    ) -> AttributeDefinition:
        unit_model: Unit | None = unit  # type: ignore
        if self.target == "event":
            assert self.activity
            return EventAttributeDefinition(
                target="event",
                activity=self.activity,
                name=self.name,
                unit=unit_model,
            )
        elif self.target == "object":
            assert self.otype
            return ObjectAttributeDefinition(
                target="object",
                object_type=self.otype,
                name=self.name,
                unit=unit_model,
                dynamic=bool(self.dynamic),
            )
        raise TypeError

    def matches_definition(
        self,
        au: AttributeDefinition,
        test_units: bool = False,
    ) -> bool:
        if test_units:
            raise NotImplementedError
        if self.target != au.target:
            return False
        if self.target == "event" and isinstance(au, EventAttributeDefinition):
            if self.name != au.name:
                return False
            if self.activity != au.activity:
                return False
            return True
        if self.target == "object" and isinstance(au, ObjectAttributeDefinition):
            if self.name != au.name:
                return False
            if self.otype != au.object_type:
                return False
            if self.dynamic != au.dynamic:
                return False
            return True
        raise TypeError

    @staticmethod
    def init_attributes(ocel: OCELWrapper) -> list[OCELAttribute]:
        return [
            OCELAttribute(**attr)  # type: ignore
            for attr in ocel.attr_info.rename(
                columns={"ocel:type": "otype", "ocel:activity": "activity", "ocel:field": "name"}
            ).to_dict("records")
        ]

    @staticmethod
    def reset_attributes_cache(ocel: OCELWrapper):
        del ocel.cache[("attr_info",)]
        del ocel.cache[("attributes",)]
        ocel._attr_info_initialized = False
        # access .attributes to re-compute attr data
        _attributes = ocel.attributes

    def __str__(self):
        d = self.to_dict()
        return type(self).__name__ + "(" + ", ".join([f"{k}={v}" for k, v in d.items()]) + ")"

    def __repr__(self):
        return str(self)

    def __eq__(self, other) -> bool:
        if not isinstance(other, OCELAttribute):
            return False
        return (
            self.target == other.target
            and self.name == other.name
            and self.activity == other.activity
            and self.otype == other.otype
        )

    def __hash__(self):
        # Simplify hashing, only using properties necessary to identify attribute
        return hash((self.target, self.otype, self.activity, self.name))


def attribute_info(ocel: OCELWrapper) -> pd.DataFrame:
    """Collects event/object attributes from a pm4py OCEL.
    An attribute is always linked to a specific type (activity / object type). Object attributes can be static or dynamic.
    Returns a DataFrame listing all attributes and providing some basic descriptive statistics.
    """
    common_info_cols = ["ocel:field", "numeric"]
    oattr_info_cols = [*common_info_cols, "ocel:type", "dynamic", "availability"]
    eattr_info_cols = [*common_info_cols, "ocel:activity"]
    # ----- DYNAMIC OBJECT ATTRIUBUTES --------------------------------------------------
    if ocel.oattr_names_dynamic:
        # Convert dynamic attribute data (from ocel.object_changes) to key-value pairs
        oattrs_dynamic_values = ocel.object_changes.melt(
            id_vars=["ocel:oid", "ocel:type", "ocel:timestamp", "ocel:field", "@@cumcount"],
            value_vars=ocel.oattr_names_dynamic,
            var_name="ocel:field_2",
            value_name="ocel:value",
        ).dropna(subset="ocel:value")
        assert (
            oattrs_dynamic_values["ocel:field"] == oattrs_dynamic_values["ocel:field_2"]
        ).all(), "ocel.object_changes is malformatted"
        oattrs_dynamic_values.drop(columns=["ocel:field_2"], inplace=True)
        oattrs_dynamic_info = (
            oattrs_dynamic_values.groupby(["ocel:type", "ocel:field"])["ocel:value"]
            .apply(aggregate_attribute_values)
            .unstack()
            .reset_index()
        )
        # Add E2O availability percentage
        attr_values = join_current_attr_values(
            ocel,
            oattrs_dynamic=ocel.oattr_names_dynamic,
            oattrs_static=[],
            otypes=oattrs_dynamic_info["ocel:type"].unique().tolist(),
        )
        e2o_availability = (
            attr_values.groupby(["ocel:type", "ocel:activity"])[ocel.oattr_names_dynamic]  # type: ignore
            .agg(lambda xs: 1 - xs.isna().sum() / len(xs))
            .reset_index()
        )
        e2o_availability = e2o_availability.melt(
            id_vars=["ocel:type", "ocel:activity"], var_name="ocel:field", value_name="availability"
        )
        e2o_availability.sort_values(
            ["ocel:type", "ocel:field", "availability"],
            ascending=[True, True, False],
            inplace=True,
            ignore_index=True,
        )
        e2o_availability = (
            e2o_availability.set_index(["ocel:type", "ocel:field", "ocel:activity"])
            .groupby(level=[0, 1])["availability"]
            .agg(lambda xs: xs.to_dict())
        )
        e2o_availability = e2o_availability.apply(
            lambda d: {act: a for (_, _, act), a in d.items()}
        )
        oattrs_dynamic_info = oattrs_dynamic_info.merge(
            e2o_availability, on=["ocel:type", "ocel:field"]
        )
        oattrs_dynamic_info["availability"] = oattrs_dynamic_info["availability"].where(
            oattrs_dynamic_info["availability"].notna(), lambda x: [{}]
        )
        oattrs_dynamic_info["dynamic"] = True
    else:
        oattrs_dynamic_info = pd.DataFrame([], columns=oattr_info_cols)

    # ----- STATIC OBJECT ATTRIUBUTES --------------------------------------------------
    if ocel.oattr_names_static:
        # Convert static attribute data (from ocel.objects) to key-value pairs
        oattrs_static_values = ocel.objects.melt(
            id_vars=["ocel:oid", "ocel:type"],
            value_vars=ocel.oattr_names_static,
            var_name="ocel:field",
            value_name="ocel:value",
        ).dropna(subset="ocel:value")
        oattrs_static_info = (
            oattrs_static_values.groupby(["ocel:type", "ocel:field"])["ocel:value"]
            .apply(aggregate_attribute_values)
            .unstack()
            .reset_index()
        )
        oattrs_static_info["dynamic"] = False
    else:
        oattrs_static_info = pd.DataFrame([], columns=oattr_info_cols)

    # Merge dynamic & static object attributes
    oattrs_info = pd.concat([oattrs_dynamic_info, oattrs_static_info], ignore_index=True)
    oattrs_info["target"] = "object"
    # Delete static attribute when it represents the final values of a dynamic attribute
    oattrs_info = (
        oattrs_info.sort_values(
            ["ocel:type", "ocel:field", "dynamic"], ascending=[True, True, False]
        )
        .groupby(["ocel:type", "ocel:field"], as_index=False)
        .first()
    )

    # ----- EVENT ATTRIUBUTES --------------------------------------------------
    if ocel.eattr_names:
        # Convert event attribute data (from ocel.events) to key-value pairs
        eattrs_values = ocel.events.melt(
            id_vars=["ocel:eid", "ocel:activity"],
            value_vars=ocel.eattr_names,
            var_name="ocel:field",
            value_name="ocel:value",
        ).dropna(subset="ocel:value")
        eattrs_info = (
            eattrs_values.groupby(["ocel:activity", "ocel:field"])["ocel:value"]
            .apply(aggregate_attribute_values)
            .unstack()
            .reset_index()
        )
        eattrs_info["target"] = "event"
        eattrs_info["dynamic"] = False
    else:
        eattrs_info = pd.DataFrame([], columns=eattr_info_cols)

    # ----- MERGE ALL --------------------------------------------------
    attrs_info = pd.concat([oattrs_info, eattrs_info], ignore_index=True)
    attrs_info.sort_values(
        ["target", "ocel:activity", "ocel:type", "ocel:field", "dynamic"],
        inplace=True,
        ignore_index=True,
    )
    attrs_info = attrs_info.astype(
        {
            "dynamic": bool,
            "numeric": bool,
            "ocel:activity": "string",
            "ocel:field": "string",
            "num_values": "int",
            "type": "string",
        }
    )
    first_cols = ["target", "ocel:type", "ocel:activity", "ocel:field", "dynamic", "num_values"]
    attrs_info = attrs_info[
        first_cols + [col for col in attrs_info.columns if col not in first_cols]
    ]
    attrs_info = attrs_info.replace([np.nan], [None])

    ocel._attr_info_initialized = True
    return attrs_info


def aggregate_attribute_values(values: pd.Series):
    """Aggregates all values of an event/object attribute and computes some basic descriptive statistics.
    Determines whether an attribute is numeric or categorical.
    If an attribute contains any numeric value, it is considered numeric.
    """
    numeric_values = pd.to_numeric(values, errors="coerce")
    value_type = values.dtype
    type_set = set(values.apply(lambda x: type(x).__name__))
    if len(type_set) == 1:
        value_type = list(type_set)[0]

    common = {
        "num_values": values.count(),
        "type": value_type,
    }

    if numeric_values.isna().all():
        # Not numeric
        value_counts = values.value_counts()
        return pd.Series(
            {
                **common,
                "numeric": False,
                "mode": value_counts.idxmax() if not values.empty else None,
                "mode_frequency": value_counts.max() if not values.empty else None,
                "frequent_values": value_counts[:5].to_dict(),
                "num_unique": len(value_counts),
            }
        )
    else:
        # Numeric
        return pd.Series(
            {
                **common,
                "numeric": True,
                "min": numeric_values.min(),
                "max": numeric_values.max(),
                "mean": numeric_values.mean(),
                "median": numeric_values.median(),
            }
        )


def rename_attributes(
    renamer: dict[str, str],
    /,
    *,
    session: Session | None = None,
    ocel: OCELWrapper | None = None,
):
    """Renames attributes as specified in a dict. As multiple attributes with the same name (on different activities / object types) share the same DataFrame column, all of those attributes are renamed together.
    As this function clears the OCEL cache but needs attribute information, it should be called only once when multiple attributes are renamed.
    """
    raise NotImplementedError("rename_attributes() is deprecated/untested")
    if ocel is None:
        assert session is not None
        ocel = session.ocel

    # Check all names are valid
    non_existing = set(renamer.keys()).difference({attr.name for attr in ocel.attributes})
    if non_existing:
        raise ValueError(
            f"rename_attributes: non-existing old name(s) " + ", ".join(sorted(non_existing))
        )
    assert all(renamer.keys()) and not any(
        old.startswith("ocel:") for old in renamer.keys()
    ), "rename_attributes: invalid old name(s)"
    assert all(renamer.values()) and not any(
        new.startswith("ocel:") for new in renamer.values()
    ), "rename_attributes: invalid new name(s)"

    attrs = [attr for attr in ocel.attributes if attr.name in renamer]

    # Rename Attribute objects
    for attr in attrs:
        new = renamer[attr.name]
        object.__setattr__(attr, "name", new)
        if hasattr(attr, "_dict"):
            attr.to_dict()["name"] = new

    # Rename in AppState
    if session and session.app_state:
        # TODO rename in attribute_units
        if session.app_state.attribute_units:
            for attr_unit in session.app_state.attribute_units:
                if attr_unit.name in renamer:
                    attr_unit.name = renamer[attr_unit.name]
        if session.app_state.emission_rules:
            # TODO Rename in emission rules
            # TODO rename in emission factor
            # - if they use strings and not Attribute objects
            # - if they use Attribute objects and here the OCEL cache is just cleared, creating new renamed objects after that
            for er in session.app_state.emission_rules:
                attributes, eattrs, oattrs = er.attributes_used
                if attributes:
                    if any(qa.attribute.name in renamer for qa in attributes):
                        raise NotImplementedError(f"TODO rename attribute in emission factor")

    # TODO rename in emission model

    # Rename in OCEL DataFrames
    targets = {attr.target for attr in attrs}
    if "event" in targets:
        ocel.events.rename(columns=renamer, inplace=True, errors="ignore")
    if "object" in targets:
        ocel.objects.rename(columns=renamer, inplace=True, errors="ignore")
        ocel.object_changes.rename(columns=renamer, inplace=True, errors="ignore")
        # ocel.object_changes["ocel:field"].replace(renamer, inplace=True)
        ocel.object_changes.replace({"ocel:field": renamer}, inplace=True)

    # Update or forget cached OCEL properties
    ocel.cache.clear()  # TODO this should only be used when this function is called ONCE on unit detection -> use dict
    ocel._attr_info_initialized = False
    # ocel.attr_info.replace({"ocel:field": renamer}, inplace=True)
    # ocel.eattr_names.cache_clear()
