import { useEventCounts, useTimeInfo } from "@/api/fastapi/info/info";
import { Box, Grid, LoadingOverlay, RangeSlider } from "@mantine/core";
import { memo, useMemo } from "react";
import { BarChart } from "@mantine/charts";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { EntityTimeInfo } from "@/api/fastapi-schemas";
import { TypeFormProps } from "..";
import { Controller, useWatch } from "react-hook-form";

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

const TimeFrameFilter: React.FC<TypeFormProps> = memo(
  ({ control, index, ...ocelParams }) => {
    const { data: timeInfo, isLoading } = useTimeInfo({
      ...ocelParams,
    });

    const { data: eventCount } = useEventCounts({ ...ocelParams });

    const value = useWatch({
      control,
      name: `pipeline.${index}.time_range`,
    });

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

      const startDiff = value[0]
        ? dayjs(value[0]).diff(dayjs(timeInfo.start_time), "day")
        : 0;

      const endDiff = value[1]
        ? dayjs(value[1]).diff(dayjs(timeInfo.start_time), "day")
        : amountOfDays;

      return [startDiff, endDiff];
    }, [value, timeInfo, amountOfDays]);

    return (
      <Box pos={"relative"} w={"100%"} h={"100%"}>
        <LoadingOverlay visible={isLoading} />
        {timeInfo && (
          <Grid justify="center" align="center">
            <Grid.Col span={3}>
              <Controller
                control={control}
                name={`pipeline.${index}.time_range.0`}
                render={({ field }) => (
                  <DateTimePicker
                    minDate={timeInfo.start_time}
                    maxDate={value[1] ?? timeInfo.end_time}
                    value={field.value ?? timeInfo.start_time}
                    onChange={(newStartDate) =>
                      field.onChange(dayjs(newStartDate).toISOString())
                    }
                  />
                )}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Controller
                control={control}
                name={`pipeline.${index}.time_range.0`}
                render={({ field: startField }) => (
                  <Controller
                    control={control}
                    name={`pipeline.${index}.time_range.1`}
                    render={({ field: endField }) => (
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
                          startField.onChange(
                            dayjs(timeInfo.start_time)
                              .add(startDiff, "days")
                              .toISOString(),
                          );
                          endField.onChange(
                            dayjs(timeInfo.start_time)
                              .add(endDiff, "days")
                              .toISOString(),
                          );
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Controller
                control={control}
                name={`pipeline.${index}.time_range.${1}`}
                render={({ field }) => {
                  return (
                    <DateTimePicker
                      minDate={value[0] ?? timeInfo.start_time}
                      maxDate={timeInfo.end_time}
                      value={field.value ?? timeInfo.end_time}
                      onChange={(newEndDate) =>
                        field.onChange(dayjs(newEndDate).toISOString())
                      }
                    />
                  );
                }}
              />
            </Grid.Col>
          </Grid>
        )}
      </Box>
    );
  },
);

export default TimeFrameFilter;
