import React, { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Connection,
  OnConnect,
  Node,
  Edge,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";
import "./floating-flow.css";

import FloatingEdge from "./FloatingEdge";
import FloatingConnectionLine from "./FloatingConnectionLine";
import { buildFlowElements } from "./buildFlowElements";
import { InputGraph } from "./graph";
import { Box, Container, Paper } from "@mantine/core";

import CircleNode, {
  CircleNodeType,
} from "@/components/ReactFlow/nodes/CircleNode";
import RectangleNode, {
  RectangleNodeType,
} from "@/components/ReactFlow/nodes/RectangleNode";
type Props = {
  graph: InputGraph;
};

const edgeTypes = {
  floating: FloatingEdge,
};

const nodeTypes = {
  circle: CircleNode,
  rectangle: RectangleNode,
};

export type NodeComponent = CircleNodeType | RectangleNodeType;

const FloatingFlow: React.FC<Props> = ({ graph }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const { nodes: rawNodes, edges: rawEdges } = buildFlowElements({
      edges: graph.edges,
      nodes: graph.nodes.map(({ id, label }) => ({
        id: id,
        type: "circle",
        data: { color: "red", label: label },
        position: {
          x: 0,
          y: 0,
        },
      })),
    });
    setNodes(rawNodes);
    setEdges(rawEdges);
  }, [graph]);

  const onConnect: OnConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "floating",
            markerEnd: { type: MarkerType.Arrow },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  return (
    <Box
      style={{ minHeight: "inherit", display: "flex", flexDirection: "column" }}
    >
      <Paper
        style={{ flex: 1, height: "100%" }} // take up remaining height
        withBorder
        shadow="md"
        radius="md"
      >
        <ReactFlow
          style={{ height: "100%" }}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          edgeTypes={edgeTypes}
          nodeTypes={nodeTypes}
          connectionLineComponent={FloatingConnectionLine}
        />
      </Paper>
    </Box>
  );
};

export default FloatingFlow;
