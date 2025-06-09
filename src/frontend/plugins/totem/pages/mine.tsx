import { useTotem } from "@/api/fastapi/totem/totem";
import Graph, { EdgeComponents, NodeComponents } from "@/components/Graph";
import { RouteDefinition } from "@/plugins/types";
import assignUniqueColors from "@/util/colors";
import { Box, Center, Text } from "@mantine/core";
import { MarkerType } from "@xyflow/react";
import { useMemo } from "react";

const MinePage = () => {
  const { data: totem } = useTotem();

  const { edges, nodes } = useMemo(() => {
    if (!totem) {
      return { nodes: [], edges: [] };
    }

    const nodesNames = Array.from(
      new Set(
        totem.relations.flatMap(({ source, target }) => [source, target]),
      ),
    );

    const edges: EdgeComponents[] = totem.relations.map(
      ({ source, target, tr }) => ({
        source: target,
        target: source,
        markerEnd: tr === "P" ? "double-rect" : tr == "D" ? "rect" : undefined,
        markerStart:
          tr === "P" ? "double-rect" : tr == "Di" ? "rect" : undefined,
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
  }, [totem]);
  console.log(edges);
  return <>{totem && <Graph initialNodes={nodes} initialEdges={edges} />}</>;
};
export default MinePage;

export const config: RouteDefinition = { name: "Mine" };
