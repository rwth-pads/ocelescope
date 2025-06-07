import React, { memo } from "react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Box } from "@mantine/core";

export type CircleNodeType = Node<
  {
    color: string;
    diameter?: number;
    label?: string | React.ReactNode;
    inner?: string | React.ReactNode;
  },
  "circle"
>;

const CircleNode = memo(
  ({
    data: { color, label, inner, diameter = 50 },
  }: NodeProps<CircleNodeType>) => {
    return (
      <>
        <Handle type="source" position={Position.Bottom} />
        <Box
          w={diameter}
          h={diameter}
          style={{
            position: "relative", // Needed to position label absolutely
          }}
        >
          <Box
            w={diameter}
            h={diameter}
            style={{
              borderRadius: "50%",
              backgroundColor: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {inner}
          </Box>

          <Box
            size="xs"
            style={{
              position: "absolute",
              top: "100%", // place below the circle
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 4, // spacing
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </Box>
        </Box>
        <Handle type="target" position={Position.Top} />
      </>
    );
  },
);

export default CircleNode;
