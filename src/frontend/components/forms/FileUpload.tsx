import { ChangeEvent } from "react"
import { Form } from "react-bootstrap"
type FileUploadProps = {
  onUpload: (blob: File) => void
  accept?: string
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, accept }) => {

  return <><Form.Control type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      onUpload(event.target.files[0])
    }
  }} accept={accept} />
  </>
}

export default FileUpload
