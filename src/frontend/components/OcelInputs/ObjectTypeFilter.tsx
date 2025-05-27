import { useEventCounts, useObjectCount } from "@/api/fastapi/info/info";
import { MultiSelect } from "@mantine/core";

type ObjectTypeFilterInputProps = {
  value: string[];
  onChange: (val: string[]) => void;
};

const ObjectTypeFilterInput: React.FC<ObjectTypeFilterInputProps> = ({
  value,
  onChange,
}) => {
  const { data: objectCounts } = useObjectCount();
  return (
    <MultiSelect
      label="Object Types"
      data={objectCounts ? Object.keys(objectCounts) : []}
      value={value}
      onChange={onChange}
    />
  );
};

export default ObjectTypeFilterInput;
