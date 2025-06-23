import { useO2e } from "@/api/fastapi/info/info";
import { ConfigByType } from "../types";
import { Box, Grid, LoadingOverlay, RangeSlider, Select } from "@mantine/core";
import { memo, useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { OcelInputType } from "@/types/ocel";
import { E2OCountFilterConfigMode } from "@/api/fastapi-schemas";

type RelationFilterProps = {
  value: ConfigByType<"e2o_count">;
  onChange: (newValue: ConfigByType<"e2o_count">) => void;
} & OcelInputType;
const RelationFilter: React.FC<RelationFilterProps> = memo(
  ({ value, onChange, ...ocelParams }) => {
    const { data: e2o, isLoading } = useO2e({ ...ocelParams });

    const relevantRelations = useMemo(() => {
      return e2o?.filter(({ max_count, min_count }) => min_count < max_count);
    }, [e2o]);

    const { objectTypeNames, activitNames, min, max } = useMemo(() => {
      if (!e2o) {
        return {
          activitNames: [],
          objectTypeNames: [],
          filteredRelations: [],
          min: 0,
          max: 0,
        };
      }
      const filteredRelations = e2o.filter(
        ({ max_count, min_count, activity, object_type }) =>
          min_count < max_count &&
          (value.event_type === "" || value.event_type === activity) &&
          (value.object_type === "" || value.object_type === object_type),
      );

      const activitNames = Array.from(
        new Set(filteredRelations.map(({ activity }) => activity)),
      );

      const objectTypeNames = Array.from(
        new Set(filteredRelations.map(({ object_type }) => object_type)),
      );

      const min = Math.min(
        ...filteredRelations.map(({ min_count }) => min_count),
      );

      const max = Math.max(
        ...filteredRelations.map(({ max_count }) => max_count),
      );

      return { filteredRelations, activitNames, objectTypeNames, min, max };
    }, [e2o, value]);

    return (
      <Box w={"100%"} h={"100%"} pos={"relative"}>
        <LoadingOverlay visible={isLoading} />
        <Grid align="center" gutter={"md"}>
          <Grid.Col span={3} offset={9}>
            <Select
              data={[
                { value: "include", label: "Include" },
                { value: "exlude", label: "Exlude" },
              ]}
              allowDeselect={false}
              label={"Mode"}
              value={value.mode ?? "include"}
              onChange={(newMode) =>
                onChange({
                  ...value,
                  mode: (newMode as E2OCountFilterConfigMode) ?? undefined,
                })
              }
            ></Select>
          </Grid.Col>
          <Grid.Col span={4}>
            <Select
              label={"Activity Type"}
              value={value.event_type ?? undefined}
              data={activitNames}
              allowDeselect
              onChange={(newActivity) =>
                onChange({ ...value, event_type: newActivity ?? "" })
              }
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
            <Select
              label={"Object Type"}
              value={value.object_type ?? undefined}
              data={objectTypeNames}
              allowDeselect
              onChange={(newObjectType) =>
                onChange({ ...value, object_type: newObjectType ?? "" })
              }
            />
          </Grid.Col>
        </Grid>

        {value.event_type !== "" && value.object_type !== "" && (
          <RangeSlider
            py={"md"}
            minRange={0}
            value={[value.min ?? min, value.max ?? max]}
            max={max}
            min={min}
            onChange={(newRange) =>
              onChange({
                ...value,
                min: newRange[0],
                max: newRange[1],
              })
            }
          />
        )}
      </Box>
    );
  },
);

export default RelationFilter;
