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
import { HeartIcon, Star, User } from "lucide-react";
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
            alt={"a"}
            width={100}
            height={100}
            style={{ borderRadius: "50px" }}
          />
          <Title>{}</Title>
        </Stack>
        <Stack gap={0}>
          <Title order={2}>Description</Title>
          <Text>{}</Text>
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
            <Table.Tbody></Table.Tbody>
          </Table>
        </Stack>
        <Stack gap={0}>
          <Title order={2}>Authors</Title>
          <Group></Group>
        </Stack>
      </Stack>
    </Container>
  );
};

export default PluginOverview;
