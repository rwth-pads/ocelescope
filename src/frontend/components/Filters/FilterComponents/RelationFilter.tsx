import { ConfigByType } from "../types";
import { Box, Grid, LoadingOverlay, RangeSlider, Select } from "@mantine/core";
import { memo, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { OcelInputType } from "@/types/ocel";
import { E2OCountFilterConfigMode } from "@/api/fastapi-schemas";
import { TypeFormProps } from "..";
import { useE2o } from "@/api/fastapi/info/info";
import { Controller, EventType, useWatch } from "react-hook-form";

const RelationFilter: React.FC<TypeFormProps> = memo(
  ({ control, index, ...ocelParams }) => {
    const field = useWatch({
      control: control,
      name: `pipeline.${index}`,
    }) as ConfigByType<"e2o_count">;

    const { data: e2o, isLoading } = useE2o({
      ...ocelParams,
      direction: field.direction === "source" ? "events" : "objects",
    });

    const { sourceNames, targetNames, min, max } = useMemo(() => {
      const fieldValue = field as
        | ConfigByType<"e2o_count">
        | ConfigByType<"o2o_count">;

      if (!e2o) {
        return {
          sourceNames: [],
          targetNames: [],
          min: 0,
          max: 0,
        };
      }
      const filteredRelations = e2o.filter(
        ({ max_count, min_count, source, target }) =>
          min_count < max_count &&
          (fieldValue.source === "" || fieldValue.source === source) &&
          (fieldValue.target === "" || fieldValue.target === target),
      );

      const sourceNames = Array.from(
        new Set(filteredRelations.map(({ source }) => source)),
      );

      const targetNames = Array.from(
        new Set(filteredRelations.map(({ target }) => target)),
      );

      const min = Math.min(
        ...filteredRelations.map(({ min_count }) => min_count),
      );

      const max = Math.max(
        ...filteredRelations.map(({ max_count }) => max_count),
      );

      return { filteredRelations, sourceNames, targetNames, min, max };
    }, [field, e2o]);

    return (
      <Box w={"100%"} h={"100%"} pos={"relative"}>
        <LoadingOverlay visible={isLoading} />
        <Grid align="center" gutter={"md"}>
          <Grid.Col span={3} offset={9}>
            <Controller
              control={control}
              name={`pipeline.${index}.mode`}
              render={({ field }) => (
                <Select
                  data={[
                    { value: "include", label: "Include" },
                    { value: "exlude", label: "Exlude" },
                  ]}
                  allowDeselect={false}
                  label={"Mode"}
                  value={field.value ?? "include"}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid.Col>

          <Grid.Col span={4}>
            <Controller
              control={control}
              name={`pipeline.${index}.source`}
              render={({ field }) => (
                <Select
                  data={sourceNames}
                  allowDeselect={false}
                  label={"Source"}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid.Col>
          <Grid.Col
            span={4}
            display={"flex"}
            style={{ justifyContent: "center" }}
          >
            <ArrowRight height={36} />
          </Grid.Col>
          <Grid.Col span={4}>
            <Controller
              control={control}
              name={`pipeline.${index}.target`}
              render={({ field }) => (
                <Select
                  data={targetNames}
                  allowDeselect={false}
                  label={"Target"}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          </Grid.Col>
        </Grid>

        {false && <RangeSlider py={"md"} minRange={0} max={max} min={min} />}
      </Box>
    );
  },
);

export default RelationFilter;
