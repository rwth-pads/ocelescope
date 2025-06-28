import { useEventCounts, useObjectCount } from "@/api/fastapi/info/info";
import { MultiSelect, Stack } from "@mantine/core";
import BarChartSelect from "@/components/Charts/BarChartSelect";
import { memo, useMemo } from "react";
import { TypeFormProps } from "..";
import { Controller } from "react-hook-form";

const EntityTypeFilterInput: React.FC<{
  value: string[];
  data: { key: string; value: number }[];
  onChange: (values: string[]) => void;
  showGraph?: boolean;
}> = ({ value, onChange, showGraph = true, data }) => {
  return (
    <Stack pos={"relative"}>
      <>
        {showGraph && (
          <BarChartSelect
            selected={value ?? []}
            values={data}
            onSelect={(selectedValue) => {
              onChange(
                value.includes(selectedValue)
                  ? value.filter((v) => v !== selectedValue)
                  : [...value, selectedValue],
              );
            }}
          />
        )}

        <MultiSelect
          label="Event Types"
          data={data.map(({ key }) => key)}
          value={value}
          searchable
          hidePickedOptions
          nothingFoundMessage={"No event type found"}
          onChange={(newValues) => onChange(newValues)}
          clearable
        />
      </>
    </Stack>
  );
};

export const EventTypeFilterInput: React.FC<TypeFormProps> = memo(
  ({ control, index, ...ocelParams }) => {
    const { data: eventCounts = {} } = useEventCounts({
      ...ocelParams,
    });

    const values = useMemo(() => {
      return Object.entries(eventCounts).map(([activityType, count]) => ({
        key: activityType,
        value: count,
      }));
    }, [eventCounts]);

    return (
      <Controller
        control={control}
        name={`pipeline.${index}.event_types`}
        render={({ field }) => (
          <EntityTypeFilterInput
            value={field.value}
            data={values}
            onChange={field.onChange}
          />
        )}
      />
    );
  },
);
export const ObjectTypeFilterInput: React.FC<TypeFormProps> = memo(
  ({ control, index, ...ocelParams }) => {
    const { data: objectCounts = {}, isLoading } = useObjectCount({
      ...ocelParams,
    });

    const values = useMemo(() => {
      return Object.entries(objectCounts).map(([activityName, count]) => ({
        key: activityName,
        value: count,
      }));
    }, [objectCounts]);

    return (
      <Controller
        control={control}
        name={`pipeline.${index}.object_types`}
        render={({ field }) => (
          <EntityTypeFilterInput
            value={field.value}
            data={values}
            onChange={field.onChange}
          />
        )}
      />
    );
  },
);
