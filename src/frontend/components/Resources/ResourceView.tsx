import { useGetResource } from "@/api/fastapi/resources/resources";
import { resourceDefinitionMap } from "@/lib/resources/definitionMap.gen";
import { Box, Group, LoadingOverlay, Text } from "@mantine/core";

const ResourceView: React.FC<{
  id: string;
  children?: React.ReactNode;
}> = ({ id, children }) => {
  const { data: resource } = useGetResource(id);
  if (!resource) {
    return (
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        <LoadingOverlay visible={!resource} />
      </Box>
    );
  }

  const resourceDefinition = resourceDefinitionMap[resource.entity.type];

  if (resourceDefinition) {
    const Viewer = resourceDefinition.viewer as React.ComponentType<any>;
    return <Viewer resource={resource.entity}>{children}</Viewer>;
  }

  return (
    <Group align="center" justify="center" w={"100%"} h={"100%"}>
      <Text> Not Implemented </Text>
    </Group>
  );
};

export default ResourceView;
