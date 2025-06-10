// AUTO-GENERATED FILE — DO NOT EDIT MANUALLY

// Plugin: berti
import berti_petrinet, {
  config as berti_petrinet_config,
} from "@/plugins/berti/pages/petrinet";
// Plugin: ocelot
import ocelot_events, {
  config as ocelot_events_config,
} from "@/plugins/ocelot/pages/events";
import ocelot_objectGaph, {
  config as ocelot_objectGaph_config,
} from "@/plugins/ocelot/pages/objectGaph";
import ocelot_objects, {
  config as ocelot_objects_config,
} from "@/plugins/ocelot/pages/objects";
// Plugin: totem
import totem_mine, {
  config as totem_mine_config,
} from "@/plugins/totem/pages/mine";

export const pluginComponentMap = {
  berti: {
    label: "Berti Discovery",
    routes: [
      {
        name: berti_petrinet_config.name,
        path: "petrinet",
        component: berti_petrinet,
      },
    ],
  },
  ocelot: {
    label: "Ocelot",
    routes: [
      {
        name: ocelot_events_config.name,
        path: "events",
        component: ocelot_events,
      },
      {
        name: ocelot_objectGaph_config.name,
        path: "objectGaph",
        component: ocelot_objectGaph,
      },
      {
        name: ocelot_objects_config.name,
        path: "objects",
        component: ocelot_objects,
      },
    ],
  },
  totem: {
    label: "ToTeM",
    routes: [
      {
        name: totem_mine_config.name,
        path: "mine",
        component: totem_mine,
      },
    ],
  },
} as const;

export type PluginName = keyof typeof pluginComponentMap;
export type ComponentPath<P extends PluginName> = P extends PluginName
  ? (typeof pluginComponentMap)[P]["routes"][number]["path"]
  : never;

export function getPluginUrl<P extends PluginName>(
  plugin: P,
  path: ComponentPath<P>,
): string {
  return `/plugin/${plugin}/${path}`;
}
