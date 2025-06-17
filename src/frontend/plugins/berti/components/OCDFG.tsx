// components/AlternativeDFG.tsx
import { Ocdfg } from "@/api/fastapi-schemas";
import assignUniqueColors from "../util";
import { useMemo } from "react";
import { ElementDefinition, StylesheetCSS } from "cytoscape";
import dynamic from "next/dynamic";

const layout = {
  name: "elk",
  nodeDimensionsIncludeLabels: true,
  elk: {
    "org.eclipse.elk.randomSeed": 2,
    "elk.direction": "RIGHT",
    "elk.algorithm": "layered",
    "elk.spacing.edgeNode": 30.0,
    "elk.spacing.edgeEdge": 30.0,
    "elk.spacing.nodeNode": "100",
    "elk.spacing.componentComponent": 75,
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.spacing.baseValue": 3.0,
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  },
};

const DFG: React.FC<{
  ocdfg?: Ocdfg;
  children?: React.ReactNode;
  toggleOptions?: () => void;
}> = ({ ocdfg, children, toggleOptions }) => {
  const CytoscapeGraph = dynamic(
    () => import("@/components/Cytoscape/Cytoscape"),
    {
      ssr: false,
    },
  );

  const { styles, elements } = useMemo(() => {
    if (!ocdfg) {
      return { styles: [], elements: [] };
    }

    const colorMap = assignUniqueColors(
      Array.from(new Set(ocdfg.object_types ?? [])),
    );

    const elements: ElementDefinition[] = [
      ...ocdfg.activities.map<ElementDefinition>((activity) => ({
        data: {
          id: activity,
          label: activity,
        },
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
          data: {
            id: `end_${objectType}`,
            label: objectType,
            type: objectType,
          },
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
              label: "test",
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

      {
        selector: "edge[label]",
        css: {
          label: "data(label)",
          width: 3,
        },
      },
    ];

    return { styles, elements };
  }, [ocdfg]);

  return (
    <CytoscapeGraph
      elements={elements}
      styles={styles}
      layout={layout}
      toggleOptions={toggleOptions}
      isLoading={!!ocdfg}
    >
      {children}
    </CytoscapeGraph>
  );
};

export default DFG;
