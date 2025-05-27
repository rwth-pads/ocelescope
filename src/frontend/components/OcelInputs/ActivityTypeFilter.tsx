import { useEventCounts } from "@/api/fastapi/info/info";
import { MultiSelect } from "@mantine/core";

type EventTypeFilterInputProps = {
  value: string[];
  onChange: (val: string[]) => void;
};

const EventTypeFilterInput: React.FC<EventTypeFilterInputProps> = ({
  value,
  onChange,
}) => {
  const { data: eventTypes } = useEventCounts();
  return (
    <MultiSelect
      label="Event Types"
      data={eventTypes ? Object.keys(eventTypes) : []}
      value={value}
      onChange={onChange}
    />
  );
};

export default EventTypeFilterInput;
