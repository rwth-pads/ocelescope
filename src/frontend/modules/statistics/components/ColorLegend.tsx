import { Box, Group, Stack, Text } from "@mantine/core";

const ColorLegend: React.FC<{
  data: { name: string; value: number; color: string }[];
  countFormat?: "percentage" | "";
}> = ({ data }) => {
  return (
    <Stack align="start" justify="center" flex={1}>
      {data.map(({ color, name, value }) => (
        <Group wrap="nowrap" justify="space-between" w={"100%"}>
          <Box style={{ borderRadius: "100%" }} w={20} h={20} bg={color} />
          <Text size="sm" truncate="end">
            {name}
          </Text>
          <Text size="sm" flex={1} ta={"right"}>
            {value}
          </Text>
        </Group>
      ))}
    </Stack>
  );
};

export default ColorLegend;
