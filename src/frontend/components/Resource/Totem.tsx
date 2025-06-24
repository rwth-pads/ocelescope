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

    const colorMap = assignUniqueColors(
      Array.from(new Set(totem.object_types)),
    );

    const elements: ElementDefinition[] = [
      ...totem.object_types.map<ElementDefinition>((objectType) => ({
        data: {
          id: objectType,
          label: objectType,
          type: objectType,
          color: colorMap[objectType],
        },
        classes: `object`,
      })),
      ...totem.edges.map<ElementDefinition>(
        ({ source, target, annotation, tr, tr_inverse }) => ({
          data: {
            id: `${source}->${target}`,
            source: source,
            target: target,
            label: annotation?.["label"] ?? undefined,
            markerEnd:
              tr === "P"
                ? "triangle-tee"
                : tr === "D"
                  ? "tee"
                  : tr === "I"
                    ? "circle"
                    : undefined,
            markerStart:
              tr === "P" || tr_inverse == "P"
                ? "triangle-tree"
                : tr === "Di"
                  ? "tee"
                  : undefined,
          },
        }),
      ),
    ];
    console.log(elements);
    const styles = [
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
          "target-arrow-shape": "data(markerEnd)",
          "source-arrow-shape": "data(markerStart)",
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
        selector: "edge[label]",
        css: {
          label: "data(label)",
          width: 3,
        },
      },
    ] as StylesheetCSS[];

    return { styles, elements };
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
