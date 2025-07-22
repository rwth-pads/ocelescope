import { usePlugins } from "@/api/fastapi/plugins/plugins";
import PluginForm from "@/components/PluginForm/PluginForm";
import ResourceView from "@/components/Resources/ResourceView";
import useWaitForTask from "@/hooks/useTaskWaiter";
import {
  Box,
  Container,
  LoadingOverlay,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";

const PluginPage = () => {
  const { data: plugins } = usePlugins();
  const router = useRouter();
  const [taskId, setTaskId] = useState<string | undefined>();
  const { id, method } = router.query;

  const { task } = useWaitForTask({
    taskId,
    onSuccess: () => {},
  });
  console.log(task);

  const methodDescription = useMemo(() => {
    if (!plugins || !id || !method) {
      return;
    }

    return plugins[id as string].methods[method as string];
  }, [plugins, id, method]);

  if (methodDescription === undefined) {
    return <LoadingOverlay />;
  }
  return (
    <Container>
      <Stack gap={"md"}>
        <Stack gap={0}>
          <Title>{methodDescription.label}</Title>
          <Text>{methodDescription.description}</Text>
        </Stack>

        {taskId && (
          <Box w={"100%"} h={500} pos={"relative"}>
            {task?.result ? (
              task.result.output_ids.map((id) => <ResourceView id={id} />)
            ) : (
              <LoadingOverlay visible={true} />
            )}
          </Box>
        )}
        {methodDescription && (
          <PluginForm
            pluginId={id as string}
            pluginMetod={methodDescription}
            onSuccess={setTaskId}
          />
        )}
      </Stack>
    </Container>
  );
};

export default PluginPage;
