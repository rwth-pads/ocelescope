import { ObjectCentricPetriNet, Ocdfg } from "@/api/fastapi-schemas";
import Graph, { EdgeComponents, NodeComponents } from "@/components/Graph";
import { useMemo } from "react";
import assignUniqueColors from "../util";
import { Edge, MarkerType } from "@xyflow/react";
import { Box, Text } from "@mantine/core";
import CytoscapeGraph from "@/components/Cytoscape/Cytoscape";
import { ElementDefinition } from "cytoscape";

const OCDFG: React.FC<{ ocdfg: Ocdfg }> = ({ ocdfg }) => {
  const colorMap = useMemo(
    () => assignUniqueColors(Array.from(new Set(ocdfg.object_types))),
    [ocdfg.object_types],
  );

  const objectNodes: NodeComponents[] = ocdfg.object_types.flatMap(
    (objectType) => [
      {
        id: `${objectType}-start`,
        data: {
          type: "circle",
          diameter: 20,
          color: colorMap[objectType],
          label: objectType,
        },
      },
      {
        id: `${objectType}-end`,
        data: {
          type: "circle",
          diameter: 20,
          color: colorMap[objectType],
          label: objectType,
        },
      },
    ],
  );

  const activityNodes: NodeComponents[] = ocdfg.activities.map((activity) => ({
    id: activity,
    data: {
      type: "rectangle",
      inner: (
        <Text p={"md"} bd={"1px solid black"}>
          {activity}
        </Text>
      ),
      color: "white",
    },
  }));

  const edges: EdgeComponents[] = ocdfg.edges.map(
    ({ target, source, object_type }) => ({
      source: source,
      target: target,
      style: { stroke: colorMap[object_type] },
      markerEnd: { type: MarkerType.ArrowClosed, color: colorMap[object_type] },
    }),
  );

  const startEdges: EdgeComponents[] = Object.entries(
    ocdfg.start_activities,
  ).flatMap(([objectType, startActivities]) =>
    startActivities.map((activity) => ({
      source: `${objectType}-start`,
      target: activity,
      style: { stroke: colorMap[objectType] },
      markerEnd: { type: MarkerType.ArrowClosed, color: colorMap[objectType] },
    })),
  );

  const endEdges: EdgeComponents[] = Object.entries(
    ocdfg.start_activities,
  ).flatMap(([objectType, startActivities]) =>
    startActivities.map((activity) => ({
      target: `${objectType}-end`,
      source: activity,
      style: { stroke: colorMap[objectType], color: colorMap[objectType] },
      markerEnd: { type: MarkerType.ArrowClosed, color: colorMap[objectType] },
    })),
  );
  return (
    <Graph
      initialNodes={[...objectNodes, ...activityNodes]}
      initialEdges={[...edges, ...startEdges, ...endEdges]}
      layoutOptions={{ type: "elk", options: { "elk.direction": "DOWN" } }}
    />
  );
};

const AlternativeDFG: React.FC<{ ocdfg: Ocdfg }> = ({ ocdfg }) => {
  const colorMap = useMemo(
    () => assignUniqueColors(Array.from(new Set(ocdfg.object_types))),
    [ocdfg.object_types],
  );

  const elements: ElementDefinition[] = [
    // Object Nodes (start and end for each object type)
    ...ocdfg.object_types.flatMap((objectType) => [
      {
        data: {
          id: `${objectType}-start`,
          label: objectType,
        },
        style: {
          shape: "ellipse",
          width: 40,
          height: 40,
          backgroundColor: colorMap[objectType],
          label: objectType,
        },
      },
      {
        data: {
          id: `${objectType}-end`,
          label: objectType,
        },
        style: {
          shape: "ellipse",
          width: 40,
          height: 40,
          backgroundColor: colorMap[objectType],
          label: objectType,
        },
      },
    ]),

    // Activity Nodes
    ...ocdfg.activities.map((activity) => ({
      data: {
        id: activity,
        label: activity,
      },
      style: {
        shape: "rectangle",
        backgroundColor: "#ffffff",
        label: "data(label)",
        textValign: "center",
        "text-max-width": "data(width)",
        width: 200,
        textHalign: "center",
        fontSize: 12,
        padding: 10,
        borderColor: "#000000",
        borderWidth: 1,
      },
    })),

    // Main Edges
    ...ocdfg.edges.map(({ source, target, object_type }) => ({
      data: {
        id: `${source}->${target}-${object_type}`,
        source,
        target,
        label: object_type,
      },
      style: {
        lineColor: colorMap[object_type],
        targetArrowColor: colorMap[object_type],
        targetArrowShape: "triangle",
        curveStyle: "bezier",
      },
    })),

    // Start Edges
    ...Object.entries(ocdfg.start_activities).flatMap(
      ([objectType, startActivities]) =>
        startActivities.map((activity) => ({
          data: {
            id: `${objectType}-start->${activity}`,
            source: `${objectType}-start`,
            target: activity,
            label: objectType,
          },
          style: {
            lineColor: colorMap[objectType],
            targetArrowColor: colorMap[objectType],
            targetArrowShape: "triangle",
            curveStyle: "bezier",
          },
        })),
    ),

    // End Edges
    ...Object.entries(ocdfg.start_activities).flatMap(
      ([objectType, startActivities]) =>
        startActivities.map((activity) => ({
          data: {
            id: `${activity}->${objectType}-end`,
            source: activity,
            target: `${objectType}-end`,
            label: objectType,
          },
          style: {
            lineColor: colorMap[objectType],
            targetArrowColor: colorMap[objectType],
            targetArrowShape: "triangle",
            curveStyle: "bezier",
          },
        })),
    ),
  ];
  return (
    <CytoscapeGraph
      elements={elements}
      layout={{
        name: "elk",
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: "layered",
          "elk.direction": "DOWN", // or "RIGHT" for horizontal flow
          "elk.layered.spacing.nodeNodeBetweenLayers": 50,
          "elk.spacing.nodeNode": 30,
          "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
          "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF", // better flow layout
          "elk.edgeRouting": "ORTHOGONAL", // "SPLINES" if you want curves
          "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
          "elk.layered.mergeEdges": true, // optional: merges edges between same source/target
        },
      }}
    />
  );
};

export default AlternativeDFG;
