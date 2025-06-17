import { useEventCounts } from "@/api/fastapi/info/info";
import {
  Group,
  LoadingOverlay,
  MultiSelect,
  Paper,
  Pill,
  Stack,
  Text,
} from "@mantine/core";
import { BarChart } from "@mantine/charts";
import assignUniqueColors from "@/plugins/berti/util";

type EventTypeFilterInputProps = {
  value: string[];
  onChange: (val: string[]) => void;
  exclude?: boolean;
  showGraph?: boolean;
};

const EventTypeFilterInput: React.FC<EventTypeFilterInputProps> = ({
  exclude = false,
  value,
  onChange,
  showGraph,
}) => {
  const { data: eventTypes = {}, isLoading } = useEventCounts();
  const colorMap = assignUniqueColors(Object.keys(eventTypes));
  return (
    <Stack pos={"relative"}>
      {isLoading ? (
        <LoadingOverlay />
      ) : (
        <>
          {showGraph && (
            <BarChart
              h={40 * Object.keys(eventTypes).length}
              data={Object.entries(eventTypes).map(([name, count]) => ({
                name,
                count,
                color:
                  exclude !== value.includes(name) ? colorMap[name] : "gray.6",
              }))}
              minBarSize={30}
              tooltipProps={{
                content: ({ label }) => (
                  <Paper px="md" py="sm" withBorder shadow="md" radius="md">
                    <Text>{label}</Text>
                  </Paper>
                ),
              }}
              dataKey="name"
              orientation="vertical"
              yAxisProps={{ width: 130 }}
              series={[{ name: "count", color: "gray.6" }]}
              gridAxis="none"
              barChartProps={{
                onClick: ({ activeLabel }) => {
                  if (!activeLabel) return;
                  if (exclude && value.includes(activeLabel)) {
                    onChange(value.filter((v) => v !== activeLabel));
                  }

                  if (!value.includes(activeLabel)) {
                    onChange([...value, activeLabel]);
                  }
                },
              }}
            />
          )}
          <MultiSelect
            label="Event Types"
            data={eventTypes ? Object.keys(eventTypes) : []}
            value={value}
            searchable
            hidePickedOptions
            nothingFoundMessage={"No event type found"}
            onChange={onChange}
            clearable
          />
        </>
      )}
    </Stack>
  );
};

export default EventTypeFilterInput;
