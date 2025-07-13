import pluginMap from "@/lib/plugins/plugin-map";
import { PluginName } from "@/types/plugin";
import { ActionIcon, Card, Group, Text } from "@mantine/core";
import { HeartIcon, ToyBrick } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const PluginCard: React.FC<{ name: PluginName }> = ({ name }) => {
  const [hasCover, setHasCover] = useState(true);

  const plugin = pluginMap[name];
  return (
    <Card w={300} withBorder p={"md"} component={Link} href={`/plugin/${name}`}>
      <Card.Section h={225}>
        {hasCover ? (
          <Image
            src={`/plugins/${name}/cover.png`}
            width={300}
            height={225}
            alt=""
            onError={() => setHasCover(false)}
          />
        ) : (
          <Group
            bg={"gray"}
            w={300}
            h={225}
            align="center"
            justify="center"
            bd={""}
          >
            <ToyBrick width={60} height={60} />
          </Group>
        )}
      </Card.Section>
      <Card.Section mt="xs" pb={"xs"} px={"md"}>
        <Group justify="space-between">
          <Text fz="lg" fw={500}>
            {plugin.label}
          </Text>
          <ActionIcon variant="subtle" radius="md" size={36}>
            <HeartIcon />
          </ActionIcon>
        </Group>
      </Card.Section>
    </Card>
  );
};

export default PluginCard;
