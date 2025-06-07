import dagre from "@dagrejs/dagre";
import { Node, Edge, MarkerType, Position } from "@xyflow/react";
import { InputGraph } from "./graph";
import { NodeComponent } from "./FloatingFlow";

export const buildFlowElements = (graph: {
  nodes: NodeComponent[];
  edges: InputGraph["edges"];
}) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB" });

  // Add nodes with dimensions
  graph.nodes.forEach((node) => {
    const { width, height } = getNodeSize(node);
    dagreGraph.setNode(node.id, { width, height });
  });

  graph.edges.forEach((edge) => {
    dagreGraph.setEdge(edge.from, edge.to);
  });

  dagre.layout(dagreGraph);

  const positionedNodes: Node[] = graph.nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id);

    return {
      ...node,
      position: { x, y },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    };
  });

  const edgeList: Edge[] = graph.edges.map((edge, index) => ({
    id: `edge-${index}`,
    source: edge.from,
    target: edge.to,
    type: "floating",
    markerEnd: { type: MarkerType.Arrow },
  }));

  return { nodes: positionedNodes, edges: edgeList };
};

// 💡 Extract dynamic width/height from node data
function getNodeSize(node: NodeComponent): { width: number; height: number } {
  if (node.type === "circle") {
    const diameter = node.data?.diameter ?? 50;
    return { width: 2 * diameter, height: 2 * diameter };
  }

  if (node.type === "rectangle") {
    const width = 2 * (node.data?.width ?? 180);
    const height = 2 * (node.data?.height ?? 60);
    return { width, height };
  }

  // Default fallback
  return { width: 120, height: 40 };
}
