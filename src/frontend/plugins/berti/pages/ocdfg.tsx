import { RouteDefinition } from "@/plugins/types";
import { Box, LoadingOverlay } from "@mantine/core";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";

import useWaitForTask from "@/hooks/useTaskWaiter";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import { showNotification } from "@mantine/notifications";
import { useBertiOcdfg, useBertiSaveOcdfg } from "@/api/fastapi/berti/berti";
import ResourceView from "@/components/Resources/ResourceView";
import CytoscapeLoadingSpinner from "@/components/Cytoscape/components/LoadingSpinner";

const OCDFGPage = () => {
  const invalidateResources = useInvalidateResources();
  const { mutate } = useBertiSaveOcdfg({
    mutation: {
      onSuccess: async (addedResource) => {
        showNotification({
          title: "Resource Saved",
          message: addedResource.name,
        });
        await invalidateResources();
      },
    },
  });

  const { data: ocdfgResponse, refetch } = useBertiOcdfg({});

  const { isTaskRunning } = useWaitForTask({
    taskId: ocdfgResponse?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <ResourceView resource={ocdfgResponse?.result ?? undefined}>
        <CytoscapeLoadingSpinner visible={isTaskRunning} />
        <ActionButtons
          onSave={ocdfgResponse?.result ? () => mutate({}) : undefined}
        />
      </ResourceView>
    </Box>
  );
};

export default OCDFGPage;
export const config: RouteDefinition = { name: "Object-Centric DFG" };
