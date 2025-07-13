import pluginMap from "@/lib/plugins/plugin-map";
import PluginCard from "./PluginCard";
import { Flex } from "@mantine/core";
import { PluginName } from "@/types/plugin";

const PluginsOverview: React.FC = () => {
  return (
    <>
      <Flex wrap={"wrap"} align={"center"} justify={"center"} gap={"md"}>
        {Object.keys(pluginMap).map((name) => (
          <PluginCard name={name as PluginName} />
        ))}
      </Flex>
    </>
  );
};

export default PluginsOverview;
