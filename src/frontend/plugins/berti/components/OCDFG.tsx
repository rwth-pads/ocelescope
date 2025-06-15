// components/AlternativeDFG.tsx
import { ObjectCentricPetriNet, Ocdfg } from "@/api/fastapi-schemas";
import assignUniqueColors from "../util";
import { useMemo } from "react";
import { CoseLayoutOptions, ElementDefinition, StylesheetCSS } from "cytoscape";
import CytoscapeGraph from "@/components/Cytoscape/Cytoscape";
import { BaseLayoutOptions } from "cytoscape";

const AlternativeDFG: React.FC<{ ocdfg: Ocdfg }> = ({ ocdfg }) => {
  const colorMap = useMemo(
    () => assignUniqueColors(Array.from(new Set(ocdfg.object_types))),
    [ocdfg.object_types],
  );

  const layout = {
    name: "elk",
    nodeDimensionsIncludeLabels: true,
    elk: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      spacingFactor: 1,
      "spacing.portsSurrounding": 20,
      "spacing.nodeNodeBetweenLayers": 100,
    },

    animate: true,
  };

  const elements: ElementDefinition[] = [
    ...ocdfg.activities.map<ElementDefinition>((activity) => ({
      data: { id: activity, label: activity },
      classes: "activity",
    })),
    ...ocdfg.object_types.flatMap<ElementDefinition>((objectType) => [
      {
        data: {
          id: `start_${objectType}`,
          label: objectType,
          type: objectType,
        },
        classes: `object`,
      },
      {
        data: { id: `end_${objectType}`, label: objectType, type: objectType },
        classes: `object`,
      },
    ]),
    ...ocdfg.edges.map<ElementDefinition>((edge) => ({
      data: {
        id: `${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        objectType: edge.object_type,
        color: colorMap[edge.object_type],
      },
    })),
    ...Object.entries(ocdfg.start_activities).flatMap(
      ([objectType, startActivities]) =>
        startActivities.map<ElementDefinition>((activity) => ({
          data: {
            source: `start_${objectType}`,
            target: activity,
            id: `start_${objectType}->${activity}`,
            color: colorMap[objectType],
          },
          classes: "objectType",
        })),
    ),
    ...Object.entries(ocdfg.end_activities).flatMap(
      ([objectType, endActivities]) =>
        endActivities.map<ElementDefinition>((activity) => ({
          data: {
            source: activity,
            target: `end_${objectType}`,
            id: `${activity}->end_${objectType}`,
            color: colorMap[objectType],
          },
        })),
    ),
  ];

  const styles: StylesheetCSS[] = [
    {
      selector: ".activity",
      css: {
        shape: "rectangle",
        label: "data(label)",
        backgroundColor: "white",
        "text-valign": "center",
        "text-halign": "center",
        "font-size": "16px",
        "text-wrap": "wrap",
        "border-width": "2px",
        width: "label",
        padding: "10px",
      },
    },
    {
      selector: ".object",
      css: {
        label: "data(label)",
        backgroundColor: (node) => colorMap[node.data("type")],
        "font-size": "16px",
        "text-wrap": "wrap",
        "border-width": "2px",
        width: 10,
        height: 10,
        padding: "10px",
        "text-valign": "bottom",
        "text-halign": "center",
      },
    },
    {
      selector: "edge",
      css: {
        width: 2,
        "target-arrow-shape": "triangle",
        "target-arrow-color": "data(color)",
        "line-color": "data(color)",
        "font-size": "10px",
        "text-margin-y": -10,
        "curve-style": "bezier",
      },
    },
  ];
  return <CytoscapeGraph elements={elements} styles={styles} layout={layout} />;
};

export default AlternativeDFG;
