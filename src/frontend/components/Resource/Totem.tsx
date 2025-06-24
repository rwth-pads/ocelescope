// components/AlternativeDFG.tsx
import {
  ObjectCentricDirectlyFollowsGraph,
  Totem as Resource,
} from "@/api/fastapi-schemas";
import { useMemo } from "react";
import { ElementDefinition, StylesheetCSS } from "cytoscape";
import dynamic from "next/dynamic";
import assignUniqueColors from "@/util/colors";
import { ocdfg } from "@/api/fastapi/berti/berti";

const layout = {
  name: "elk",
  nodeDimensionsIncludeLabels: true,
  elk: {
    "org.eclipse.elk.randomSeed": 3,
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",

    // Increase spacing between nodes and edges
    "elk.spacing.nodeNode": 100,
    "elk.spacing.edgeNode": 50,
    "elk.spacing.edgeEdge": 40,
    "elk.spacing.componentComponent": 100,

    // Layer spacing
    "elk.layered.spacing.baseValue": 50,
    "elk.layered.spacing.nodeNodeBetweenLayers": 150,

    // Better edge routing for visual clarity
    "elk.edgeRouting": "ORTHOGONAL",

    // Node placement and layering strategies
    "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  },
};
const Totem: React.FC<{
  totem?: Resource;
  children?: React.ReactNode;
}> = ({ totem, children }) => {
  const CytoscapeGraph = dynamic(
    () => import("@/components/Cytoscape/Cytoscape"),
    {
      ssr: false,
    },
  );

  const { styles, elements } = useMemo(() => {
    if (!totem) {
      return { styles: [], elements: [] };
    }

    const colorMap = assignUniqueColors([...new Set(totem.object_types)]);

    const nodes: ElementDefinition[] = totem.object_types.map((objectType) => ({
      data: {
        id: objectType,
        label: objectType,
        type: objectType,
        color: colorMap[objectType],
      },
      classes: "object",
    }));

    const edges: ElementDefinition[] = totem.edges.map((edge, i) => {
      const { source, target, annotation, tr, tr_inverse } = edge;

      const classes: string[] = [];

      if (tr === "P" && tr_inverse === "P") {
        classes.push("arrow-p-both");
      } else if (tr === "P") {
        classes.push("arrow-p");
      }

      if (tr_inverse === "P" && tr !== "P") {
        classes.push("arrow-p-inverse");
      }

      if (tr === "D") classes.push("arrow-d");
      if (tr === "Di") classes.push("arrow-di");
      if (tr === "I") classes.push("arrow-i");

      return {
        data: {
          id: `${source}->${target}`,
          source,
          target,
          label: annotation?.label ?? "",
          color: colorMap[source] ?? "#888",
        },
        classes: classes.join(" "),
      };
    });

    const styles: StylesheetCSS[] = [
      {
        selector: ".object",
        css: {
          shape: "rectangle",
          label: "data(label)",
          backgroundColor: "data(color)",
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
        selector: "edge",
        css: {
          width: 2,
          label: "data(label)",
          "font-size": "16px",
          "curve-style": "bezier",
          "text-rotation": "autorotate",
          "text-background-color": "#ffffff",
          "text-background-opacity": 1,
          "text-background-shape": "roundrectangle",
          "text-background-padding": "3px",
        },
      },
      {
        selector: "edge[label]",
        css: {
          label: "data(label)",
          width: 3,
          "curve-style": "bezier",
        },
      },
      // Arrow shape styles
      {
        selector: ".arrow-p",
        css: {
          "target-arrow-shape": "triangle",
        },
      },
      {
        selector: ".arrow-p-inverse",
        css: {
          "source-arrow-shape": "triangle",
        },
      },
      {
        selector: ".arrow-p-both",
        css: {
          "target-arrow-shape": "triangle",
          "source-arrow-shape": "triangle",
        },
      },
      {
        selector: ".arrow-d",
        css: {
          "target-arrow-shape": "tee",
        },
      },
      {
        selector: ".arrow-di",
        css: {
          "source-arrow-shape": "tee",
        },
      },
      {
        selector: ".arrow-i",
        css: {
          "target-arrow-shape": "circle",
        },
      },
    ];

    return {
      elements: [...nodes, ...edges],
      styles,
    };
  }, [totem]);

  return (
    <CytoscapeGraph
      elements={elements}
      styles={styles}
      layout={layout}
      isLoading={!!totem}
    >
      {children}
    </CytoscapeGraph>
  );
};

export default Totem;
