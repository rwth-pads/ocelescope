import { resourceDefinitionMap } from "@/lib/resources/definitionMap.gen";
import { ResourceEntity } from "@/types/resources";
import { Box, Group } from "@mantine/core";

const ResourceView: React.FC<{
  resource?: ResourceEntity;
  children?: React.ReactNode;
}> = ({ resource, children }) => {
  if (!resource?.type) {
    return (
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        {children}
      </Box>
    );
  }

  const resourceDefinition = resourceDefinitionMap[resource.type];

  if (resourceDefinition) {
    const Viewer = resourceDefinition.viewer as React.ComponentType<any>;
    return <Viewer resource={resource}>{children}</Viewer>;
  }

  return (
    <Group align="center" justify="center" w={"100%"} h={"100%"}>
      {children}
    </Group>
  );
};

export default ResourceView;
