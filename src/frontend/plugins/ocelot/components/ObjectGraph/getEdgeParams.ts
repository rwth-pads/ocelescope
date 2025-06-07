import { InternalNode, Position } from "@xyflow/react";

export const getNodeIntersection = (sourceNode: any, targetNode: any) => {
  const { width, height } = sourceNode.measured;

  const sourcePos = sourceNode.internals.positionAbsolute;
  const targetPos = targetNode.internals.positionAbsolute;

  const w = width / 2;
  const h = height / 2;

  const x2 = sourcePos.x + w;
  const y2 = sourcePos.y + h;
  const x1 = targetPos.x + targetNode.measured.width / 2;
  const y1 = targetPos.y + targetNode.measured.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
};

export function getIntersectionForCircle(
  source: InternalNode,
  target: InternalNode,
) {
  const sourceX = source.internals.positionAbsolute.x;
  const sourceY = source.internals.positionAbsolute.y;
  const targetX = target.internals.positionAbsolute.x;
  const targetY = target.internals.positionAbsolute.y;

  const diameter = target.measured.width ?? 0; // assuming width === height
  const radius = diameter / 2;

  const sourceCenterX = sourceX + (source.measured.width ?? 0) / 2;
  const sourceCenterY = sourceY + (source.measured.height ?? 0) / 2;
  const targetCenterX = targetX + radius;
  const targetCenterY = targetY + radius;

  const dx = targetCenterX - sourceCenterX;
  const dy = targetCenterY - sourceCenterY;
  const angle = Math.atan2(dy, dx);

  const offsetX = Math.cos(angle) * radius;
  const offsetY = Math.sin(angle) * radius;

  return {
    x: targetCenterX - offsetX,
    y: targetCenterY - offsetY,
  };
}

export function getEdgePosition(node: any, point: { x: number; y: number }) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(point.x);
  const py = Math.round(point.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + node.measured.width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= n.y + node.measured.height - 1) return Position.Bottom;

  return Position.Top;
}

export function getEdgeParams(source: InternalNode, target: InternalNode) {
  const sourceIntersectionPoint = getIntersectionForCircle(source, target);
  const targetIntersectionPoint = getIntersectionForCircle(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
