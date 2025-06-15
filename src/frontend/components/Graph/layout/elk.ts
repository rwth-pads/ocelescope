import { useReactFlow } from "@xyflow/react";
import ELK, { LayoutOptions, type ElkNode } from "elkjs/lib/elk.bundled.js";
import { useCallback } from "react";
import { NodeComponents } from "..";
const elk = new ELK();

export const useElkLayout = () => {
  const { getNodes, setNodes, setEdges, getEdges, fitView } = useReactFlow();

  const defaultOptions = {
    "org.eclipse.elk.randomSeed": 2,
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",

    // Increase spacing between nodes and edges
    "elk.spacing.nodeNode": 100,
    "elk.spacing.edgeNode": 50,
    "elk.spacing.edgeEdge": 40,
    "elk.spacing.componentComponent": 100,

    // Layer spacing
    "elk.layered.spacing.baseValue": 50,
    "elk.layered.spacing.nodeNodeBetweenLayers": 150,

    // Better edge routing for visual clarity
    "elk.edgeRouting": "ORTHOGONAL",

    // Node placement and layering strategies
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  };

  const layout = useCallback(async (options?: any) => {
    const nodes = getNodes();
    const edges = getEdges();

    const layoutOptions: LayoutOptions = options ?? defaultOptions;
    // void elk.knownLayoutAlgorithms().then((r) => console.log({ r }));
    const graph: ElkNode = {
      id: "root",
      layoutOptions,
      children: nodes.map((node) => {
        return {
          id: node.id,
          width: node.measured?.width,
          height: node.measured?.height,
          properties: {},
          layoutOptions: {},
        };
      }),
      edges: getEdges().map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    try {
      const layoutedGraph = await elk.layout(graph);
      layoutedGraph.children?.forEach((node) => {
        node.id;
      });

      setNodes(
        nodes.map((node) => {
          const elkNode = layoutedGraph.children?.find(
            ({ id }) => id === node.id,
          );

          return {
            ...node,
            position: {
              x: elkNode?.x ?? 0,
              y: elkNode?.y ?? 0,
            },
          };
        }),
      );
      setEdges(
        edges.map((edge) => {
          const elkEdge = layoutedGraph.edges?.find(({ id }) => id === edge.id)
            ?.sections?.[0];

          return {
            ...edge,
            data: {
              ...edge.data,
              ...(elkEdge && {
                position: {
                  sourceX: elkEdge.startPoint.x,
                  sourceY: elkEdge.startPoint.y,
                  targetX: elkEdge.endPoint.x,
                  targetY: elkEdge.endPoint.y,
                },
              }),
            },
          };
        }),
      );
      fitView();
    } catch (error) {}
  }, []);

  return { layout };
};
