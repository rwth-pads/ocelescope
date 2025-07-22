import { usePlugins } from "@/api/fastapi/plugins/plugins";
import PluginForm from "@/components/PluginForm/PluginForm";
import { useRouter } from "next/router";
import { useMemo } from "react";

const PluginPage = () => {
  const { data: plugins } = usePlugins();
  const router = useRouter();
  const { id, method } = router.query;

  const methodDescription = useMemo(() => {
    if (!plugins || !id || !method) {
      return;
    }

    return plugins[id as string].methods[method as string];
  }, [plugins, id, method]);
  return (
    <>
      {methodDescription && (
        <PluginForm pluginId={id as string} pluginMetod={methodDescription} />
      )}
    </>
  );
};

export default PluginPage;
