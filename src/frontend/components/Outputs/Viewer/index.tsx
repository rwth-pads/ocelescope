import { useOutput } from "@/api/fastapi/outputs/outputs";
import { VisualizationByType, VisulizationsTypes } from "@/types/outputs";
import { LoadingOverlay } from "@mantine/core";
import { ComponentType } from "react";
import GraphViewer from "./Viewers/graph";

const visulizationMap = {
  cytoscape: ({}) => <></>,
  graph: (graph) => <GraphViewer visualization={graph.visualization} />,
} satisfies {
  [T in VisulizationsTypes]: ComponentType<{
    visualization: VisualizationByType<T>;
  }>;
};

const Viewer: React.FC<{ id: string }> = ({ id }) => {
  const { data: visualization } = useOutput(id);

  if (!visualization) {
    return <LoadingOverlay />;
  }

  const Component = visulizationMap[visualization.type] as ComponentType<{
    visualization: typeof visualization;
  }>;

  return <Component visualization={visualization} />;
};

export default Viewer;
