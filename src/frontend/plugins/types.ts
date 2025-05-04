import pluginIndex from "@/plugins/pluginIndex.json";

export type PluginRoute = {
  label: string;
  component: string;
};

export type Plugin = {
  name: string;
  label: string;
  category: string;
  routes: PluginRoute[];
};

export type PluginDefinition = {
  pluginName: string;
};

export type RouteDefinition = {
  name: string;
};
