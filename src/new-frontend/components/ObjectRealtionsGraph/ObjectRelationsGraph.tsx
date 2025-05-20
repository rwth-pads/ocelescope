import React, { useCallback } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  getBezierPath,
  MarkerType,
  EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// 🔹 Helper: Get intersection between two nodes
function getNodeIntersection(intersectionNode, targetNode) {
  const { width: iw, height: ih } = intersectionNode.measured;
  const ip = intersectionNode.internals.positionAbsolute;
  const tp = targetNode.internals.positionAbsolute;

  const w = iw / 2;
  const h = ih / 2;

  const x2 = ip.x + w;
  const y2 = ip.y + h;
  const x1 = tp.x + targetNode.measured.width / 2;
  const y1 = tp.y + targetNode.measured.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;

  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

function getEdgeParams(source, target) {
  const sourceIntersection = getNodeIntersection(source, target);
  const targetIntersection = getNodeIntersection(target, source);

  return {
    sx: sourceIntersection.x,
    sy: sourceIntersection.y,
    tx: targetIntersection.x,
    ty: targetIntersection.y,
  };
}

// 🔹 Custom Floating Edge
const FloatingEdge = ({ id, source, target, markerEnd, style }: EdgeProps) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
  );
};

// 🔹 Custom Floating Connection Line (when dragging)
const FloatingConnectionLine = ({
  fromNode,
  toX,
  toY,
}: {
  fromNode: any;
  toX: number;
  toY: number;
}) => {
  if (!fromNode) return null;

  const fakeTargetNode = {
    id: "temp",
    measured: { width: 1, height: 1 },
    internals: { positionAbsolute: { x: toX, y: toY } },
  };

  const { sx, sy, tx, ty } = getEdgeParams(fromNode, fakeTargetNode);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#222"
        strokeWidth={1.5}
        d={edgePath}
        className="animated"
      />
      <circle
        cx={tx}
        cy={ty}
        r={3}
        fill="#fff"
        stroke="#222"
        strokeWidth={1.5}
      />
    </g>
  );
};

// 🔹 Create circular graph nodes + edges
function createInitialElements() {
  const nodes = [];
  const edges = [];
  const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  nodes.push({
    id: "target",
    data: { label: "Target" },
    position: center,
  });

  for (let i = 0; i < 8; i++) {
    const angle = (i * 360) / 8;
    const rad = (angle * Math.PI) / 180;
    const x = 250 * Math.cos(rad) + center.x;
    const y = 250 * Math.sin(rad) + center.y;

    nodes.push({
      id: `${i}`,
      data: { label: `Source ${i}` },
      position: { x, y },
    });

    edges.push({
      id: `edge-${i}`,
      source: `${i}`,
      target: "target",
      type: "floating",
      markerEnd: { type: MarkerType.Arrow },
      style: { stroke: "#555", strokeWidth: 2 },
    });
  }

  return { nodes, edges };
}

// 🔹 Main Component
export default function App() {
  const { nodes: initialNodes, edges: initialEdges } = createInitialElements();
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) =>
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
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={{ floating: FloatingEdge }}
        connectionLineComponent={FloatingConnectionLine}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
