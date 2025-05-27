import React from "react";
import dayjs from "dayjs";
import { useTimeInfo } from "@/api/fastapi/info/info";
import { DatePickerInput } from "@mantine/dates";

type TimeRangeFilterProps = {
  value: {
    startTime?: string;
    endTime?: string;
  };
  onChange: (value: { startTime?: string; endTime?: string }) => void;
};

const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  onChange,
  value,
}) => {
  const { data: timeInfo } = useTimeInfo();
  return (
    <DatePickerInput
      onChange={(value) => {
        onChange({
          endTime: value[1] ? dayjs(value[1]).toISOString() : undefined,
          startTime: value[0] ? dayjs(value[0]).toISOString() : undefined,
        });
      }}
      minDate={timeInfo?.start_time}
      maxDate={timeInfo?.end_time}
      value={[
        value.startTime ? new Date(value.startTime) : null,
        value.endTime ? new Date(value.endTime) : null,
      ]}
      type="range"
    />
  );
};

export default TimeRangeFilter;
