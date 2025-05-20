import { PluginDefinition } from "@/plugins/types";

export default {
  pluginName: "Ocelot",
  routes: [
    { component: "events", label: "Events" },
    { component: "objects", label: "Objects" },
    { component: "objectRelations", label: "Object Relations" },
  ],
} satisfies PluginDefinition;
