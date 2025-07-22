from typing import Literal
import pm4py
from pydantic.fields import Field
from pydantic.main import BaseModel

from ocel.ocel_wrapper import OCELWrapper
from plugins.base import BasePlugin
from plugins.decorators import plugin_metadata, plugin_method


class PetriNetInput(BaseModel, frozen=True):
    variant: Literal["im", "imd"] = Field(
        title="Mining Variant",
        description="Variant of the inductive miner to use (“im” for traditional; “imd” for the faster inductive miner directly-follows).",
    )
    enable_token_based_replay: bool = Field(
        default=False,
        title="Enable Token Based Replay",
        description="Enable the computation of diagnostics using token-based replay.",
    )


@plugin_metadata(
    name="Berti Discovery",
    description="A plugin to discover object centric process models using the pm4py library",
    version="1",
)
class BertiDiscoverPlugin(BasePlugin):
    @plugin_method(label="Discover object centric Petri Net")
    def discover_petri_net(self, input: PetriNetInput, ocel: OCELWrapper):
        pm4py.discover_oc_petri_net(
            inductive_miner_variant=input.variant,
            ocel=ocel.ocel,
            diagnostics_with_tbr=input.enable_token_based_replay,
        )

    @plugin_method(label="Discover object centric directly follows graph")
    def discover_object_centric_dfg(self, ocel: OCELWrapper):
        pm4py.discover_ocdfg(
            ocel=ocel.ocel,
        )
