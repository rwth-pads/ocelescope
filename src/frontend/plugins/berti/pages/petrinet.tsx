import { useBertiPetriNet, useBertiSavePnet } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { Box, LoadingOverlay } from "@mantine/core";
import PetriNet from "@/components/Resource/Ocpn";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";
import useInvalidateResources from "@/hooks/useInvalidateResources";
import { showNotification } from "@mantine/notifications";

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

  useWaitForTask({
    taskId: pnet?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <PetriNet ocpn={pnet?.result ?? undefined}>
        <LoadingOverlay zIndex={1} visible={!pnet?.result} />
        <ActionButtons onSave={pnet?.result ? () => mutate({}) : undefined} />
      </PetriNet>
    </Box>
  );
};

export default PetriNetPage;
export const config: RouteDefinition = { name: "Petri Net" };
