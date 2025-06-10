import { usePetriNet } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import PetriNet from "../components/PetriNet";
import { useTaskModal } from "@/components/TaskModal/TaskModal";
import { useEffect } from "react";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { Box, LoadingOverlay } from "@mantine/core";

const PetriNetPage = () => {
  const { data: pnet, refetch } = usePetriNet({});
  const { isTaskRunning } = useWaitForTask({
    taskId: pnet?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <>
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        <LoadingOverlay visible={isTaskRunning} />
        {pnet?.result && <PetriNet ocpn={pnet.result} />}
      </Box>
      <LoadingOverlay />
    </>
  );
};

export default PetriNetPage;
export const config: RouteDefinition = { name: "Petri Net" };
