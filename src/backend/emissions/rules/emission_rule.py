from __future__ import annotations

import functools
import json
from abc import ABC, abstractmethod
from threading import Lock
from typing import TYPE_CHECKING, Any, Literal, Sequence, final

import pandas as pd
from cachetools import LRUCache
from pydantic import Field, ValidationInfo, computed_field

from api.model.with_ocel import ModelWithOcel, model_ocel_validator
from api.task_base import Task
from emissions.factors.emission_factor import EmissionFactor
from emissions.utils import otq
from ocel.attribute import AttributeDefinition, ObjectAttributeDefinition, OCELAttribute
from ocel.utils import join_current_attr_values
from units.pint import is_dimensionless, is_weight
from util.cache import instance_lru_cache
from util.misc import snake_case

if TYPE_CHECKING:
    from ocel.ocel_wrapper import OCELWrapper


EmissionsLevel = Literal["event", "e2o", "object"]


class EmissionRule(ModelWithOcel, ABC):
    index: int
    name: str | None = None
    activity: str
    # Object type / qualifier for object attribute source is NOT specified here.
    # Factors can extract attribute values from any unique object related to the events.
    factor: EmissionFactor
    ignore_unit: bool = Field(
        default=False,
        exclude=True,
        description="Disables validation of the result unit being a weight.",
    )
    # climatiq_factor_id: str | None = None  # Factor to multiply with attribute value

    def model_post_init(self, __context: Any, /) -> None:
        super().model_post_init(__context)
        # Only compute the hash when asked for - in case subclasses call super().__post_init__() first and then change some value.
        object.__setattr__(self, "_hash", None)  # bypass frozen
        # Instance-level cache object (using cachetools)
        object.__setattr__(self, "cache", LRUCache(maxsize=128))  # bypass frozen
        object.__setattr__(self, "cache_lock", Lock())  # bypass frozen

    @computed_field
    def default_name(self) -> str:
        return self._get_default_name()

    def _get_default_name(self) -> str: ...

    @property
    def task_name(self) -> str:
        return snake_case(type(self).__name__).upper()

    @abstractmethod
    def __str__(self) -> str: ...

    @final
    def __repr__(self) -> str:
        return str(self)

    @final
    def __eq__(self, other) -> bool:
        if not isinstance(other, EmissionRule):
            return False
        return hash(self) == hash(other)

    @final
    def __hash__(self) -> int:
        _hash = getattr(self, "_hash", None)
        if _hash is not None:
            return _hash
        _hash = hash(json.dumps(self.model_dump(), sort_keys=True))
        object.__setattr__(self, "_hash", _hash)  # bypass frozen
        return _hash

    @final
    # TODO When the OCEL changes, need to re-initialize all EmissionRule objects.
    # (Or re-assign and clear cache manually)
    @instance_lru_cache(ignore_task=True)
    def apply(self, task: Task | None = None) -> tuple[pd.DataFrame, EmissionsLevel]:
        emissions, level = self._apply(task=task)
        return emissions, level

    @abstractmethod
    def _apply(self, task: Task | None) -> tuple[pd.DataFrame, EmissionsLevel]: ...

    @abstractmethod
    def _get_available_otypes(self) -> set[tuple[str, str | None]]: ...

    @model_ocel_validator(error=True)
    def check_emission_rule(self, ocel: OCELWrapper | None, info: ValidationInfo):
        assert ocel
        if self.activity not in ocel.activities:
            raise ValueError(f"Unknown activity '{self.activity}'")

        # Validate attribute availability
        attributes, eattrs, oattrs = self.attributes_used
        oattr_otypes = {(ot, q) for ot, q, _attr in oattrs}
        available_otypes = self._get_available_otypes()
        non_available_otypes = oattr_otypes.difference(available_otypes)
        if non_available_otypes:
            raise ValueError(
                f"Emission factor uses attributes of not (uniquely) related object types ({', '.join([otq(ot, q) for ot, q in non_available_otypes])})"
            )

        if any(ocel.find_attribute(qa.attribute) is None for qa in attributes):
            raise ValueError(f"Emission factor uses attributes that do not exist")

        # Check object attribute qualifier filters
        for ot, q, oa in oattrs:
            qualifiers = self.ocel.get_qualifiers(activity=self.activity, otype=ot)
            if not qualifiers:
                raise ValueError(f"Activity '{self.activity}' is not related to object type '{ot}'")
            if q is not None and q not in qualifiers:
                raise ValueError(
                    f"Qualifier '{q}' is not available for activity '{self.activity}' and object type '{ot}'"
                )
            # If qualifier is unique, change qualifier=None to that qualifier.
            # TODO (not applied here.)

        non_available_eattrs = [ea for ea in eattrs if ea.activity != self.activity]
        if non_available_eattrs:
            raise ValueError(
                f"Emission factor uses {len(non_available_eattrs)} attributes that are not available for activity '{self.activity}'"
            )

        # Check factor result unit
        if not self.ignore_unit:
            result_unit = self.factor.get_result_unit()
            # input_unit = self.factor.get_input_unit()

            if not is_weight(result_unit):
                raise ValueError(
                    f"Emission factor requires weight result but yields {result_unit if not is_dimensionless(result_unit) else 'dimensionless number'}"
                )
        return self

    @functools.cached_property
    def attributes_used(self):
        attributes = self.factor.get_attributes_used()
        eattrs = [qa.attribute for qa in attributes if qa.attribute.target == "event"]
        oattrs = [
            (qa.attribute.object_type, qa.qualifier, qa.attribute)
            for qa in attributes
            if qa.attribute.target == "object"
        ]
        return attributes, eattrs, oattrs

    def directly_used_oattrs(
        self,
    ) -> list[tuple[str, str | None, ObjectAttributeDefinition]]:
        """Returns the list of object attributes available from a target object type (E2OEmissionRule only).
        Only includes those attributes used by the emission factor."""
        _, _, oattrs = self.attributes_used
        directly_available_oattrs = self.directly_available_oattrs()
        available_by_name = [(ot, q, oa.name) for ot, q, oa in directly_available_oattrs]
        # Get attributes that are available AND in use, and return ObjectAttributeDefinition
        return [(ot, q, oa) for ot, q, oa in oattrs if (ot, q, oa.name) in available_by_name]

    def uniquely_used_oattrs(
        self,
    ) -> list[tuple[str, str | None, ObjectAttributeDefinition]]:
        """Returns the list of object attributes available from uniquely related objects per type/qualifier.
        Only includes those attributes used by the emission factor."""
        _, _, oattrs = self.attributes_used
        uniquely_available_oattrs = self.uniquely_available_oattrs()
        available_by_name = [(ot, q, oa.name) for ot, q, oa in uniquely_available_oattrs]
        # Get attributes that are available AND in use, and return ObjectAttributeDefinition
        return [(ot, q, oa) for ot, q, oa in oattrs if (ot, q, oa.name) in available_by_name]

    def available_eattrs(self) -> list[OCELAttribute]:
        return [
            ea
            for ea in self.ocel.attributes
            if ea.target == "event" and ea.activity == self.activity
        ]

    def directly_available_oattrs(
        self,
    ) -> list[tuple[str, str | None, OCELAttribute]]:
        """Returns the list of object attributes available from a target object type (E2OEmissionRule only)."""
        ...

    def uniquely_available_oattrs(
        self,
    ) -> list[tuple[str, str | None, OCELAttribute]]:
        """Returns the list of object attributes available from uniquely related objects per type/qualifier."""
        ...

    def _events_with_attribute_values(self) -> tuple[
        pd.DataFrame,
        Sequence[tuple[tuple[str, str | None, AttributeDefinition], str]],
        Sequence[str],
    ]:
        """Builds the DataFrame of events relevant for this rule (activity filter).
        Adds all attribute values used by the emission factor linked to this rule.
        This can include
        - event attributes,
        - object attributes of uniquely available objects per type,
        - object attributes of the target object type (E2OEmissionRule).
        Returns the event DataFrame and information about the list of attributes included as well as their column names.
        """
        _, eattrs, oattrs = self.attributes_used
        oattrs0 = self.directly_used_oattrs()
        oattrs1 = self.uniquely_used_oattrs()

        rel_types = pd.DataFrame(
            [(ot, q) for ot, q, _ in oattrs1], columns=["ocel:type", "ocel:qualifier"]
        )
        rel_types_any_qual = rel_types[rel_types["ocel:qualifier"].isna()]
        rel_types_qual = rel_types[
            rel_types["ocel:qualifier"].notna()
            & ~rel_types["ocel:type"].isin(rel_types_any_qual["ocel:type"])
        ]

        # Filter e2o relations by otype/qualifier required by factor attribute specifications
        # Pre-filter by activity and otypes
        ev_cols = [col for col in self.ocel.events.columns if col.startswith("ocel:")] + [
            ea.name for ea in eattrs
        ]
        events = self.ocel.events[self.ocel.events["ocel:activity"] == self.activity][ev_cols]

        relations = self.ocel.filter_relations(
            activity=self.activity, otypes=set(rel_types["ocel:type"])
        )
        # relations = relations[relations["ocel:eid"].isin(eids)]
        # Filter e2o relations without qualifier filtering
        rel_any_qual = relations[relations["ocel:type"].isin(rel_types_any_qual["ocel:type"])]
        # Filter e2o relations with qualifier (use merge as filter)
        rel_qual = relations[relations["ocel:type"].isin(rel_types_qual["ocel:type"])].merge(
            rel_types_qual,
            on=["ocel:type", "ocel:qualifier"],
            how="inner",
        )
        # Join attribute values
        relations = (
            rel_any_qual
            if rel_qual.empty
            else (rel_qual if rel_any_qual.empty else pd.concat([rel_any_qual, rel_qual]))
        )
        attr_names: Sequence[tuple[tuple[str, str | None, AttributeDefinition], str]] = (
            [((ea.activity, None, ea), ea.name) for ea in eattrs]
            + [((ot, q, oa), f"{oa.name}({otq(ot, q)})") for ot, q, oa in oattrs0]
            + [((ot, q, oa), f"{oa.name}({otq(ot, q)})") for ot, q, oa in oattrs1]
        )

        relations = join_current_attr_values(
            ocel=self.ocel,
            relations=relations,
            # eattrs={attr.name for attr in eattrs},
            oattrs={attr.name for _, _, attr in oattrs1},
            disambiguate_names=attr_names,
        )

        # Merge object attributes of OTHER objects
        attr_cols = list(set(relations.columns).difference(self.ocel.relations.columns))
        if oattrs1:
            assert not relations.empty
            events = events.merge(
                relations.groupby("ocel:eid", as_index=False).agg(
                    {attr: "first" for attr in attr_cols}
                ),
                on="ocel:eid",
                how="left",
            )
        attr_cols = [ea.name for ea in eattrs] + attr_cols
        return events, attr_names, attr_cols
