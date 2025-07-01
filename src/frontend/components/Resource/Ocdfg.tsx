// components/AlternativeDFG.tsx
import { ObjectCentricDirectlyFollowsGraph } from "@/api/fastapi-schemas";
import { useMemo } from "react";
import { ElementDefinition, StylesheetCSS } from "cytoscape";
import dynamic from "next/dynamic";
import assignUniqueColors from "@/util/colors";

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

const Ocdfg: React.FC<{
  ocdfg?: ObjectCentricDirectlyFollowsGraph;
  children?: React.ReactNode;
}> = ({ ocdfg, children }) => {
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
          label: edge.annotation?.["label"] ?? undefined,
        },
      })),

      ...ocdfg.start_activities.map(
        ({ object_type, activity, annotation }) => ({
          data: {
            source: `start_${object_type}`,
            target: activity,
            id: `start_${object_type}->${activity}`,
            color: colorMap[object_type],
            label: annotation?.["label"] ?? undefined,
          },
          classes: "objectType",
        }),
      ),
      ...ocdfg.end_activities.map(({ object_type, activity, annotation }) => ({
        data: {
          source: activity,
          target: `end_${object_type}`,
          id: `${activity}->end_${object_type}`,
          color: colorMap[object_type],
          label: annotation?.["label"] ?? undefined,
        },
      })),
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
          label: "data(label)",
          "target-arrow-shape": "triangle",
          "target-arrow-color": "data(color)",
          "line-color": "data(color)",
          "font-size": "16px",
          "curve-style": "bezier",
          "text-rotation": "autorotate",
          "text-margin-y": 0,
          "text-background-color": "#ffffff",
          "text-background-opacity": 1,
          "text-background-shape": "roundrectangle",
          "text-background-padding": "3px",
        },
      },

      {
        selector: "edge[source = target]", // self-loop detection
        css: {
          "loop-direction": "-45deg", // or try 0deg, 90deg, etc.
          "loop-sweep": "60deg",
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
      isLoading={!!ocdfg}
    >
      {children}
    </CytoscapeGraph>
  );
};

export default Ocdfg;
