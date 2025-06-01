import { ComponentProps, useRef } from "react";
import { Button, Group, Text, useMantineTheme } from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import classes from "@/components/Dropzone/Dropzone.module.css";
import { DownloadIcon, Upload, X } from "lucide-react";

export const DropzoneButton: React.FC<{
  onDrop: ComponentProps<typeof Dropzone>["onDrop"];
}> = ({ onDrop }) => {
  const theme = useMantineTheme();
  const openRef = useRef<() => void>(null);

  return (
    <div className={classes.wrapper}>
      <Dropzone
        openRef={openRef}
        onDrop={onDrop}
        className={classes.dropzone}
        radius="md"
        accept={["text/xml", "application/json", "application/vnd.sqlite3"]}
      >
        <div style={{ pointerEvents: "none" }}>
          <Group justify="center">
            <Dropzone.Accept>
              <DownloadIcon size={50} color={theme.colors.blue[6]} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <X size={50} color={theme.colors.red[6]} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <Upload size={50} className={classes.icon} />
            </Dropzone.Idle>
          </Group>

          <Text ta="center" fw={700} fz="lg" mt="xl">
            <Dropzone.Accept>Drop files here</Dropzone.Accept>
            <Dropzone.Reject>Not supported file format</Dropzone.Reject>
            <Dropzone.Idle>Upload OCEL</Dropzone.Idle>
          </Text>

          <Text className={classes.description}>
            Drag&apos;n&apos;drop files here to upload. We can accept only{" "}
            <i>.sqlite, .json, .xml </i> files.
          </Text>
        </div>
      </Dropzone>

      <Button
        className={classes.control}
        size="sm"
        radius="xl"
        onClick={() => openRef.current?.()}
      >
        Select files
      </Button>
    </div>
  );
};
