import { createFileRoute } from "@tanstack/react-router";
import { Button, Group } from "@mantine/core";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <Group>
      <Button>Test</Button>
    </Group>
  );
}
