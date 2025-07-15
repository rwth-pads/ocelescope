import { useUploadPluginPluginPost } from "@/api/fastapi/plugin/plugin";
import FileDropzone from "../Dropzone/Dropzone";

const PluginUpload: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { mutate } = useUploadPluginPluginPost({ mutation: { onSuccess } });
  return (
    <>
      <FileDropzone
        onUpload={(file) =>
          mutate({
            data: { zip_file: file[0] },
          })
        }
        accept={["application/zip"]}
        content={{
          accept: "Drop files here",
          idle: "Upload Plugin",
          reject: "Not supported file format",
          description: (
            <>
              Drag&apos;n&apos;drop files here to upload. We can accept only
              <i>.zip</i> files.
            </>
          ),
        }}
      />
    </>
  );
};

export default PluginUpload;
