// 🚨 AUTO-GENERATED FILE — DO NOT EDIT
import ocelot_module from "@/modules/ocelot";
import R0 from "@/modules/ocelot/pages/eventOverview";
import R1 from "@/modules/ocelot/pages/events";
import R2 from "@/modules/ocelot/pages/objectOverview";
import R3 from "@/modules/ocelot/pages/objects";

const moduleMap = {
  ocelot: {
    ...ocelot_module,
    routes: {
      eventOverview: R0,
      events: R1,
      objectOverview: R2,
      objects: R3,
    },
  },
} as const;

export default moduleMap;
