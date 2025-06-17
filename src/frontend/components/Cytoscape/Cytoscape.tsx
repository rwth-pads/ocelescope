// components/Cytoscape/CytoscapeGraph.tsx
import React, { ReactNode, useEffect, useRef, useState } from "react";
import cytoscape, { ElementDefinition, StylesheetCSS } from "cytoscape";
import { BaseLayoutOptions } from "cytoscape";
import {
  Affix,
  Box,
  Button,
  ButtonGroup,
  Paper,
  LoadingOverlay,
} from "@mantine/core";
import { DownloadIcon, Maximize, RefreshCcw, Settings, X } from "lucide-react";
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
  toggleOptions?: () => void;
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
  isLoading,
  elements,
  layout,
  toggleOptions,
  styles = [],
  children,
}) => {
  const cytoscapeRef = useRef<Core | null>(null);

  const downloadGraphAsPng = () => {
    const cy = cytoscapeRef.current; // or however you reference your cy instance
    if (!cy) return;

    const pngData = cy.png({
      full: true,
      scale: 2,
      bg: "#ffffff",
    });

    const a = document.createElement("a");
    a.href = pngData;
    a.download = "graph.png";
    a.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
  };

  useEffect(() => {
    const cy = cytoscapeRef.current;
    if (cy && cy != null) {
      cy.addListener("mouseover", (e) => {});
      cy.addListener("resize", () => {
        cy.fit();
      });
    }
  }, []);

  return (
    <CytoscapeContext.Provider value={{ cy: cytoscapeRef }}>
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        <CytoscapeComponent
          style={{ width: "100%", height: "100%" }}
          cy={(cy) => (cytoscapeRef.current = cy)}
          elements={elements}
          stylesheet={styles}
          layout={layout}
        />
        <ButtonGroup
          orientation="vertical"
          pos={"absolute"}
          bottom={0}
          left={0}
        >
          <Button px={"xs"} variant="default">
            <Maximize
              onClick={() => {
                if (cytoscapeRef.current) cytoscapeRef.current.fit();
              }}
              size={18}
            />
          </Button>
          <Button
            onClick={() => {
              if (cytoscapeRef.current) {
                cytoscapeRef.current.layout(layout).run();
              }
            }}
            px={"xs"}
            variant="default"
          >
            <RefreshCcw size={18} />
          </Button>
          <Button onClick={downloadGraphAsPng} px={"xs"} variant="default">
            <DownloadIcon size={18} />
          </Button>
          {toggleOptions && (
            <Button onClick={toggleOptions} px={"xs"} variant="default">
              <Settings size={18} />
            </Button>
          )}
        </ButtonGroup>
        {children}
      </Box>
    </CytoscapeContext.Provider>
  );
};

export default CytoscapeGraph;
