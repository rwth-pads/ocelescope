import pluginMap from "@/lib/plugins/plugin-map";

type Author = {
  name: string;
  link?: string;
};

export type PluginDefinition = {
  name: string;
  label: string;
  authors: Author[];
  description: string;
  routes: RouteDefinition[];
};

export type RouteDefinition = {
  name: string;
  label: string;
  component: React.ComponentType;
};

export type PluginName = keyof typeof pluginMap;

export type RoutesByPlugin = {
  [K in PluginName]: (typeof pluginMap)[K]["routes"];
};
export type RouteName<K extends PluginName> = keyof RoutesByPlugin[K] & string;
