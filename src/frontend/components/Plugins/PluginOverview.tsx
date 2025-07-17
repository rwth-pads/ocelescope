import { getPluginRoute } from "@/lib/plugins";
import pluginMap from "@/lib/plugins/plugin-map";
import { PluginName, RouteName } from "@/types/plugin";
import {
  ActionIcon,
  Badge,
  Container,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

const PluginOverview: React.FC<{ pluginName: PluginName }> = ({
  pluginName,
}) => {
  const plugin = pluginMap[pluginName];

  const router = useRouter();
  return (
    <Container>
      <Stack>
        <Stack align="center" gap={"xs"}>
          <Image
            src={`/plugins/${pluginName}/cover.png`}
            alt={plugin.label}
            width={100}
            height={100}
            style={{ borderRadius: "50px" }}
          />
          <Title>{plugin.label}</Title>
        </Stack>
        <Stack gap={0}>
          <Title order={2}>Description</Title>
          <Text>{plugin.description}</Text>
        </Stack>
        <Stack gap={0}>
          <Title order={2}>Tools</Title>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ whiteSpace: "nowrap", width: 1 }}>
                  Name
                </Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.values(plugin.routes).map(({ name, label }) => (
                <Table.Tr
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(
                      getPluginRoute({
                        name: plugin.name as PluginName,
                        route: name as RouteName<PluginName>,
                      }),
                    )
                  }
                >
                  <Table.Td style={{ whiteSpace: "nowrap" }}>{label}</Table.Td>
                  <Table.Td>{}</Table.Td>
                  <Table.Td>
                    <Group align="center" justify="end">
                      <ActionIcon
                        variant={"subtle"}
                        color="red"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Star fill="yellow" color="yellow" />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
        <Stack gap={0}>
          <Title order={2}>Authors</Title>
          <Group>
            {plugin.authors.map(({ name, link }) =>
              link ? (
                <Badge component={Link} href={link}>
                  {name}
                </Badge>
              ) : (
                <Badge>{name}</Badge>
              ),
            )}
          </Group>
        </Stack>
      </Stack>
    </Container>
  );
};

export default PluginOverview;
