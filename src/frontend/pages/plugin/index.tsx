import { PluginSummary } from "@/api/fastapi-schemas";
import {
  useListPluginsPluginGet,
  useRunPluginPluginPluginIdRunPost,
} from "@/api/fastapi/plugin/plugin";
import { useGetResources } from "@/api/fastapi/resource/resource";
import { useGetOcels } from "@/api/fastapi/session/session";
import PluginUpload from "@/components/PluginUpload/PluginUpload";
import {
  Button,
  Code,
  ComboboxItem,
  Divider,
  Group,
  LoadingOverlay,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
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
  const { refetch: refetchResources } = useGetResources();
  const { mutate, isPending } = useRunPluginPluginPluginIdRunPost({
    mutation: {
      onSuccess: () => {
        refetchResources();
        showNotification({
          message: "Plugin executed successfully",
          color: "green",
        });
      },
    },
  });
  const { data: ocels } = useGetOcels();
  const [currentPlugin, setCurrentPlugin] = useState<PluginSummary | null>(
    null,
  );

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

  return (
    <Stack pos={"relative"}>
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
        value={currentPlugin?.id}
        onChange={(newId) =>
          setCurrentPlugin(plugins.find(({ id }) => newId === id) ?? null)
        }
        data={Object.entries(selectOptions).map(([id, { methods }]) => ({
          group: id,
          items: methods.map((method) => ({
            value: `${id}:${method}`,
            label: method,
          })),
        }))}
      />
      <Button
        onClick={() =>
          mutate({
            pluginId: currentPlugin!.id,
            data: Object.fromEntries(
              currentPlugin!.input_types.map(({ name }) => [
                name,
                ocels?.current_ocel_id,
              ]),
            ),
          })
        }
        disabled={!currentPlugin || !ocels?.current_ocel_id}
      >
        Run
      </Button>
      <LoadingOverlay visible={isPending} />
    </Stack>
  );
};

export default PluginPage;
