import { useOcdfg, usePetriNet } from "@/api/fastapi/berti/berti";
import { useTaskModal } from "@/components/TaskModal/TaskModal";
import { RouteDefinition } from "@/plugins/types";
import { useEffect } from "react";
import OCDFG from "../components/OCDFG";

const OCDFGPage = () => {
  const { showTaskModal } = useTaskModal();
  const { data: ocdfg, refetch } = useOcdfg({});

  useEffect(() => {
    if (ocdfg?.taskId && ocdfg.status !== "SUCCESS") {
      showTaskModal({
        taskId: ocdfg.taskId,
        onSuccess: () => {
          refetch();
        },
      });
    }
  }, [ocdfg?.taskId]);

  return ocdfg?.result && <OCDFG ocdfg={ocdfg.result} />;
};

export default OCDFGPage;
export const config: RouteDefinition = { name: "Object-Centric DFG" };
