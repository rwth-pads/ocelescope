// components/Cytoscape/CytoscapeGraph.tsx
import React, { useRef } from "react";
import { useCytoscape } from "./useCytoscape";
import { ElementDefinition, StylesheetCSS } from "cytoscape";
import { BaseLayoutOptions } from "cytoscape";
import { Box } from "@mantine/core";

type Props = {
  elements: ElementDefinition[];
  layout: BaseLayoutOptions;
  styles?: StylesheetCSS[];
};

const CytoscapeGraph: React.FC<Props> = ({ elements, layout, styles = [] }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const zoom = {
    minLevel: 0.25,
    maxLevel: 2,
    sensitivity: 0.2,
  };

  useCytoscape(elements, styles, {
    containerRef,
    layoutOptions: layout,
    zoomOptions: zoom,
    onNodeDoubleTap: (e) => console.log("Double-tap:", e.target.id()),
  });

  return <Box ref={containerRef} w={"100%"} h={"100%"} />;
};

export default CytoscapeGraph;
