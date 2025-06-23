import { useEventCounts, useTimeInfo } from "@/api/fastapi/info/info";
import { Box, Grid, LoadingOverlay, RangeSlider } from "@mantine/core";
import { useMemo } from "react";
import { ConfigByType, FilterType } from "../types";
import assignUniqueColors from "@/util/colors";
import { BarChart, BarChartSeries } from "@mantine/charts";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { OcelInputType } from "@/types/ocel";

type TimeFrameFilterProps<K extends FilterType> = {
  value: ConfigByType<K>;
  onChange: (value: ConfigByType<K>) => void;
  showGraph?: boolean;
} & OcelInputType;

const TimeFrameFilter: React.FC<TimeFrameFilterProps<"time_frame">> = ({
  value,
  onChange,
  showGraph = true,
  ocel_id,
  ocel_version,
}) => {
  const { data: timeInfo, isLoading } = useTimeInfo({ ocel_id, ocel_version });
  const { data: eventCount } = useEventCounts({ ocel_id, ocel_version });

  const { data, series } = useMemo(() => {
    if (!timeInfo || !eventCount) {
      return { data: [], series: [] };
    }

    if (Object.keys(eventCount ?? {}).length <= 20) {
      const colorMap = assignUniqueColors(Object.keys(eventCount ?? {}));

      const data = timeInfo.date_distribution.map(({ date, entity_count }) => ({
        date,
        ...entity_count,
      }));

      const series: BarChartSeries[] = Object.entries(colorMap).map(
        ([entity_type, color]) => ({ name: entity_type, color: color }),
      );
      return { data, series };
    }

    const data = timeInfo.date_distribution.map(({ date, entity_count }) => ({
      date,
      value: Object.values(entity_count).reduce((acc, curr) => acc + curr, 0),
    }));

    const series: BarChartSeries[] = [{ name: "value", color: "blue" }];
    return { data, series };
  }, [timeInfo, eventCount]);

  return (
    <Box pos={"relative"} w={"100%"} h={"100%"}>
      <LoadingOverlay visible={isLoading} />
      {timeInfo && (
        <Grid justify="center" align="center">
          <Grid.Col span={8} />
          <Grid.Col span={4}></Grid.Col>
          {showGraph && (
            <>
              <Grid.Col span={12}>
                <BarChart
                  h={300}
                  w={"100%"}
                  data={data}
                  dataKey="date"
                  type="stacked"
                  series={series}
                  withYAxis={false}
                  withXAxis={false}
                  barChartProps={{ barCategoryGap: 0, barGap: 0 }}
                />
              </Grid.Col>
            </>
          )}
          <Grid.Col span={2}>
            <DateTimePicker
              minDate={timeInfo.start_time}
              maxDate={value.end_time ?? timeInfo.end_time}
              value={value.start_time ?? timeInfo.start_time}
              onChange={(newStartDate) =>
                onChange({
                  ...value,
                  start_time: dayjs(newStartDate).toISOString(),
                })
              }
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <RangeSlider minRange={0} min={1} max={data.length} />
          </Grid.Col>
          <Grid.Col span={2}>
            <DateTimePicker
              minDate={value.start_time ?? timeInfo.start_time}
              maxDate={timeInfo.end_time}
              value={value.end_time ?? timeInfo.end_time}
              onChange={(newEndDate) =>
                onChange({
                  ...value,
                  end_time: dayjs(newEndDate).toISOString(),
                })
              }
            />
          </Grid.Col>
        </Grid>
      )}
    </Box>
  );
};

export default TimeFrameFilter;
