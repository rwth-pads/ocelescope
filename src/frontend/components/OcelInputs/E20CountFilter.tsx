import { useO2e } from "@/api/fastapi/info/info";
import { ConfigByType } from "../OcelFilter";
import { Select, Stack } from "@mantine/core";
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
    [value.object_type],
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
    [value.event_type],
  );
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
    </Stack>
  );
};

export default E2OCountFilter;
