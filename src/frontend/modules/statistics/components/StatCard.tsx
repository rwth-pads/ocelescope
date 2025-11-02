import { Card, Text } from "@mantine/core";

const StatCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Text fw={500}>{title}</Text>
      <Card.Section p={"md"}>{children}</Card.Section>
    </Card>
  );
};

export default StatCard;
