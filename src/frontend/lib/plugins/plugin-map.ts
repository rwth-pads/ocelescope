// 🚨 AUTO-GENERATED FILE — DO NOT EDIT
import berti_plugin from "@/plugins/berti";
import R0 from "@/plugins/berti/pages/ocdfg";
import R1 from "@/plugins/berti/pages/petrinet";
import ocelot_plugin from "@/plugins/ocelot";
import R2 from "@/plugins/ocelot/pages/eventOverview";
import R3 from "@/plugins/ocelot/pages/events";
import R4 from "@/plugins/ocelot/pages/objectOverview";
import R5 from "@/plugins/ocelot/pages/objects";
import totem_plugin from "@/plugins/totem";
import R6 from "@/plugins/totem/pages/mine";

const pluginMap = {
  berti: {
    ...berti_plugin,
    routes: {
      ocdfg: R0,
      ocpn: R1,
    },
  },
  ocelot: {
    ...ocelot_plugin,
    routes: {
      eventOverview: R2,
      events: R3,
      objectOverview: R4,
      objects: R5,
    },
  },
  totem: {
    ...totem_plugin,
    routes: {
      mine: R6,
    },
  },
} as const;

export default pluginMap;
