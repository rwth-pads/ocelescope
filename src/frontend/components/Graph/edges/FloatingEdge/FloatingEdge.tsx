import React from "react";
import {
  BaseEdge,
  Edge,
  EdgeProps,
  getStraightPath,
  useInternalNode,
} from "@xyflow/react";
import { getEdgeParams } from "@/components/Graph/util/getEdgeParams";

export type FloatingEdgeType = Edge<{}, "floating">;

const FloatingEdge = ({
  id,
  source,
  target,
  markerEnd,
  style,
}: EdgeProps<FloatingEdgeType>) => {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [edgePath] = getStraightPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      <BaseEdge id={id} style={style} path={edgePath} markerEnd={markerEnd} />
    </>
  );
};

export default FloatingEdge;
