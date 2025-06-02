import React from "react";
import { useForm, useFieldArray, Controller, Control } from "react-hook-form";
import { Button, Group, Select, Stack, Badge } from "@mantine/core";

import EventTypeFilterInput from "./OcelInputs/ActivityTypeFilter";
import ObjectTypeFilter from "./OcelInputs/ObjectTypeFilter";
import TimeRangeFilter from "./OcelInputs/TimeFrameFilter";
import { FilterPipeLinePipelineItem } from "@/api/fastapi-schemas";
import E2OCountFilter from "./OcelInputs/E20CountFilter";

// --------------------------------------------
// Type Definitions
// --------------------------------------------
type FilterTypes = NonNullable<FilterPipeLinePipelineItem["type"]>;

export type ConfigByType<T extends FilterTypes> = Omit<
  Extract<FilterPipeLinePipelineItem, { type: T }>,
  "type" | "mode"
>;

type FilterFormItem<T extends FilterTypes = FilterTypes> = {
  type: T;
  mode: "include" | "exclude";
  config: ConfigByType<T>;
};

type FilterFormValues = {
  filters: FilterFormItem[];
};

type FilterDefinition<K extends FilterTypes> = {
  defaultConfig: ConfigByType<K>;
  label: string;
  renderInput: (props: {
    control: Control<FilterFormValues>;
    index: number;
  }) => React.ReactNode;
};

type ControlledInputProps<T> = {
  value: T;
  onChange: (value: T) => void;
};

const FilterController =
  <T,>(InputComponent: React.ComponentType<ControlledInputProps<T>>) =>
  ({
    control,
    index,
  }: {
    control: Control<FilterFormValues>;
    index: number;
  }) => (
    <Controller
      control={control}
      name={`filters.${index}.config` as const}
      render={({ field }) => (
        <InputComponent value={field.value as T} onChange={field.onChange} />
      )}
    />
  );

const filterDefinitions: { [K in FilterTypes]: FilterDefinition<K> } = {
  event_type: {
    label: "Event Type",
    defaultConfig: { event_types: [] },
    renderInput: FilterController<ConfigByType<"event_type">>(
      ({ value: { event_types }, onChange }) => {
        return (
          <EventTypeFilterInput
            value={event_types}
            onChange={(newEvents) => onChange({ event_types: newEvents })}
          />
        );
      },
    ),
  },
  object_type: {
    label: "Object Type",
    defaultConfig: { object_types: [] },
    renderInput: FilterController<ConfigByType<"object_type">>(
      ({ value, onChange }) => {
        return (
          <ObjectTypeFilter
            value={value.object_types}
            onChange={(val) => onChange({ ...value, object_types: val })}
          />
        );
      },
    ),
  },
  time_frame: {
    label: "Time Frame",
    defaultConfig: { start_time: undefined, end_time: undefined },
    renderInput: FilterController<ConfigByType<"time_frame">>(
      ({ value, onChange }) => {
        return (
          <TimeRangeFilter
            value={{
              startTime: value.start_time ?? undefined,
              endTime: value.end_time ?? undefined,
            }}
            onChange={({ startTime, endTime }) =>
              onChange({ start_time: startTime, end_time: endTime })
            }
          />
        );
      },
    ),
  },
  e2o_count: {
    label: "E2O Count",
    defaultConfig: {
      object_type: "",
      event_type: "",
      min: 0,
    },
    renderInput: FilterController<ConfigByType<"e2o_count">>(
      ({ value, onChange }) => (
        <E2OCountFilter value={value} onChange={(v) => onChange(v)} />
      ),
    ),
  },
};

// --------------------------------------------
// Main FilterForm Component
// --------------------------------------------

export const FilterForm: React.FC<{
  onSubmit: (data: FilterFormItem[]) => void;
  initialFilter?: FilterFormItem[];
}> = ({ onSubmit, initialFilter = [] }) => {
  const { control, handleSubmit, watch } = useForm<FilterFormValues>({
    defaultValues: { filters: initialFilter },
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "filters",
  });

  const watchedFilters = watch("filters");

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data.filters))}>
      {fields.map((field, index) => {
        const type = watchedFilters[index].type;
        const def = filterDefinitions[type];

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
                    value={field.value}
                    onChange={(val) => {
                      const def = filterDefinitions[val as FilterTypes];
                      update(index, {
                        type: val as FilterTypes,
                        mode: "include",
                        config: def.defaultConfig,
                      });
                    }}
                    data={Object.entries(filterDefinitions).map(
                      ([value, { label }]) => ({
                        value,
                        label,
                      }),
                    )}
                  />
                )}
              />
              <Controller
                control={control}
                name={`filters.${index}.mode`}
                render={({ field }) => (
                  <Select
                    label="Mode"
                    value={field.value}
                    onChange={(val) => field.onChange(val)}
                    data={[
                      { value: "include", label: "Include" },
                      { value: "exclude", label: "Exclude" },
                    ]}
                  />
                )}
              />
            </Group>

            {def.renderInput({ control, index })}

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
          onClick={() => {
            const def = filterDefinitions.event_type;
            append({
              type: "event_type",
              mode: "include",
              config: def.defaultConfig,
            });
          }}
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
