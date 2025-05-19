import { PaginatedResponse } from "@/api/fastapi-schemas";
import {
  Flex,
  Input,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Table,
} from "@mantine/core";
import { useState } from "react";

type EntityTableProps = {
  paginatedEntities: PaginatedResponse;
};

const EntityTable: React.FC<EntityTableProps> = ({ paginatedEntities }) => {
  const generelHeaders = [
    "#",
    ...(paginatedEntities.items[0].timestamp ? ["Timestamp"] : []),
  ];

  const attributeNames = Object.keys(paginatedEntities.items[0].attributes);
  const relationsNames = Object.keys(paginatedEntities.items[0].relations);

  const [currentSection, setCurrentSection] = useState("attributes");

  return (
    <Flex direction={"column"} align={"center"} gap={"md"}>
      <Flex>
        <Input width={"100%"} />
        <SegmentedControl
          data={["attributes", "relations"]}
          onChange={(newSections) => {
            setCurrentSection(newSections);
          }}
        />
      </Flex>
      <ScrollArea w={"100%"}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {[
                ...generelHeaders,
                ...(currentSection === "attributes"
                  ? attributeNames
                  : relationsNames),
              ].map((name) => (
                <Table.Th>{name}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {paginatedEntities.items.map((entity, index) => (
              <Table.Tr key={entity.id}>
                <Table.Td>{index + 1}</Table.Td>
                {entity.timestamp && <Table.Td>{entity.timestamp}</Table.Td>}
                {currentSection === "attributes"
                  ? Object.values(entity.attributes).map((value) => (
                      <Table.Td>{value as string}</Table.Td>
                    ))
                  : Object.values(entity.relations).map((value) => (
                      <Table.Td>{value.concat(",")}</Table.Td>
                    ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      <Pagination total={paginatedEntities.total_pages} />
    </Flex>
  );
};

export default EntityTable;
