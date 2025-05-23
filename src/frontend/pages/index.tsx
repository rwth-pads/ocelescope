import { Button, Container, Divider, Paper, Stack, Title } from "@mantine/core";

import classes from "@/styles/Import.module.css";
import {
  useGetDefaultOcel,
  useImportDefaultOcel,
  useImportOcel,
} from "@/api/fastapi/default/default";
import { Container as ContainerIcon } from "lucide-react";
import { DropzoneButton } from "@/components/Dropzone/Dropzone";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";
import { getPluginUrl } from "@/plugins/pluginMap";

const AuthenticationTitle = () => {
  const queryClient = useQueryClient();

  const { push } = useRouter();

  const onImport = async () => {
    queryClient.invalidateQueries();
    await push(getPluginUrl("ocelot", "objects"));
  };

  const { data: defaultOcels } = useGetDefaultOcel({
    only_latest_versions: true,
  });

  const { mutate: importDefaultOcel } = useImportDefaultOcel({
    mutation: {
      onSuccess: onImport,
    },
  });

  const { mutate } = useImportOcel({
    mutation: { onSuccess: onImport },
  });

  return (
    <Container size={700} my={40}>
      <Title ta="center" className={classes.title}>
        Import your OCEL
      </Title>
      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <DropzoneButton
          onDrop={(file) =>
            mutate({ data: { file: file[0] }, params: { name: file[0].name } })
          }
        />
        <Stack gap={0} mt="lg">
          <Divider />
          {defaultOcels?.map((ocel) => (
            <>
              <Button
                variant="subtle"
                p={0}
                onClick={() => importDefaultOcel({ params: { key: ocel.key } })}
                leftSection={<ContainerIcon />}
                rightSection={ocel.version}
                justify="space-between"
                fullWidth
              >
                {ocel.name}
              </Button>
              <Divider />
            </>
          ))}
        </Stack>
      </Paper>
    </Container>
  );
};

export default AuthenticationTitle;
