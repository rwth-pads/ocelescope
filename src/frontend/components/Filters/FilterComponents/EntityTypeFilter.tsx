import { useEventCounts, useObjectCount } from "@/api/fastapi/info/info";
import { MultiSelect, Stack } from "@mantine/core";
import BarChartSelect from "@/components/Charts/BarChartSelect";
import { memo, useMemo } from "react";
import { ConfigByType, FilterType } from "../types";
import { OcelInputType } from "@/types/ocel";

type EntityFilterProps<
  K extends Extract<FilterType, "event_type" | "object_type">,
> = {
  value: ConfigByType<K>;
  onChange: (value: ConfigByType<K>) => void;
  exclude?: boolean;
  showGraph?: boolean;
} & OcelInputType;

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
            selected={value}
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

export const EventTypeFilterInput: React.FC<EntityFilterProps<"event_type">> =
  memo(
    ({ exclude = false, value, onChange, showGraph = true, ...ocelParams }) => {
      const { data: eventTypes = {}, isLoading } = useEventCounts({
        ...ocelParams,
      });

      const values = useMemo(() => {
        return Object.entries(eventTypes).map(([activityName, count]) => ({
          key: activityName,
          value: count,
        }));
      }, [eventTypes]);

      return (
        <EntityTypeFilterInput
          value={value.event_types}
          data={values}
          onChange={(newEventTypes) =>
            onChange({ ...value, event_types: newEventTypes })
          }
        />
      );
    },
  );

export const ObjectTypeFilterInput: React.FC<EntityFilterProps<"object_type">> =
  memo(
    ({ exclude = false, value, onChange, showGraph = true, ...ocelParams }) => {
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
        <EntityTypeFilterInput
          value={value.object_types}
          data={values}
          onChange={(newEventTypes) =>
            onChange({ ...value, object_types: newEventTypes })
          }
        />
      );
    },
  );
