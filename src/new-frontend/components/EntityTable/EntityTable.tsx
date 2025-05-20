import { PaginatedResponse } from "@/api/fastapi-schemas";
import {
  Center,
  Flex,
  Grid,
  Group,
  Input,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Table,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useState } from "react";
import classes from "./EntityTable.module.css";
import cx from "clsx";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  SearchIcon,
} from "lucide-react";

interface ThProps {
  children: React.ReactNode;
  reversed: boolean;
  sorted: boolean;
  onSort: () => void;
}

function Th({ children, reversed, sorted, onSort }: ThProps) {
  const Icon = sorted
    ? reversed
      ? ArrowUpIcon
      : ArrowDownIcon
    : ArrowUpDownIcon;
  return (
    <Table.Th className={classes.th}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group justify="space-between">
          <Text fw={500} fz="sm">
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon size={16} />
          </Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

type EntityTableProps = {
  paginatedEntities: PaginatedResponse;
  onPageChange: (nextPage: number) => void;
  // TODO implement query params
  sorted?: { sortBy: string; ascending: boolean };
  onSort: (newSort: { sortBy: string; ascending: boolean }) => void;
};

const EntityTable: React.FC<EntityTableProps> = ({
  paginatedEntities,
  onPageChange,
  sorted,
  onSort,
}) => {
  const generelHeaders = [
    "id",
    ...(paginatedEntities.items[0].timestamp ? ["timestamp"] : []),
  ];

  const attributeNames = Object.keys(paginatedEntities.items[0].attributes);
  const relationsNames = Object.keys(paginatedEntities.items[0].relations);

  const [currentSection, setCurrentSection] = useState(
    attributeNames.length > 0 ? "attributes" : "relations",
  );
  const [scrolled, setScrolled] = useState(false);

  const sortByName = (name: string) => {
    onSort({
      sortBy: name,
      ascending: sorted?.sortBy === name ? !sorted.ascending : false,
    });
  };
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
                {generelHeaders.map((name) => (
                  <Th
                    sorted={sorted?.sortBy === name}
                    onSort={() => sortByName(name)}
                    reversed={!sorted?.ascending}
                  >
                    {name}
                  </Th>
                ))}
                {currentSection === "attributes" &&
                  attributeNames.map((name) => (
                    <Th
                      sorted={sorted?.sortBy === name}
                      onSort={() => sortByName(name)}
                      reversed={!sorted?.ascending}
                    >
                      {name}
                    </Th>
                  ))}
                {currentSection === "relations" &&
                  relationsNames.map((name) => <Table.Th>{name}</Table.Th>)}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {paginatedEntities.items.map((entity, index) => (
                <Table.Tr key={entity.id}>
                  <Table.Td>{entity.id}</Table.Td>
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
