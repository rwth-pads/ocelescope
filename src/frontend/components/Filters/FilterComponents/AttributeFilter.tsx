import {
  useEventAttributes,
  useObjectAttributes,
} from "@/api/fastapi/info/info";
import { TypeFormProps } from "..";
import { Controller } from "react-hook-form";
import {
  Grid,
  Group,
  NumberInput,
  RangeSlider,
  SegmentedControl,
  Select,
} from "@mantine/core";
import { ReactNode, useMemo } from "react";
import { ConfigByType } from "../types";
import {
  EventAttributes200,
  ObjectAttributes200,
  ObjectAttributes200Item,
} from "@/api/fastapi-schemas";
import { DatePickerInput } from "@mantine/dates";
import { parse } from "path/win32";

type AttributeFilterProps = {
  value: ConfigByType<"event_attribute"> | ConfigByType<"object_attribute">;
  onChange: (
    value: ConfigByType<"event_attribute"> | ConfigByType<"object_attribute">,
  ) => void;
  attributes: EventAttributes200 | ObjectAttributes200;
};

type AttributeTypeInput<K extends ObjectAttributes200Item["type"]> = (
  props: Omit<AttributeFilterProps, "attributes"> & {
    attribute: Extract<ObjectAttributes200Item, { type: K }>;
  },
) => ReactNode;

const attributeTypeToInput: {
  [K in ObjectAttributes200Item["type"]]: AttributeTypeInput<K>;
} = {
  boolean: ({ value }) => (
    <Grid.Col span={6}>
      <Group justify="end">
        {"Not Implemented"}
        <SegmentedControl
          data={[
            { label: "True", value: "true" },
            { label: "False", value: "false" },
          ]}
        />
      </Group>
    </Grid.Col>
  ),
  date: ({ attribute, value, onChange }) => (
    <Grid.Col span={6}>
      <DatePickerInput
        value={[value.min as string, value.max as string]}
        onChange={([a, b]) =>
          onChange({ ...value, min: a ?? undefined, max: b ?? undefined })
        }
        type="range"
        minDate={attribute.min}
        maxDate={attribute.max}
      />
    </Grid.Col>
  ),
  float: ({ attribute, value, onChange }) => (
    <>
      <Grid.Col span={3}>
        <NumberInput
          label={"min"}
          min={attribute.min}
          max={value.max ? parseFloat(`${value.max}`) : attribute.max}
          value={value.min ?? attribute.min}
          onChange={(newMin) => onChange({ ...value, min: newMin })}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <NumberInput
          label={"max"}
          value={value.max ?? attribute.max}
          min={value.min ? parseFloat(`${value.min}`) : attribute.min}
          max={attribute.max}
          onChange={(newMax) => onChange({ ...value, max: newMax })}
        />
      </Grid.Col>
    </>
  ),
  integer: ({ attribute, value, onChange }) => (
    <>
      <Grid.Col span={3}>
        <NumberInput
          label={"min"}
          min={attribute.min}
          max={value.max ? parseInt(`${value.max}`) : attribute.max}
          value={value.min ?? attribute.min}
          onChange={(newMin) => onChange({ ...value, min: newMin })}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <NumberInput
          label={"max"}
          value={value.max ?? attribute.max}
          min={value.min ? parseInt(`${value.min}`) : attribute.min}
          max={attribute.max}
          onChange={(newMax) => onChange({ ...value, max: newMax })}
        />
      </Grid.Col>
    </>
  ),
  nominal: ({ attribute }) => <>Not Implemented</>,
};

const AttributeFilter: React.FC<AttributeFilterProps> = ({
  value,
  onChange,
  attributes,
}) => {
  const { attributeNames, targetNames, currentAttribute } = useMemo(() => {
    const filteredAttributes = Object.entries(attributes ?? {})
      .filter(
        ([entityName, _]) =>
          value.target_type === "" || entityName === value.target_type,
      )
      .flatMap(([_, attributes]) =>
        attributes.filter(
          ({ attribute }) =>
            value.attribute === "" || attribute === value.attribute,
        ),
      );

    const attributeNames = Array.from(
      new Set(filteredAttributes.map(({ attribute }) => attribute)),
    );

    const targetNames = Object.entries(attributes ?? {})
      .filter(([_, attributes]) =>
        attributes.some(
          (attribute) =>
            value.attribute === "" || attribute.attribute === value.attribute,
        ),
      )
      .map(([entityName, _]) => entityName);

    const currentAttribute = attributes[value.target_type]?.find(
      ({ attribute }) => attribute === value.attribute,
    );

    return { attributeNames, targetNames, currentAttribute };
  }, [value, attributes]);

  return (
    <Grid>
      <Grid.Col span={3}>
        <Select
          data={targetNames}
          label={"Type"}
          onChange={(newTarget) =>
            onChange({
              ...value,
              target_type: newTarget ?? "",
              min: undefined,
              max: undefined,
              regex: undefined,
              values: undefined,
            })
          }
          value={value.target_type}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Select
          label={"Attribute Name"}
          data={attributeNames}
          value={value.attribute}
          onChange={(newAttribute) =>
            onChange({
              ...value,
              attribute: newAttribute ?? "",
              min: undefined,
              max: undefined,
              regex: undefined,
              values: undefined,
            })
          }
        />
      </Grid.Col>
      {currentAttribute &&
        attributeTypeToInput[currentAttribute.type]({
          attribute: currentAttribute,
          value,
          onChange,
        })}
    </Grid>
  );
};

export const EventAttributeFilter: React.FC<TypeFormProps> = ({
  control,
  index,
  ...ocelParams
}) => {
  const { data: attributes = {} } = useEventAttributes({ ...ocelParams });

  return (
    <Controller
      control={control}
      name={`pipeline.${index}`}
      render={({ field }) => (
        <AttributeFilter
          value={field.value as ConfigByType<"event_attribute">}
          onChange={field.onChange}
          attributes={attributes}
        />
      )}
    />
  );
};

export const ObjectAttributeFilter: React.FC<TypeFormProps> = ({
  control,
  index,
  ...ocelParams
}) => {
  const { data: attributes = {} } = useObjectAttributes({ ...ocelParams });
  console.log(attributes);

  return (
    <Controller
      control={control}
      name={`pipeline.${index}`}
      render={({ field }) => (
        <AttributeFilter
          value={field.value as ConfigByType<"event_attribute">}
          onChange={field.onChange}
          attributes={attributes}
        />
      )}
    />
  );
};
