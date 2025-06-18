import React, { ComponentProps, useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Connection,
  OnConnect,
  Node,
  Edge,
  ReactFlowProvider,
  Controls,
  NodeChange,
  applyNodeChanges,
} from "@xyflow/react";

import CircleNode, {
  CircleNodeType,
} from "@/components/Graph/nodes/CircleNode";
import RectangleNode, {
  RectangleNodeType,
} from "@/components/Graph/nodes/RectangleNode";
import FloatingEdge, {
  FloatingEdgeType,
} from "./edges/FloatingEdge/FloatingEdge";
import { useDagreLayout } from "./layout/dagre";
import { GraphLabel } from "@dagrejs/dagre";
import { useElkLayout } from "./layout/elk";

const edgeTypes = {
  floating: FloatingEdge,
};

const nodeTypes = {
  circle: CircleNode,
  rectangle: RectangleNode,
};

export type NodeComponents = Pick<
  CircleNodeType | RectangleNodeType,
  "id" | "data"
>;

export type EdgeComponents = Omit<FloatingEdgeType, "position" | "id">;

type Layout =
  | {
      type: "dagre";
      options?: GraphLabel;
    }
  | { type: "elk"; options?: any };

const layoutToHook: Record<
  Layout["type"],
  typeof useDagreLayout | typeof useElkLayout
> = {
  elk: useElkLayout,
  dagre: useDagreLayout,
};

type Props = {
  initialNodes: NodeComponents[];
  initialEdges: EdgeComponents[];
  layoutOptions?: Layout;
};

const InnerFlow: React.FC<Props> = ({
  initialNodes,
  initialEdges,
  layoutOptions = { type: "dagre" },
}) => {
  const [nodes, setNodes] = useState<Node[]>(
    initialNodes.map((node) => ({
      ...node,
      type: node.data.type,
      position: {
        x: 0,
        y: 0,
      },
    })),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    initialEdges.map((edge, index) => ({
      ...edge,
      id: `edge_${index}`,
      type: "floating",
    })),
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const positionChange = changes.filter(
      (change) => change.type === "position",
    );
    if (positionChange.length > 0) {
      const movedNodes = positionChange.map((change) => change.id);
      setEdges((edges) =>
        edges.map((edge) => ({
          ...edge,
          data: {
            ...edge.data,
            position:
              movedNodes.includes(edge.target) ||
              movedNodes.includes(edge.source)
                ? undefined
                : edge.data!.position!,
          },
        })),
      );
    }

    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const { layout } = layoutToHook[layoutOptions.type]();

  useEffect(() => {
    void layout(layoutOptions?.options);
  }, [initialNodes, initialEdges, nodes.some(({ measured }) => !!measured)]);

  return (
    <>
      <ReactFlow
        style={{ height: "100%" }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
      </ReactFlow>
    </>
  );
};

const Graph: React.FC<ComponentProps<typeof InnerFlow>> = (props) => (
  <ReactFlowProvider>
    <InnerFlow {...props} />
  </ReactFlowProvider>
);

export default Graph;
