import React, { useRef } from "react";
import { Core, ElementDefinition, LayoutOptions } from "cytoscape";
import { Box, Button, Card, Group, Stack, Title } from "@mantine/core";
import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import cytoscape from "cytoscape";
import dagre from "cytoscape-dagre";
import elk from "cytoscape-elk";
import dynamic from "next/dynamic";

cytoscape.use(dagre);
cytoscape.use(elk);

const CytoscapeComponent = dynamic(() => import("react-cytoscapejs"), {
  ssr: false,
});

interface CytoscapeGraphProps {
  elements: ElementDefinition[];
  stylesheet?: Array<{
    selector: string;
    style: Record<string, any>;
  }>;
  layout?: LayoutOptions;
}

const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({
  elements,
  stylesheet,
  layout,
}) => {
  const cyRef = useRef<Core | null>(null);

  const handleCy = (cy: Core) => {
    cyRef.current = cy;
  };

  const exportPng = () => {
    if (!cyRef.current) return;

    const pngDataUri = cyRef.current.png({
      full: true,
      scale: 2, // increase for higher resolution
      bg: "#ffffff", // optional background color
    });

    // Trigger download
    const link = document.createElement("a");
    link.href = pngDataUri;
    link.download = "cytoscape-graph.png";
    link.click();
  };

  const resetView = () => {
    if (!cyRef.current) return;
    cyRef.current.fit();
    const currentLayout = cyRef.current.layout(
      layout || { name: "breadthfirst" },
    );
    currentLayout.run();
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Box style={{ width: "100%", height: "500px", position: "relative" }}>
        <CytoscapeComponent
          cy={handleCy}
          elements={elements}
          style={{ width: "100%", height: "100%" }}
          stylesheet={stylesheet}
          layout={layout || { name: "breadthfirst" }}
        />
      </Box>
      <Group
        gap={"xs"}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
        }}
      >
        <Button
          size="xs"
          color="blue"
          variant="light"
          onClick={exportPng}
          leftSection={<DownloadIcon size={14} />}
        >
          Export PNG
        </Button>
        <Button
          size="xs"
          color="gray"
          variant="light"
          leftSection={<RefreshCwIcon size={14} />}
          onClick={resetView}
        >
          Reset View
        </Button>
      </Group>
    </Card>
  );
};

export default CytoscapeGraph;
