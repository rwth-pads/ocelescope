import { VisualizationByType } from "@/types/outputs";
import { Box } from "@mantine/core";
import { ElementDefinition } from "cytoscape";
import dynamic from "next/dynamic";

const CytoscapeComponent = dynamic(() => import("react-cytoscapejs"), {
  ssr: false,
});

const GraphViewer: React.FC<{
  visualization: VisualizationByType<"graph">;
}> = ({ visualization }) => {
  const nodes: ElementDefinition[] = visualization.nodes.map((node) => ({
    data: {
      id: node.id,
    },
    css: {
      shape: node.shape,
      label: node.label ?? undefined,
      "text-valign": "center",
      "text-halign": "center",
      width: node.width ?? undefined,
      "background-color": node.color ?? undefined,
      height: node.height ?? undefined,
    },
    position: { x: node.x ?? 0, y: node.y ?? 0 },
  }));

  const edges: ElementDefinition[] = visualization.edges.map((edge, index) => ({
    data: { id: index.toString(), source: edge.source, target: edge.target },
    css: {
      "line-color": edge.color ?? "#ccc",
      "target-arrow-shape": edge.arrows[0] ?? undefined,
      "target-arrow-color": edge.color ?? "#ccc",
      "source-arrow-shape": edge.arrows[1] ?? undefined,
      "source-arrow-color": edge.color ?? "#ccc",
      "arrow-scale": 1.5,
      "curve-style": "bezier", // ensures arrows are visible at ends
    },
  }));

  return (
    <Box h={500} w={"100%"}>
      <CytoscapeComponent
        style={{ width: "100%", height: "100%" }}
        elements={[...nodes, ...edges]}
        layout={{ name: "preset" }}
      />
    </Box>
  );
};
export default GraphViewer;
