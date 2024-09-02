from typing import Annotated

from pydantic import Field

from emissions.rules.e2o_emission_rule import E2OEmissionRule
from emissions.rules.event_emission_rule import EventEmissionRule

EmissionRuleDiscr = Annotated[
    EventEmissionRule | E2OEmissionRule,
    Field(discriminator="type"),
]
