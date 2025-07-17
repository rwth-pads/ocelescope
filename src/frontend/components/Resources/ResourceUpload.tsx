import { Paper } from "@mantine/core";
import FileDropzone from "../Dropzone/Dropzone";
import { FileWithPath } from "@mantine/dropzone";
import { useAddResource } from "@/api/fastapi/resources/resources";
import { ResourceOutput } from "@/api/fastapi-schemas";
import { showNotification } from "@mantine/notifications";

const handleUpload =
  (onUpload: (resource: ResourceOutput) => void) => (files: FileWithPath[]) => {
    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = JSON.parse(
          event.target?.result as string,
        ) as ResourceOutput;

        onUpload(json);
      } catch (error) {
        console.error("Invalid JSON file:", error);
      }
    };

    reader.readAsText(file);
  };
const ResourceUpload: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { mutate } = useAddResource({
    mutation: {
      onSuccess: () => {
        showNotification({
          message: "Succesfully uploaded Resource",
          color: "green",
        });
        onSuccess();
      },
    },
  });
  return (
    <Paper withBorder pos={"relative"} shadow="sm" p={22} mt={30} radius="md">
      <FileDropzone
        onUpload={handleUpload((resource) => mutate({ data: resource }))}
        accept={[".json"]}
        content={{
          accept: "Drop files here",
          idle: "Upload Resource",
          reject: "Not supported file format",
          description: (
            <>
              Drag&apos;n&apos;drop files here to upload. We only accept
              resources in json format.
            </>
          ),
        }}
      />
    </Paper>
  );
};

export default ResourceUpload;
