import { ObjectCentricPetriNet } from "@/api/fastapi-schemas";
import Graph, { EdgeComponents, NodeComponents } from "@/components/Graph";
import { useMemo } from "react";
import assignUniqueColors from "../util";
import { Box } from "@mantine/core";

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
    data: { type: "circle", color: colorMap[object_type] },
  }));

  const transitionNodes: NodeComponents[] = transitions.map(
    ({ id, label }) => ({
      id,
      data: { type: "rectangle", inner: label },
    }),
  );

  return (
    <Graph
      initialNodes={[...placeNodes, ...transitionNodes]}
      initialEdges={arcs}
    />
  );
};

export default PetriNet;
