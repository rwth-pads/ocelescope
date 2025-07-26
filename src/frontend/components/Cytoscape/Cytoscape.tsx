// components/Cytoscape/CytoscapeGraph.tsx
import React, { useRef } from "react";
import cytoscape, { ElementDefinition, StylesheetCSS } from "cytoscape";
import { BaseLayoutOptions } from "cytoscape";
import CytoscapeComponent from "react-cytoscapejs";
import elk from "cytoscape-elk";
import { Core } from "cytoscape";

cytoscape.use(elk);

type Props = {
  elements: ElementDefinition[];
  layout?: BaseLayoutOptions;
  styles?: StylesheetCSS[];
  children?: React.ReactNode;
};

const CytoscapeGraph: React.FC<Props> = ({ elements, layout, styles = [] }) => {
  const cytoscapeRef = useRef<Core | null>(null);
  return (
    <CytoscapeComponent
      style={{ width: "100%", height: "100%" }}
      cy={(cy) => (cytoscapeRef.current = cy)}
      elements={elements}
      stylesheet={styles}
      layout={layout}
    />
  );
};

export default CytoscapeGraph;
