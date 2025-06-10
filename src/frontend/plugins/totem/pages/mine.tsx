import { useTotem } from "@/api/fastapi/totem/totem";
import Graph, { EdgeComponents, NodeComponents } from "@/components/Graph";
import useWaitForTask from "@/hooks/useTaskWaiter";
import { RouteDefinition } from "@/plugins/types";
import assignUniqueColors from "@/util/colors";
import { Box, Button, HoverCard, LoadingOverlay, Text } from "@mantine/core";
import { Info } from "lucide-react";
import { useMemo } from "react";

const MinePage = () => {
  const { data: result, refetch } = useTotem();

  const { edges, nodes } = useMemo(() => {
    if (!result?.result) {
      return { nodes: [], edges: [] };
    }
    const totem = result.result;

    const nodesNames = Array.from(
      new Set(
        totem.relations.flatMap(({ source, target }) => [source, target]),
      ),
    );

    const edges: EdgeComponents[] = totem.relations.map(
      ({ source, target, tr, tr_inverse }) => ({
        source: source,
        target: target,
        markerEnd:
          tr === "P"
            ? "double-rect"
            : tr === "D"
              ? "rect"
              : tr === "I"
                ? "circle"
                : undefined,
        markerStart:
          tr === "P" || tr_inverse == "P"
            ? "double-rect"
            : tr === "Di"
              ? "rect"
              : undefined,
        data: {},
      }),
    );

    const colors = assignUniqueColors(nodesNames);
    return {
      nodes: nodesNames.map(
        (name) =>
          ({
            data: {
              type: "rectangle",
              inner: (
                <Text w={100} ta={"center"}>
                  {name}
                </Text>
              ),
              color: colors[name],
            },
            id: name,
          }) satisfies NodeComponents,
      ),
      edges,
    };
  }, [result]);
  console.log(edges, nodes);

  const { isTaskRunning } = useWaitForTask({
    taskId: result?.taskId ?? undefined,
    onSuccess: refetch,
  });

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <LoadingOverlay visible={isTaskRunning} />
      {result?.result && <Graph initialNodes={nodes} initialEdges={edges} />}
    </Box>
  );
};
export default MinePage;

export const config: RouteDefinition = { name: "Mine" };
