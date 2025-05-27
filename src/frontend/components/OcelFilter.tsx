import React from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  useController,
  Control,
} from "react-hook-form";
import { Button, Group, Select, Stack } from "@mantine/core";

import EventTypeFilterInput from "./OcelInputs/ActivityTypeFilter";
import ObjectTypeFilter from "./OcelInputs/ObjectTypeFilter";
import TimeRangeFilter from "./OcelInputs/TimeFrameFilter";

import {
  FilterPipeLine,
  EventTypeFilterConfig,
  ObjectTypeFilterConfig,
  TimeFrameFilterConfig,
  E2OCountFilterConfig,
} from "@/api/fastapi-schemas";
import E2OCountFilter from "./OcelInputs/E2OCountFilter";

type FilterFormProps = {
  onSubmit: (data: FilterPipeLine["pipeline"]) => void;
  initialFilter?: FilterPipeLine["pipeline"];
};

type FilterTypes = NonNullable<FilterPipeLine["pipeline"][number]["type"]>;

type FilterFormValues = {
  filters: (
    | EventTypeFilterConfig
    | ObjectTypeFilterConfig
    | TimeFrameFilterConfig
    | E2OCountFilterConfig
  )[];
};

const TimeFrameFilterInput: React.FC<{ control: any; index: number }> = ({
  control,
  index,
}) => {
  const {
    field: { value: startTime, onChange: onStartTimeChange },
  } = useController({
    control,
    name: `filters.${index}.start_time`,
  });

  const {
    field: { value: endTime, onChange: onEndTimeChange },
  } = useController({
    control,
    name: `filters.${index}.end_time`,
  });

  return (
    <TimeRangeFilter
      value={{
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined,
      }}
      onChange={({ startTime, endTime }) => {
        onStartTimeChange(startTime);
        onEndTimeChange(endTime);
      }}
    />
  );
};

const filterInputFactory: Record<
  FilterTypes,
  {
    label: string;
    defaultValue: FilterPipeLine["pipeline"][number];
    input: (
      control: Control<FilterFormValues>,
      index: number,
      filter: FilterFormValues["filters"][number],
    ) => React.ReactNode;
  }
> = {
  event_type: {
    label: "Event Types",
    defaultValue: {
      type: "event_type",
      event_types: [],
    },
    input: (control, index) => (
      <Controller
        control={control}
        name={`filters.${index}.event_types`}
        render={({ field }) => (
          <EventTypeFilterInput value={field.value} onChange={field.onChange} />
        )}
      />
    ),
  },
  object_type: {
    defaultValue: {
      type: "object_type",
      object_types: [],
      mode: "include",
    },
    label: "Object Types",
    input: (control, index) => (
      <Controller
        control={control}
        name={`filters.${index}.object_types`}
        render={({ field }) => <ObjectTypeFilter {...field} />}
      />
    ),
  },
  time_frame: {
    defaultValue: {
      type: "time_frame",
      start_time: undefined,
      end_time: undefined,
    },
    label: "Time Frame",
    input: (control, index) => (
      <TimeFrameFilterInput control={control} index={index} />
    ),
  },
  e2o_count: {
    defaultValue: {
      type: "e2o_count",
      object_type: "",
      event_type: "",
      target: "event",
      min: 0,
      max: undefined,
    },
    label: "E2O Count",
    input: (control, index) => (
      <Controller
        control={control}
        name={`filters.${index}` as const}
        render={({ field }) => (
          <E2OCountFilter
            value={field.value as E2OCountFilterConfig}
            onChange={(value) => {
              console.log(field.value);
              field.onChange({ ...field.value });
            }}
          />
        )}
      />
    ),
  },
};

export const FilterForm: React.FC<FilterFormProps> = ({
  onSubmit,
  initialFilter = [],
}) => {
  const { control, handleSubmit, watch } = useForm<FilterFormValues>({
    defaultValues: {
      filters: initialFilter,
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "filters",
  });

  const watchedFilters = watch("filters");

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data.filters))}>
      {fields.map((field, index) => {
        const filter = watchedFilters[index];
        const type = filter?.type;

        if (!type) return null;

        return (
          <Stack
            key={field.id}
            mt="md"
            p="sm"
            style={{ border: "1px solid #ccc", borderRadius: 4 }}
          >
            <Group grow>
              <Controller
                control={control}
                name={`filters.${index}.type`}
                render={({ field }) => (
                  <Select
                    label="Filter Type"
                    data={Object.entries(filterInputFactory).map(
                      ([value, { label }]) => ({ label, value }),
                    )}
                    value={field.value}
                    onChange={(newType) => {
                      const base =
                        filterInputFactory[newType as FilterTypes].defaultValue;

                      update(index, {
                        ...base,
                        mode: watchedFilters[index].mode ?? "include", // preserve mode if exists
                      });
                    }}
                  />
                )}
              />
              <Controller
                control={control}
                name={`filters.${index}.mode`}
                render={({ field }) => (
                  <Select
                    label="Mode"
                    data={[
                      { value: "include", label: "Include" },
                      { value: "exclude", label: "Exclude" },
                    ]}
                    {...field}
                  />
                )}
              />
            </Group>

            {filterInputFactory[type].input(control, index, filter)}

            <Group>
              <Button
                color="red"
                onClick={() => remove(index)}
                variant="outline"
              >
                Remove Filter
              </Button>
            </Group>
          </Stack>
        );
      })}

      <Group mt="md">
        <Button
          onClick={() =>
            append({
              type: "event_type",
              event_types: [],
              mode: "include",
            })
          }
        >
          + Add Filter
        </Button>
        <Button type="submit" color="blue">
          Apply Filters
        </Button>
      </Group>
    </form>
  );
};
