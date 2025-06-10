import { usePetriNet } from "@/api/fastapi/berti/berti";
import { RouteDefinition } from "@/plugins/types";
import PetriNet from "../components/PetriNet";
import { useTaskModal } from "@/components/TaskModal/TaskModal";
import { useEffect } from "react";

const PetriNetPage = () => {
  const { showTaskModal } = useTaskModal();
  const { data: pnet, refetch } = usePetriNet({});

  useEffect(() => {
    if (pnet?.taskId && pnet.status !== "SUCCESS") {
      showTaskModal({
        taskId: pnet.taskId,
        onSuccess: () => {
          refetch();
        },
      });
    }
  }, [pnet?.taskId]);
  return pnet?.result && <PetriNet ocpn={pnet.result} />;
};

export default PetriNetPage;
export const config: RouteDefinition = { name: "Petri Net" };
