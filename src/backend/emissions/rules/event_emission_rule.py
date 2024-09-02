from __future__ import annotations

from typing import Literal

import pandas as pd

from api.model.ocean_units import KG_CO2E
from api.task_base import Task
from emissions.emission_model import EMISSIONS_KG_NAME
from emissions.rules.emission_rule import EmissionRule
from util.cache import instance_lru_cache


class EventEmissionRule(EmissionRule):
    type: Literal["EventEmissionRule"]

    @instance_lru_cache(ignore_task=True)
    def _apply(self, task: Task | None = None):
        events = self._prepare_events()

        # Apply emission factor
        emissions = self.factor.apply(events)

        events[EMISSIONS_KG_NAME] = emissions.to(KG_CO2E).magnitude  # type: ignore
        return events, "event"

    def _get_available_otypes(self) -> set[tuple[str, str | None]]:
        """Returns a list of those object types that are uniquely associated to events of the rule's activity.
        The information is provided for specific qualifiers as well as overall.
        The results are used to determine what object attributes can be used in the rule's factors.
        """
        unique_obj_otypes = self.ocel.unique_objects_per_activity()
        unique_obj_otypes = unique_obj_otypes[unique_obj_otypes["ocel:activity"] == self.activity]
        return {
            (row["ocel:type"], row["ocel:qualifier"]) for _, row in unique_obj_otypes.iterrows()
        }

    def directly_available_oattrs(self):
        # oattrs0: Attributes of target object
        return []

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
        oattrs1 = qualified_oattrs
        return oattrs1

    def _prepare_events(self) -> pd.DataFrame:
        events, attr_names, attr_cols = self._events_with_attribute_values()
        return events

    def __str__(self):
        values = [str(self.factor)]
        guards = []
        # if self.attribute_filters:
        #     guards += [f"{k} == {v}" for k, v in self.attribute_filters.items()]
        return f"EventEmissionRule ({self.activity}: {' + '.join(values)}{' [' + ' && '.join(guards) + ']' if guards else ''})"

    def _get_default_name(self):
        return f"{self.activity}: {self.factor.to_string('compact')}"
