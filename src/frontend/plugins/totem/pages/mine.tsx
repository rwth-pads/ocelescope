import { useTotem } from "@/api/fastapi/totem/totem";
import Graph, { EdgeComponents, NodeComponents } from "@/components/Graph";
import Totem from "@/components/Resource/Totem";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { RouteDefinition } from "@/plugins/types";
import assignUniqueColors from "@/util/colors";
import { Box, Button, HoverCard, LoadingOverlay, Text } from "@mantine/core";
import { Info } from "lucide-react";
import { useMemo } from "react";

const MinePage = () => {
  const { data: result, refetch } = useTotem();

  const { isTaskRunning } = useWaitForTask({
    taskId: result?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <LoadingOverlay visible={isTaskRunning} />
      {result?.result && <Totem totem={result.result} />}
    </Box>
  );
};
export default MinePage;

export const config: RouteDefinition = { name: "Mine" };
