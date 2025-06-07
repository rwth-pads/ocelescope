import { Button, Container, Divider, Paper, Stack, Title } from "@mantine/core";

import classes from "@/styles/Import.module.css";
import {
  useGetDefaultOcel,
  useImportDefaultOcel,
  useImportOcel,
} from "@/api/fastapi/default/default";
import { Container as ContainerIcon } from "lucide-react";
import FileDropzone from "@/components/Dropzone/Dropzone";

const OcelUpload: React.FC<{ onUpload: () => void }> = ({ onUpload }) => {
  const { data: defaultOcels } = useGetDefaultOcel({
    only_latest_versions: true,
  });

  const { mutate: importDefaultOcel } = useImportDefaultOcel({
    mutation: {
      onSuccess: onUpload,
    },
  });

  const { mutate } = useImportOcel({
    mutation: { onSuccess: onUpload },
  });

  return (
    <Paper withBorder shadow="sm" p={22} mt={30} radius="md">
      <FileDropzone
        onUpload={(file) =>
          mutate({ data: { file: file[0] }, params: { name: file[0].name } })
        }
        accept={[".json", ".jsonocel", ".sqlite", ".xml", ".xmlocel"]}
        content={{
          accept: "Drop files here",
          idle: "Upload OCEL",
          reject: "Not supported file format",
          description: (
            <>
              Drag&apos;n&apos;drop files here to upload. We can accept only
              <i>.sqlite, .json, .xml </i> files.
            </>
          ),
        }}
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
  );
};

export default OcelUpload;
