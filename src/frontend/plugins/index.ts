import rawPlugins from "@/plugins/pluginIndex.json";
import { Plugin } from "./types";

export const plugins = (rawPlugins as Plugin[]).reduce(
  (acc, plugin) => {
    if (!acc[plugin.category]) {
      acc[plugin.category] = [];
    }
    acc[plugin.category].push(plugin);
    return acc;
  },
  {} as Record<string, Plugin[]>,
);
