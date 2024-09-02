from __future__ import annotations

from typing import TYPE_CHECKING, Literal

import pandas as pd
from pydantic import ValidationInfo

from api.model.ocean_units import KG_CO2E
from api.model.with_ocel import model_ocel_validator
from api.task_base import Task
from emissions.emission_model import EMISSIONS_KG_NAME
from emissions.rules.emission_rule import EmissionRule
from emissions.utils import otq
from ocel.utils import join_current_attr_values
from util.cache import instance_lru_cache

if TYPE_CHECKING:
    from ocel.ocel_wrapper import OCELWrapper


class E2OEmissionRule(EmissionRule):
    type: Literal["E2OEmissionRule"]
    object_type: str
    qualifier: str | None = None

    @model_ocel_validator(error=True)
    def check_e2o_emission_rule(self, ocel: OCELWrapper | None, info: ValidationInfo):
        assert ocel
        if self.object_type not in ocel.otypes:
            raise ValueError(f"Unknown object type '{self.object_type}'")
        qualifiers = self.ocel.get_qualifiers(activity=self.activity, otype=self.object_type)
        if not qualifiers:
            raise ValueError(
                f"Activity '{self.activity}' is not related to object type '{self.object_type}'"
            )
        if self.qualifier is not None and self.qualifier not in qualifiers:
            raise ValueError(
                f"Qualifier '{self.qualifier}' is not available for activity '{self.activity}' and object type '{self.object_type}'"
            )
        # If qualifier is unique, change qualifier=None to that qualifier.
        # if len(qualifiers) == 1:
        #     self.qualifier = qualifiers.pop()

        return self

    @instance_lru_cache(ignore_task=True)
    def _apply(self, task: Task | None = None):
        relations = self._prepare_relations()

        # Apply emission factor
        emissions = self.factor.apply(relations)

        relations[EMISSIONS_KG_NAME] = emissions.to(KG_CO2E).magnitude  # type: ignore
        return relations, "e2o"

    def _get_available_otypes(self) -> set[tuple[str, str | None]]:
        """Returns a list of those object types that are uniquely associated to events of the rule's activity.
        The information is provided for specific qualifiers as well as overall.
        The results are used to determine what object attributes can be used in the rule's factors.
        """
        unique_obj_otypes = self.ocel.unique_objects_per_activity()
        unique_obj_otypes = unique_obj_otypes[unique_obj_otypes["ocel:activity"] == self.activity]
        available_otypes: set[tuple[str, str | None]] = {
            (row["ocel:type"], row["ocel:qualifier"]) for _, row in unique_obj_otypes.iterrows()
        }
        # E2O level: Allow selected object type to be non-unique
        return {(self.object_type, self.qualifier)}.union(available_otypes)
        # DEPR Add all qualifiers (+None) to available otype/qualifier list
        # if self.qualifier is None:
        #     # all_qualifiers = self.ocel.get_qualifiers(
        #     #     otype=self.object_type, activity=self.activity
        #     # )
        #     return {(self.object_type, q) for q in all_qualifiers.union({None})}.union(
        #         available_otypes
        #     )
        # else:
        # selected_otype_qualifiers = [
        #     None,
        #     *self.ocel.get_qualifiers(otype=self.object_type, activity=self.activity),
        # ]
        # return {(self.object_type, q) for q in selected_otype_qualifiers}.union({
        #     (ot, q) for ot, q in available_otypes if ot != self.object_type
        # })

    def directly_available_oattrs(self):
        # oattrs0: Attributes of target object
        # oattrs0 = [
        #     (ot, q, oa)
        #     for ot, q, oa in oattrs
        #     if ot == self.object_type and (q == self.qualifier)
        #     # if ot == self.object_type and (self.qualifier is None or q == self.qualifier)
        # ]
        oattrs0 = [
            (self.object_type, self.qualifier, oa)
            for oa in self.ocel.attributes
            if oa.target == "object" and oa.otype == self.object_type and oa.numeric
        ]
        return oattrs0

    def uniquely_available_oattrs(self):
        # oattrs1: Attributes of all other objects (might be same otype as target, when both qualifiers are set and different)
        available_otypes = self._get_available_otypes()
        qualified_oattrs = sum(
            [
                [
                    (ot, q, oa)
                    for oa in self.ocel.attributes
                    if oa.target == "object" and oa.otype == ot and oa.numeric
                ]
                for ot, q in available_otypes
            ],
            [],
        )
        oattrs1 = [
            (ot, q, oa)
            for ot, q, oa in qualified_oattrs
            if ot != self.object_type
            or (self.qualifier is not None and q is not None and q != self.qualifier)
        ]
        return oattrs1

    def _prepare_relations(self) -> pd.DataFrame:
        oattrs0 = self.directly_used_oattrs()
        oattrs1 = self.uniquely_used_oattrs()
        events, attr_names, attr_cols = self._events_with_attribute_values()

        # Add attributes of target objects
        relations0 = self.ocel.filter_relations(
            activity=self.activity,
            otype=self.object_type,
            qualifier=self.qualifier,
        )
        # TODO Need to include qualifier in disambiguation when an otype is used as target (in relations0) and in relations1 with different qualifiers
        relations0 = join_current_attr_values(
            ocel=self.ocel,
            relations=relations0,
            oattrs={attr.name for _, _, attr in oattrs0},
            disambiguate_names=attr_names,
        )
        events = relations0.merge(events[["ocel:eid", *attr_cols]], on="ocel:eid", how="left")
        return events[
            [
                *[col for col in self.ocel.relations.columns if col in events.columns],
                *[col for col in events.columns if col not in self.ocel.relations.columns],
            ]
        ]

    def __str__(self):
        values = [str(self.factor)]
        guards = []
        # if self.attribute_filters:
        #     guards += [f"{k} == {v}" for k, v in self.attribute_filters.items()]
        return f"E2OEmissionRule ({otq(self.object_type, self.qualifier)} @ {self.activity}: {' + '.join(values)}{' [' + ' && '.join(guards) + ']' if guards else ''})"

    def _get_default_name(self):
        return f"{otq(self.object_type, self.qualifier)} @ {self.activity}: {self.factor.to_string('compact')}"
