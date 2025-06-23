import { useEventCounts, useTimeInfo } from "@/api/fastapi/info/info";
import { Box, Grid, LoadingOverlay, RangeSlider } from "@mantine/core";
import { memo, useMemo } from "react";
import { ConfigByType, FilterType } from "../types";
import assignUniqueColors from "@/util/colors";
import { BarChart, BarChartSeries } from "@mantine/charts";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { OcelInputType } from "@/types/ocel";
import { EntityTimeInfo } from "@/api/fastapi-schemas";
import { useDebouncedValue } from "@mantine/hooks";

type TimeFrameFilterProps<K extends FilterType> = {
  value: ConfigByType<K>;
  onChange: (value: ConfigByType<K>) => void;
  showGraph?: boolean;
} & OcelInputType;

const TimeGraph: React.FC<{
  timeInfo: EntityTimeInfo;
  startDate: string;
  endDate: string;
}> = memo(({ timeInfo, startDate, endDate }) => {
  const data = useMemo(() => {
    const data = timeInfo.date_distribution.map(({ date, entity_count }) => {
      const d = dayjs(date);
      const start = dayjs(startDate);
      const end = dayjs(endDate);

      const isInRange =
        d.isSame(start) ||
        d.isSame(end) ||
        (d.isAfter(start) && d.isBefore(end));

      return {
        date,
        ...(isInRange
          ? {
              value: Object.values(entity_count).reduce(
                (acc, curr) => acc + curr,
                0,
              ),
            }
          : {
              disabledValue: Object.values(entity_count).reduce(
                (acc, curr) => acc + curr,
                0,
              ),
            }),
      };
    });

    return data;
  }, [timeInfo, startDate, endDate]);
  return (
    <Grid.Col span={12}>
      <BarChart
        h={300}
        w={"100%"}
        data={data}
        dataKey="date"
        type="stacked"
        series={[
          { name: "value", color: "blue" },
          { name: "disabledValue", color: "red" },
        ]}
        withYAxis={false}
        withXAxis={false}
        barChartProps={{ barCategoryGap: 0, barGap: 0 }}
      />
    </Grid.Col>
  );
});

const TimeFrameFilter: React.FC<TimeFrameFilterProps<"time_frame">> = memo(
  ({ value, onChange, showGraph = true, ocel_id, ocel_version }) => {
    const { data: timeInfo, isLoading } = useTimeInfo({
      ocel_id,
      ocel_version,
    });
    const { data: eventCount } = useEventCounts({ ocel_id, ocel_version });

    const { amountOfDays } = useMemo(() => {
      if (!timeInfo || !eventCount) {
        return { amountOfDays: 0 };
      }

      const startTime = dayjs(timeInfo.start_time);
      const endTime = dayjs(timeInfo.end_time);

      const amountOfDays = endTime.diff(startTime, "day");

      return { amountOfDays };
    }, [timeInfo, eventCount]);

    const sliderValue: [number, number] = useMemo(() => {
      if (!timeInfo) return [0, 0];

      const startDiff = value.start_time
        ? dayjs(value.start_time).diff(dayjs(timeInfo.start_time), "day")
        : 0;

      const endDiff = value.end_time
        ? dayjs(value.end_time).diff(dayjs(timeInfo.start_time), "day")
        : amountOfDays;

      return [startDiff, endDiff];
    }, [value, timeInfo, amountOfDays]);

    return (
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        <LoadingOverlay visible={isLoading} />
        {timeInfo && (
          <Grid justify="center" align="center">
            <Grid.Col span={3}>
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
            <Grid.Col span={6}>
              <RangeSlider
                minRange={0}
                min={0}
                max={amountOfDays}
                value={sliderValue}
                label={(value) => {
                  return dayjs(timeInfo.start_time)
                    .add(value, "day")
                    .format("YYYY-MM-DD");
                }}
                onChange={([startDiff, endDiff]) => {
                  onChange({
                    ...value,
                    start_time: dayjs(timeInfo.start_time)
                      .add(startDiff, "days")
                      .toISOString(),
                    end_time: dayjs(timeInfo.start_time)
                      .add(endDiff, "days")
                      .toISOString(),
                  });
                }}
              />
            </Grid.Col>
            <Grid.Col span={3}>
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
  },
);

export default TimeFrameFilter;
