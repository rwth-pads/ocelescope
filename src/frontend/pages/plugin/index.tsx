import { PluginSummary } from "@/api/fastapi-schemas";
import { useListPluginsPluginGet } from "@/api/fastapi/plugin/plugin";
import PluginUpload from "@/components/PluginUpload/PluginUpload";
import {
  Code,
  ComboboxItem,
  Divider,
  Group,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";

export const PluginTable: React.FC<{ data: PluginSummary[] }> = ({ data }) => {
  const rows = data.map((plugin) => (
    <Table.Tr key={plugin.id}>
      <Table.Td>
        <Group gap="xs">
          <Text fw={500}>{plugin.plugin}</Text>
          <Code>{plugin.method}</Code>
        </Group>
      </Table.Td>
      <Table.Td>
        {plugin.input_types.map((input) => (
          <Text size="sm" key={input.name}>
            <b>{input.name}</b>: <Code>{input.type}</Code>
            {input.description ? ` – ${input.description}` : ""}
          </Text>
        ))}
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          <b>{plugin.output_types.name}</b>:{" "}
          <Code>{plugin.output_types.type}</Code> (
          {plugin.output_types.resource_types})
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <ScrollArea>
      <Title order={3} mb="md">
        Available Plugins
      </Title>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Plugin / Method</Table.Th>
            <Table.Th>Inputs</Table.Th>
            <Table.Th>Outputs</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  );
};
const PluginPage = () => {
  const { data: plugins = [], refetch } = useListPluginsPluginGet();
  const [currentOcel, setCurrentOcel] = useState<string | null>(null);
  const selectOptions = useMemo(() => {
    return plugins.reduce<Record<string, { methods: string[] }>>(
      (acc, curr) => {
        const [id, method] = curr.id.split(":");

        if (id in acc) {
          acc[id].methods.push(method);
        } else {
          acc[id] = { methods: [method] };
        }
        return acc;
      },
      {},
    );
  }, [plugins]);
  console.log("selectOptions", selectOptions);
  return (
    <Stack>
      <Title order={3} mb="md">
        Upload
      </Title>
      <PluginUpload onSuccess={refetch} />
      <Divider />
      <PluginTable data={plugins} />
      <Divider />
      <Title order={3} mb="md">
        Upload
      </Title>
      <Select
        label="Select Plugin Method"
        data={Object.entries(selectOptions).map(([id, { methods }]) => ({
          group: id,
          items: methods.map((method) => ({
            value: `${id}:${method}`,
            label: method,
          })),
        }))}
      />
    </Stack>
  );
};

export default PluginPage;
