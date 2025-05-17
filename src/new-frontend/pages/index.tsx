import {
  Button,
  Container,
  Divider,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import classes from "@/styles/Import.module.css";
import {
  useGetDefaultOcel,
  useImportDefaultOcel,
} from "@/api/fastapi/default/default";
import { Container as ContainerIcon } from "lucide-react";
import { DropzoneButton } from "@/components/Dropzone";
import { useRouter } from "next/router";
const AuthenticationTitle = () => {
  const { push } = useRouter();
  const { data: defaultOcels } = useGetDefaultOcel({
    only_latest_versions: true,
  });

  const { mutate: importDefaultOcel } = useImportDefaultOcel({
    mutation: {
      onSuccess: () => push("/plugin"),
    },
  });

  return (
    <Container size={700} my={40}>
      <Title ta="center" className={classes.title}>
        Import your OCEL
      </Title>
      <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
        <DropzoneButton />
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
