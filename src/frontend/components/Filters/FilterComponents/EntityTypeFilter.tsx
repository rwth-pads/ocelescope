import { useEventCounts, useObjectCount } from "@/api/fastapi/ocels/ocels";
import { MultiSelect, Stack } from "@mantine/core";
import BarChartSelect from "@/components/Charts/BarChartSelect";
import { memo, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { FilterFormType } from "..";
import { OcelInputType } from "@/types/ocel";

const EntityTypeFilterInput: React.FC<{
  selectedEntityTypes: string[];
  entityTypes: { key: string; value: number }[];
  onChange: (values: string[]) => void;
  showGraph?: boolean;
}> = ({ entityTypes, onChange, showGraph = true, selectedEntityTypes }) => {
  return (
    <Stack pos={"relative"}>
      <>
        {showGraph && (
          <BarChartSelect
            selected={selectedEntityTypes}
            values={entityTypes}
            onSelect={(selectedValue) => {
              onChange(
                selectedEntityTypes.includes(selectedValue)
                  ? selectedEntityTypes.filter((v) => v !== selectedValue)
                  : [...selectedEntityTypes, selectedValue],
              );
            }}
          />
        )}

        <MultiSelect
          label="Event Types"
          data={entityTypes.map(({ key }) => key)}
          value={selectedEntityTypes}
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

export const EventTypeFilterInput: React.FC<{
  ocelParams?: OcelInputType;
}> = memo(({ ocelParams }) => {
  const { data: eventCounts = {} } = useEventCounts({
    ...ocelParams,
  });

  const values = useMemo(() => {
    return Object.entries(eventCounts).map(([activityType, count]) => ({
      key: activityType,
      value: count,
    }));
  }, [eventCounts]);

  const { control } = useFormContext<FilterFormType>();
  return (
    <Controller
      control={control}
      name={"event_type.event_types"}
      render={({ field }) => (
        <EntityTypeFilterInput
          onChange={field.onChange}
          entityTypes={values}
          selectedEntityTypes={field.value}
          showGraph={true}
        />
      )}
    />
  );
});

export const ObjectTypeFilterInput: React.FC<{ ocelParams: OcelInputType }> =
  memo(({ ocelParams }) => {
    const { data: objectCounts = {}, isLoading } = useObjectCount({
      ...ocelParams,
    });

    const values = useMemo(() => {
      return Object.entries(objectCounts).map(([activityName, count]) => ({
        key: activityName,
        value: count,
      }));
    }, [objectCounts]);

    const { control } = useFormContext<FilterFormType>();
    return (
      <Controller
        control={control}
        name={"object_type.object_types"}
        render={({ field }) => (
          <EntityTypeFilterInput
            onChange={field.onChange}
            entityTypes={values}
            selectedEntityTypes={field.value}
            showGraph={true}
          />
        )}
      />
    );
  });
