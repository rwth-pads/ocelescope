// components/PetriNet.tsx
import { useMemo } from "react";
import { ElementDefinition, StylesheetCSS } from "cytoscape";
import assignUniqueColors from "@/util/colors";
import Cytoscape from "@/components/Cytoscape";
import { ResourceViewProps } from "@/types/resources";
import { defineResourceView } from "@/lib/resources";

const PetriNet: React.FC<ResourceViewProps<"ocpn">> = ({
  resource,
  children,
}) => {
  const { styles, elements } = useMemo(() => {
    if (!resource) {
      return { styles: [], elements: [] };
    }
    const { places, arcs, transitions } = resource;

    const colorMap = assignUniqueColors(
      Array.from(new Set(places.map(({ object_type }) => object_type))),
    );
    //
    // Nodes
    const nodes: ElementDefinition[] = [
      ...places.map((place) => ({
        data: {
          id: place.id,
          type: "place",
          ...(place.place_type && { label: place.object_type }),
          objectType: place.object_type,
        },
      })),
      ...transitions.map((transition) => ({
        data: {
          id: transition.id,
          label: transition.label || "",
          type: transition.label ? "transition" : "silent",
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

    // Styles
    const styles: StylesheetCSS[] = [
      {
        selector: "node[type='place']",
        css: {
          shape: "ellipse",
          label: "data(label)",
          "background-color": (node) => colorMap[node.data("objectType")],
          "border-color": "#000",
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
        selector: "node[type='transition']",
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
        selector: "node[type='silent']",
        css: {
          shape: "rectangle",
          backgroundColor: "black",
          width: "10px",
          height: "40px",
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
    return { elements: [...nodes, ...edges], styles };
  }, [resource]);
  //
  // Layout
  const layout = {
    name: "elk",
    nodeDimensionsIncludeLabels: true,
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

  return (
    <Cytoscape elements={elements} styles={styles} layout={layout}>
      {children}
    </Cytoscape>
  );
};

export default defineResourceView({
  type: "ocpn",
  viewer: PetriNet,
});
