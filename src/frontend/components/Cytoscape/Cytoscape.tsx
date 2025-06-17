// components/Cytoscape/CytoscapeGraph.tsx
import React, { useEffect, useRef } from "react";
import cytoscape, { ElementDefinition, StylesheetCSS } from "cytoscape";
import { BaseLayoutOptions } from "cytoscape";
import { Affix, Box, Paper } from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import CytoscapeComponent from "react-cytoscapejs";
import elk from "cytoscape-elk";
import { Core } from "cytoscape";
import { CytoscapeContext } from "./CytoscapeContext";

cytoscape.use(elk);

type Props = {
  elements: ElementDefinition[];
  layout: BaseLayoutOptions;
  styles?: StylesheetCSS[];
  isLoading?: boolean;
  children?: React.ReactNode;
};

const FloatingAnotation: React.FC<{
  position: { x: number; y: number } | undefined;
  resetPosition: () => void;
}> = ({ position, resetPosition }) => {
  const ref = useClickOutside(resetPosition);

  if (!position) return null;
  return (
    <Affix position={{ top: position.y, left: position.x }}>
      <Paper w={200} h={200} ref={ref} shadow="xs" p="xl"></Paper>
    </Affix>
  );
};

const CytoscapeGraph: React.FC<Props> = ({
  elements,
  layout,
  styles = [],
  children,
}) => {
  const cytoscapeRef = useRef<Core | null>(null);
  return (
    <CytoscapeContext.Provider value={{ cy: cytoscapeRef, layout }}>
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        <CytoscapeComponent
          style={{ width: "100%", height: "100%" }}
          cy={(cy) => (cytoscapeRef.current = cy)}
          elements={elements}
          stylesheet={styles}
          layout={layout}
        />
        {children}
      </Box>
    </CytoscapeContext.Provider>
  );
};

export default CytoscapeGraph;
