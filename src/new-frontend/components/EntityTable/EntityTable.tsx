import { PaginatedResponse } from "@/api/fastapi-schemas";
import {
  Flex,
  Grid,
  Input,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Table,
} from "@mantine/core";
import { useState } from "react";
import classes from "./EntityTable.module.css";
import cx, { clsx } from "clsx";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/router";
import { useUpdateQueryParam } from "@/hooks/updateQueryParam";

type EntityTableProps = {
  paginatedEntities: PaginatedResponse;
  onPageChange: (nextPage: number) => void
};

const EntityTable: React.FC<EntityTableProps> = ({ paginatedEntities, onPageChange }) => {
  const generelHeaders = [
    "#",
    ...(paginatedEntities.items[0].timestamp ? ["Timestamp"] : []),
  ];

  const { replace, asPath } = useRouter();
  const attributeNames = Object.keys(paginatedEntities.items[0].attributes);
  const relationsNames = Object.keys(paginatedEntities.items[0].relations);
  const updateQueryParam = useUpdateQueryParam()

  const [currentSection, setCurrentSection] = useState(
    attributeNames.length > 0 ? "attributes" : "relations",
  );
  const [scrolled, setScrolled] = useState(false);

  return (
    <Grid align="center" justify="center" mt={"md"} gutter={"md"}>
      <Grid.Col span={12} style={{ display: "flex" }}>
        <Flex w={"100%"}>
          <Input flex={1} leftSection={<SearchIcon width={16} />} />
          {attributeNames.length > 0 && relationsNames.length > 0 && (
            <SegmentedControl
              data={["attributes", "relations"]}
              onChange={(newSections) => {
                setCurrentSection(newSections);
              }}
            />
          )}
        </Flex>
      </Grid.Col>
      <Grid.Col>
        <ScrollArea
          onScrollPositionChange={({ y }) => setScrolled(y !== 0)}
          h={600}
        >
          <Table miw={700}>
            <Table.Thead
              className={cx(classes.header, { [classes.scrolled]: scrolled })}
            >
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
                      <Table.Td>{value.join(", ")}</Table.Td>
                    ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Grid.Col>
      <Grid.Col span={12} style={{ display: "flex", justifyContent: "center" }}>
        <Pagination
          total={paginatedEntities.total_pages}
          onChange={onPageChange}
          value={paginatedEntities.page}
        />
      </Grid.Col>
    </Grid>
  );
};

export default EntityTable;
