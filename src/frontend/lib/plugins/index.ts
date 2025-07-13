import {
  PluginDefinition,
  PluginName,
  RouteDefinition,
  RouteName,
} from "@/types/plugin";

export const definePlugin = (def: PluginDefinition) => def;

export const defineRoute = (def: RouteDefinition) => def;

export const getPluginRoute = <K extends PluginName>({
  name: name,
  route: route,
}: {
  name: K;
  route?: RouteName<K>;
}) => `/plugin/${name}${route ? `/${route}` : ""}`;
