import pluginMap from "@/lib/plugins/plugin-map";
import { PluginName, RouteName } from "@/types/plugin";
import { useRouter } from "next/router";

const usePluginPath = () => {
  const router = useRouter();
  const { slug } = router.query;
  const name = slug?.[0];

  if (true) return;

  const plugin = pluginMap[name as PluginName];
};

export default usePluginPath;
