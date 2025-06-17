// components/PetriNet.tsx
import { ObjectCentricPetriNet } from "@/api/fastapi-schemas";
import assignUniqueColors from "../util";
import { useMemo } from "react";
import { ElementDefinition, StylesheetCSS } from "cytoscape";
import dynamic from "next/dynamic";

const PetriNet: React.FC<{ ocpn: ObjectCentricPetriNet }> = ({ ocpn }) => {
  const { places, transitions, arcs } = ocpn;

  const CytoscapeGraph = dynamic(
    () => import("@/components/Cytoscape/Cytoscape"),
    {
      ssr: false,
    },
  );

  // Assign unique colors to each object type

  const colorMap = useMemo(
    () =>
      assignUniqueColors(
        Array.from(new Set(places.map(({ object_type }) => object_type))),
      ),
    [places],
  );

  // Nodes
  const nodes: ElementDefinition[] = [
    ...places.map((place) => ({
      data: {
        id: place.id,
        label: place.id,
        type: "place",
        objectType: place.object_type,
      },
    })),
    ...transitions.map((transition) => ({
      data: {
        id: transition.id,
        label: transition.label || "",
        type: "transition",
      },
    })),
  ];

  // Edges
  const edges: ElementDefinition[] = arcs.map((arc) => {
    const objectType =
      places.find((p) => p.id === arc.source || p.id === arc.target)
        ?.object_type ?? "default";

    return {
      data: {
        id: `${arc.source}->${arc.target}`,
        source: arc.source,
        target: arc.target,
        color: colorMap[objectType],
      },
    };
  });

  // Layout
  const layout = {
    name: "elk",
    elk: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "50",
      "elk.spacing.nodeNode": "30",
      "elk.layered.edgeRouting": "ORTHOGONAL",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.considerModelOrder.strategy": "NODES",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
    },
    animate: true,
  };

  // Styles
  const styles: StylesheetCSS[] = [
    {
      selector: "node[type='place']",
      css: {
        shape: "ellipse",
        label: "data(label)",
        "background-color": (node) => colorMap[node.data("objectType")],
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "12px",
        width: 40,
        height: 40,
        "border-width": 2,
        "border-color": "#000",
      },
    },
    {
      selector: "node[type='transition']",
      css: {
        shape: "rectangle",
        label: "data(label)",
        "background-color": "#fff",
        "border-color": "#000",
        "border-width": 2,
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "12px",
        width: 12,
        height: 40,
      },
    },
    {
      selector: "edge",
      css: {
        width: 2,
        "line-color": "data(color)",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "data(color)",
        "curve-style": "bezier",
      },
    },
  ];

  return (
    <CytoscapeGraph
      elements={[...nodes, ...edges]}
      styles={styles}
      layout={layout}
    />
  );
};

export default PetriNet;
