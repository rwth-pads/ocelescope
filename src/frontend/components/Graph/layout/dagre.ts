import dagre from "@dagrejs/dagre";
import { Node, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";

export const useDagreLayout = () => {
  const { getNodes, setNodes, getEdges, fitView, viewportInitialized } =
    useReactFlow();

  const layout = useCallback(async () => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: "TB" });

    const nodes = getNodes();

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: node.measured?.width,
        height: node.measured?.height,
      });
    });

    getEdges().forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const positionedNodes: Node[] = nodes.map((node) => {
      const { x, y } = dagreGraph.node(node.id);

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(positionedNodes);

    await fitView();
  }, [getNodes, getEdges, setNodes, fitView]);

  return { layout };
};
