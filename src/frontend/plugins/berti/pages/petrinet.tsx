import { useBertiPetriNet, useBertiSavePnet } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { Box, LoadingOverlay } from "@mantine/core";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import { showNotification } from "@mantine/notifications";
import ResourceView from "@/components/Resources/ResourceView";
import CytoscapeLoadingSpinner from "@/components/Cytoscape/components/LoadingSpinner";

const PetriNetPage = () => {
  const { data: pnet, refetch } = useBertiPetriNet({});

  const invalidateResources = useInvalidateResources();
  const { mutate } = useBertiSavePnet({
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

  const { isTaskRunning } = useWaitForTask({
    taskId: pnet?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <ResourceView resource={pnet?.result ?? undefined}>
        <CytoscapeLoadingSpinner visible={isTaskRunning} />
        <ActionButtons onSave={() => mutate({})} />
      </ResourceView>
    </Box>
  );
};

export default PetriNetPage;
export const config: RouteDefinition = { name: "Petri Net" };
