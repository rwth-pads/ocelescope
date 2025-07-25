import { usePlugins } from "@/api/fastapi/plugins/plugins";
import PluginForm from "@/components/PluginForm/PluginForm";
import { Container, LoadingOverlay, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";

const PluginPage = () => {
  const { data: plugins } = usePlugins();
  const router = useRouter();
  const [_, setTaskId] = useState<string | undefined>();
  const { name, method, version } = router.query;

  const pluginFormProps = useMemo(() => {
    if (!plugins || !name || !method) {
      return;
    }

    const plugin = Object.values(plugins)
      .filter(
        ({ metadata, methods }) =>
          metadata.name === name &&
          (!version || version === metadata.version) &&
          (method as string) in methods,
      )
      .sort((a, b) => b.metadata.version.localeCompare(a.metadata.version))[0];

    return {
      pluginMethod: plugin.methods[method as string],
      pluginName: plugin.metadata.name,
      pluginVersion: plugin.metadata.version,
    };
  }, [plugins, name, method]);

  if (pluginFormProps === undefined) {
    return <LoadingOverlay />;
  }
  return (
    <Container>
      <Stack gap={"md"}>
        <Stack gap={0}>
          <Title>{pluginFormProps.pluginMethod.label}</Title>
          <Text>{pluginFormProps.pluginMethod.description}</Text>
        </Stack>
        {pluginFormProps && (
          <PluginForm onSuccess={setTaskId} {...pluginFormProps} />
        )}
      </Stack>
    </Container>
  );
};

export default PluginPage;
