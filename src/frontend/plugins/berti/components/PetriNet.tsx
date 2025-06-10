import { ObjectCentricPetriNet } from "@/api/fastapi-schemas";
import Graph, { NodeComponents } from "@/components/Graph";
import { useMemo } from "react";
import assignUniqueColors from "../util";
import { MarkerType } from "@xyflow/react";
import { Box, Text } from "@mantine/core";

const PetriNet: React.FC<{ ocpn: ObjectCentricPetriNet }> = ({ ocpn }) => {
  const { places, transitions, arcs } = ocpn.net;

  const colorMap = useMemo(
    () =>
      assignUniqueColors(
        Array.from(new Set(places.map(({ object_type }) => object_type))),
      ),
    [places],
  );

  const placeNodes: NodeComponents[] = places.map(({ id, object_type }) => ({
    id,
    data: {
      type: "circle",
      diameter: 40,
      color: colorMap[object_type],
    },
  }));

  const transitionNodes: NodeComponents[] = transitions.map(
    ({ id, label }) => ({
      id,
      data: {
        type: "rectangle",
        ...(label
          ? {
              inner: (
                <Text p={"md"} bd={"1px solid black"}>
                  {label}
                </Text>
              ),
              color: "white",
            }
          : { inner: <Box w={10} h={40}></Box>, color: "black" }),
      },
    }),
  );

  return (
    <Graph
      initialNodes={[...placeNodes, ...transitionNodes]}
      initialEdges={arcs.map(({ source, target }) => {
        const object_type = places.find(
          ({ id }) => id === source || id === target,
        )?.object_type;

        return {
          source,
          target,
          style: { strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            ...(object_type && { color: colorMap[object_type] }),
          },
          ...(object_type && { style: { stroke: colorMap[object_type] } }),
        };
      })}
      layoutOptions={{ type: "elk" }}
    />
  );
};

export default PetriNet;
