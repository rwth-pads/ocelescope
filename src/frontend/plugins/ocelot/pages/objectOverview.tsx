import { RouteDefinition } from "@/plugins/types";
import { useO2o, useObjectAttributes } from "@/api/fastapi/info/info";
import Graph, { NodeComponents } from "@/components/Graph";
import { Box, Divider, Table, Text } from "@mantine/core";
import { ObjectAttributes200Item } from "@/api/fastapi-schemas";
import { useMemo } from "react";
import { MarkerType } from "@xyflow/react";

const AttributeTable: React.FC<{
  name: string;
  attributes?: ObjectAttributes200Item[];
}> = ({ name, attributes }) => {
  return (
    <Box w="100%" bd={"1px solid black"} bg={"white"} miw={200} mih={100}>
      <Text fw={700} size="sm" ta="center" py={"4"}>
        {name}
      </Text>
      <Divider c={"black"} />
      {attributes && attributes.length !== 0 && (
        <Table withRowBorders={false}>
          <Table.Thead>
            {attributes.map((attribute) => (
              <Table.Tr>
                <Table.Td> {attribute.attribute}</Table.Td>
                <Table.Td ta={"end"}>{attribute.type}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Thead>
        </Table>
      )}
    </Box>
  );
};

const ObjectGraph = () => {
  const { data: o2o } = useO2o();
  const { data: objectAttributes } = useObjectAttributes();

  const nodes = useMemo(() => {
    if (!o2o || !objectAttributes) return [];
    const objectTypeNames = Array.from(
      new Set(o2o.flatMap(({ target, source }) => [target, source])),
    );
    return objectTypeNames.map(
      (objectName) =>
        ({
          id: objectName,
          data: {
            type: "rectangle",
            inner: (
              <AttributeTable
                name={objectName}
                attributes={objectAttributes[objectName]}
              />
            ),
          },
        }) satisfies NodeComponents,
    );
  }, [o2o, objectAttributes]);

  return (
    <Box w={"100%"} h={"100%"}>
      {o2o && objectAttributes && (
        <Graph
          initialNodes={nodes}
          initialEdges={o2o.map(({ source, target, sum }) => ({
            source: source,
            target,
            markerEnd: { type: MarkerType.Arrow },
            data: { mid: <Text size="xs">{sum}</Text> },
          }))}
          layoutOptions={{
            type: "elk",
            options: {
              "elk.algorithm": "layered",
              "elk.direction": "DOWN",
              "elk.spacing.nodeNode": 50,
              "elk.layered.spacing.nodeNodeBetweenLayers": 100,
            },
          }}
        />
      )}
    </Box>
  );
};

export default ObjectGraph;

export const config: RouteDefinition = { name: "Object Overview" };
