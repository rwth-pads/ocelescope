import React, { memo } from "react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Box } from "@mantine/core";

export type RectangleNodeType = Node<
  {
    color: string;
    width?: number;
    height?: number;
    label: string | React.ReactNode;
    inner: string | React.ReactNode;
  },
  "rectangle"
>;

export default memo(
  ({
    data: { color = "red", label, inner, width = 80, height = 40 },
  }: NodeProps<RectangleNodeType>) => {
    return (
      <>
        <Handle type="source" position={Position.Bottom} />
        <Box
          w={width}
          h={height}
          style={{
            position: "relative",
          }}
        >
          <Box
            w={width}
            h={height}
            style={{
              backgroundColor: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4, // Optional: add slight rounding
            }}
          >
            {inner}
          </Box>

          <Box
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: 4,
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
