import React, { memo } from "react";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Box } from "@mantine/core";

export type RectangleNodeType = Node<
  {
    type: "rectangle";
    color?: string;
    label?: string | React.ReactNode;
    inner?: string | React.ReactNode;
  },
  "rectangle"
>;

export default memo(
  ({ data: { color, label, inner } }: NodeProps<RectangleNodeType>) => {
    return (
      <>
        <Handle type="source" position={Position.Bottom} />
        <Box style={{ position: "relative", display: "inline-block" }}>
          <Box
            style={{
              backgroundColor: color,
              borderRadius: 4,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "auto",
              height: "auto",
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
