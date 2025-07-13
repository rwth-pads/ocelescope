import pluginMap from "@/lib/plugins/plugin-map";
import { PluginName, RouteName } from "@/types/plugin";
import { useRouter } from "next/router";

const usePluginPath = () => {
  const router = useRouter();
  const { slug } = router.query;
  const name = slug?.[0];

  if (!name || !(name in pluginMap)) return;

  const plugin = pluginMap[name as PluginName];

  return {
    name: plugin.name as PluginName,
    route: Object.values(plugin.routes).find(({ name }) => name === slug?.[1])
      ?.name as RouteName<PluginName>,
  };
};

export default usePluginPath;
