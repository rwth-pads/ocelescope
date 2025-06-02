import { useO2e } from "@/api/fastapi/info/info";
import { ConfigByType } from "../OcelFilter";
import { RangeSlider, Select, Stack } from "@mantine/core";
import { useMemo } from "react";

const E2OCountFilter: React.FC<{
  value: ConfigByType<"e2o_count">;
  onChange: (config: ConfigByType<"e2o_count">) => void;
}> = ({ value, onChange }) => {
  const { data: o2e = [] } = useO2e();

  const activities = useMemo(
    () =>
      Array.from(
        new Set(
          o2e
            .filter(
              ({ object_type }) =>
                !value.object_type || object_type === value.object_type,
            )
            .map(({ activity }) => activity),
        ),
      ),
    [value.object_type, o2e],
  );

  const objectTypes = useMemo(
    () =>
      Array.from(
        new Set(
          o2e
            .filter(
              ({ activity }) =>
                !value.object_type || activity === value.event_type,
            )
            .map(({ object_type }) => object_type),
        ),
      ),
    [value.event_type, o2e],
  );

  const currentE2ORelation = useMemo(() => {
    return value.object_type && value.event_type
      ? o2e.find(
          ({ activity, object_type }) =>
            activity === value.event_type && object_type === value.object_type,
        )
      : undefined;
  }, [value.object_type, value.event_type, o2e]);
  return (
    <Stack>
      <Select
        label="Object Type"
        value={value.object_type}
        data={objectTypes}
        onChange={(val) => onChange({ ...value, object_type: val || "" })}
      />
      <Select
        value={value.event_type}
        label="Event Type"
        data={activities}
        onChange={(val) => onChange({ ...value, event_type: val || "" })}
      />
      {currentE2ORelation && (
        <>
          <RangeSlider
            minRange={0}
            step={1}
            onChange={(a) => {
              onChange({
                ...value,
                min: a[0],
                max: a[1] === currentE2ORelation.max_count ? undefined : a[1],
              });
            }}
            value={[value.min, value.max ?? currentE2ORelation.max_count]}
            max={currentE2ORelation.max_count}
          />
        </>
      )}
    </Stack>
  );
};

export default E2OCountFilter;
