import { Box, Grid, LoadingOverlay, RangeSlider, Select } from "@mantine/core";
import { memo, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { RelationCountSummary } from "@/api/fastapi-schemas";
import { TypeFormProps } from "..";
import { useE2o, useO2o } from "@/api/fastapi/info/info";
import { Controller, EventType, useWatch } from "react-hook-form";

const RelationFilter: React.FC<
  TypeFormProps & { relations?: RelationCountSummary[] }
> = memo(({ control, index, relations }) => {
  const watchedSource = useWatch({
    control: control,
    name: `pipeline.${index}.source`,
  });

  const watchedTarget = useWatch({
    control: control,
    name: `pipeline.${index}.target`,
  });

  const { sourceNames, targetNames, min, max } = useMemo(() => {
    if (!relations) {
      return {
        sourceNames: [],
        targetNames: [],
        min: 0,
        max: 0,
      };
    }
    const filteredRelations = relations.filter(
      ({ max_count, min_count }) => min_count < max_count,
    );

    const sourceNames = Array.from(
      new Set(
        filteredRelations
          .filter(({ target }) => !watchedTarget || watchedTarget === target)
          .map(({ source }) => source),
      ),
    );

    const targetNames = Array.from(
      new Set(
        filteredRelations
          .filter(({ source }) => !watchedSource || watchedSource === source)
          .map(({ target }) => target),
      ),
    );

    const min = Math.min(
      ...filteredRelations
        .filter(
          ({ source, target }) =>
            source === watchedSource && target === watchedTarget,
        )
        .map(({ min_count }) => min_count),
    );

    const max = Math.max(
      ...filteredRelations
        .filter(
          ({ source, target }) =>
            source === watchedSource && target === watchedTarget,
        )
        .map(({ max_count }) => max_count),
    );

    return { filteredRelations, sourceNames, targetNames, min, max };
  }, [watchedSource, watchedTarget, relations]);

  return (
    <Box w={"100%"} h={"100%"} pos={"relative"}>
      <LoadingOverlay visible={!relations} />
      <Grid align="center" gutter={"md"}>
        <Grid.Col span={3} offset={6}>
          <Controller
            control={control}
            name={`pipeline.${index}.direction`}
            render={({ field }) => (
              <Select
                data={[
                  { value: "source", label: "Source" },
                  { value: "target", label: "Target" },
                ]}
                label={"Direction"}
                value={field.value ?? "source"}
                onChange={field.onChange}
              />
            )}
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <Controller
            control={control}
            name={`pipeline.${index}.mode`}
            render={({ field }) => (
              <Select
                data={[
                  { value: "include", label: "Include" },
                  { value: "exlude", label: "Exlude" },
                ]}
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
                label={"Source"}
                value={field.value ?? ""}
                onChange={(newValue) => field.onChange(newValue ?? "")}
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
                label={"Target"}
                value={field.value ?? ""}
                onChange={(newValue) => field.onChange(newValue ?? "")}
              />
            )}
          />
        </Grid.Col>
      </Grid>

      {watchedSource && watchedTarget && (
        <Controller
          control={control}
          name={`pipeline.${index}.range`}
          render={({ field }) => (
            <RangeSlider
              py={"md"}
              minRange={0}
              value={[field.value[0] ?? min, field.value[1] ?? max]}
              max={max}
              min={min}
              onChange={([min, max]) => {
                field.onChange([min, max]);
              }}
            />
          )}
        />
      )}
    </Box>
  );
});

export const E2OCountFilterInput: React.FC<TypeFormProps> = ({
  control,
  index,
  ...ocelParams
}) => {
  const direction = useWatch({
    control: control,
    name: `pipeline.${index}.direction`,
  });

  const { data: e2o } = useE2o({
    ...ocelParams,
    direction,
  });

  return (
    <RelationFilter
      index={index}
      control={control}
      relations={e2o}
      {...ocelParams}
    />
  );
};
export const O2OCountFilterInput: React.FC<TypeFormProps> = ({
  control,
  index,
  ...ocelParams
}) => {
  const direction = useWatch({
    control: control,
    name: `pipeline.${index}.direction`,
  });

  const { data: o2o } = useO2o({
    ...ocelParams,
    direction,
  });

  return (
    <RelationFilter
      index={index}
      control={control}
      relations={o2o}
      {...ocelParams}
    />
  );
};
export default RelationFilter;
