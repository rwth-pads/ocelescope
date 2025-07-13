import {
  PluginDefinition,
  PluginName,
  RouteDefinition,
  RouteName,
} from "@/types/plugin";

export const definePlugin = (def: PluginDefinition) => def;

export const defineRoute = (def: RouteDefinition) => def;

export const getPluginRoute = <K extends PluginName>({
  pluginName,
  routeName,
}: {
  pluginName: K;
  routeName?: RouteName<K>;
}) => `/plugin/${pluginName}${routeName ? `/${routeName}` : undefined}`;
