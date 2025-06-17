import { usePetriNet, useSavePnet } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { Box } from "@mantine/core";
import PetriNet from "@/components/Resource/Ocpn";
import ActionButtons from "@/components/Cytoscape/components/ActionButtons";
import useInvalidateResources from "@/hooks/useInvalidateResources";

const PetriNetPage = () => {
  const { data: pnet, refetch } = usePetriNet({});

  const invalidateResources = useInvalidateResources();
  const { mutate } = useSavePnet({
    mutation: { onSuccess: invalidateResources },
  });

  useWaitForTask({
    taskId: pnet?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <PetriNet ocpn={pnet?.result ?? undefined}>
        <ActionButtons onSave={pnet?.result ? () => mutate({}) : undefined} />
      </PetriNet>
    </Box>
  );
};

export default PetriNetPage;
export const config: RouteDefinition = { name: "Petri Net" };
