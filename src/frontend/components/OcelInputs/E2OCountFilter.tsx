import React, { useMemo } from "react";
import {
  Box,
  Select,
  NumberInput,
  Stack,
  RangeSlider,
  Group,
} from "@mantine/core";
import { useE2o } from "@/api/fastapi/info/info";
import { E2OCountFilterConfig } from "@/api/fastapi-schemas";

type Props = {
  value: E2OCountFilterConfig;
  onChange: (value: E2OCountFilterConfig) => void;
};

const E2OCountFilter: React.FC<Props> = ({ value, onChange }) => {
  const { data: e2o = [] } = useE2o();

  console.log(value);

  const availableObjectTypes = useMemo(
    () =>
      Array.from(
        new Set(
          e2o
            .filter(
              (item) => !value.event_type || item.activity === value.event_type,
            )
            .map((item) => item.object_type),
        ),
      ),
    [value.event_type],
  );
  const availableEventTypes = useMemo(
    () =>
      Array.from(
        new Set(
          e2o
            .filter(
              (item) =>
                !value.object_type || item.object_type === value.object_type,
            )
            .map((item) => item.activity),
        ),
      ),
    [value.object_type],
  );

  const handleSliderChange = ([min, max]: [number, number]) => {
    onChange({ ...value, min, max });
  };

  return (
    <Box>
      <Stack gap="sm">
        <Select
          label="Object Type"
          placeholder="Select object type"
          data={availableObjectTypes}
          value={value.object_type}
          onChange={(val) => onChange({ ...value, object_type: val })}
        />
        <Select
          label="Event Type"
          placeholder="Select event type"
          data={availableEventTypes}
          value={value.event_type}
          onChange={(val) => onChange({ ...value, event_type: val })}
        />
        <Select
          label="Target"
          data={[
            { value: "event", label: "Event" },
            { value: "object", label: "Object" },
          ]}
          value={value.target}
          onChange={(val) =>
            onChange({
              ...value,
              target: (val as "event" | "object") || "event",
            })
          }
        />
        {value.object_type && value.event_type && (
          <Group grow>
            <NumberInput
              label="Min"
              value={value.min}
              onChange={(val) => onChange({ ...value, min: val ?? 0 })}
              min={0}
            />
            <RangeSlider
              min={0}
              max={100}
              step={1}
              value={[value.min, value.max ?? value.min]}
              onChange={handleSliderChange}
              marks={[
                { value: 0, label: "0" },
                { value: 100, label: "100" },
              ]}
            />
            <NumberInput
              label="Max"
              value={value.max ?? undefined}
              onChange={(val) => onChange({ ...value, max: val ?? undefined })}
              min={0}
            />
          </Group>
        )}
      </Stack>
    </Box>
  );
};

export default E2OCountFilter;
