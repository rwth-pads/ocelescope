import {
  useEventAttributes,
  useObjectAttributes,
  useObjectCount,
} from "@/api/fastapi/ocels/ocels";
import {
  Control,
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  Button,
  Grid,
  NumberInput,
  Paper,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { memo, ReactNode, useMemo } from "react";
import { FilterType } from "@/types/filters";
import {
  EventAttributes200,
  EventAttributes200Item,
  ObjectAttributes200,
  ObjectAttributes200Item,
} from "@/api/fastapi-schemas";
import { DatePickerInput } from "@mantine/dates";
import { OcelInputType } from "@/types/ocel";
import { FilterFormType, filterTypes } from "..";
import { XIcon } from "lucide-react";

type AttributeFilterProps = {
  control: Control<FilterFormType>;
  attributes: EventAttributes200 | ObjectAttributes200;
  index: number;
  attributeField: Extract<FilterType, "event_attribute" | "object_attribute">;
};

type AttributeTypes = (
  | ObjectAttributes200Item
  | EventAttributes200Item
)["type"];
type Attribute = EventAttributes200Item | ObjectAttributes200Item;

type AttirbuteByType<K extends AttributeTypes> = Extract<
  AttributeTypes,
  { type: K }
>;

type AttributeTypeInput = (
  props: Omit<AttributeFilterProps, "attributes"> & {
    attribute: Attribute;
  },
) => ReactNode;

const attributeTypeToInput: {
  [K in AttributeTypes]: AttributeTypeInput;
} = {
  boolean: ({ index, control, attributeField }) => (
    <Grid.Col span={6}>{"Not Implemented"}</Grid.Col>
  ),
  date: ({ control, index, attribute, attributeField }) => {
    const { min, max } = attribute as AttirbuteByType<"date">;
    return (
      <Grid.Col span={6}>
        <Controller
          control={control}
          name={`${attributeField}.${index}.time_range`}
          render={({ field: { onChange, value } }) => (
            <DatePickerInput
              label={"Date Range"}
              value={[value?.[0] ?? min, value?.[1] as string]}
              onChange={([a, b]) => onChange([a ?? undefined, b ?? undefined])}
              type="range"
              minDate={min}
              maxDate={max}
            />
          )}
        />
      </Grid.Col>
    );
  },
  float: ({ attribute, index, control, attributeField }) => {
    const { min, max } = attribute as AttirbuteByType<"float">;
    return (
      <Controller
        control={control}
        name={`${attributeField}.${index}.number_range`}
        render={({ field: { onChange, value } }) => (
          <>
            <Grid.Col span={3}>
              <NumberInput
                label={"min"}
                min={min}
                max={value?.[1] ? parseFloat(`${value[1]}`) : max}
                value={value?.[0] ?? min}
                onChange={(newMin) => onChange([newMin, value?.[1] ?? null])}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <NumberInput
                label={"max"}
                min={value?.[0] ? parseFloat(`${value[0]}`) : min}
                max={max}
                value={value?.[1] ?? max}
                onChange={(newMax) => onChange([value?.[0] ?? null, newMax])}
              />
            </Grid.Col>
          </>
        )}
      />
    );
  },
  integer: ({ attribute, control, index, attributeField }) => {
    const { min, max } = attribute as AttirbuteByType<"integer">;
    return (
      <Controller
        control={control}
        name={`${attributeField}.${index}.number_range`}
        render={({ field: { onChange, value } }) => (
          <>
            <Grid.Col span={3}>
              <NumberInput
                label={"min"}
                min={min}
                max={value?.[1] ? parseInt(`${value[1]}`) : max}
                value={value?.[0] ?? min}
                onChange={(newMin) => onChange([newMin, value?.[1] ?? null])}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <NumberInput
                label={"max"}
                min={value?.[0] ? parseInt(`${value[0]}`) : min}
                max={max}
                value={value?.[1] ?? max}
                onChange={(newMax) => onChange([value?.[0] ?? null, newMax])}
              />
            </Grid.Col>
          </>
        )}
      />
    );
  },
  nominal: ({ index, control, attributeField }) => (
    <Controller
      control={control}
      name={`${attributeField}.${index}.regex`}
      render={({ field }) => (
        <Grid.Col span={6}>
          <TextInput
            label={"Regex"}
            value={field.value ?? undefined}
            onChange={field.onChange}
          />
        </Grid.Col>
      )}
    />
  ),
};

const AttributeFilter: React.FC<AttributeFilterProps> = ({
  attributes,
  control,
  index,
  attributeField,
}) => {
  const value = useWatch({ control, name: `${attributeField}.${index}` });

  const { attributeNames, targetNames, currentAttribute } = useMemo(() => {
    const filteredAttributes = Object.entries(attributes ?? {})
      .filter(
        ([entityName, _]) =>
          !value.target_type ||
          value.target_type === "" ||
          !value.target_type ||
          entityName === value.target_type,
      )
      .flatMap(([_, attributes]) =>
        attributes.filter(
          ({ attribute }) =>
            !value.attribute ||
            value.attribute === "" ||
            attribute === value.attribute,
        ),
      );

    const attributeNames = Array.from(
      new Set(filteredAttributes.map(({ attribute }) => attribute)),
    );

    const targetNames = Object.entries(attributes)
      .filter(([_, attributes]) =>
        attributes.some(({ attribute }) => attributeNames.includes(attribute)),
      )
      .map(([targetName, _]) => targetName);

    const currentAttribute = attributes[value.target_type]?.find(
      ({ attribute }) => attribute === value.attribute,
    );

    return { attributeNames, targetNames, currentAttribute };
  }, [value, attributes]);

  return (
    <Grid>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`${attributeField}.${index}.target_type`}
          render={({ field }) => (
            <Select
              data={targetNames}
              label={"Type"}
              onChange={field.onChange}
              value={field.value}
            />
          )}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`${attributeField}.${index}.attribute`}
          render={({ field }) => (
            <Select
              label={"Attribute Name"}
              data={attributeNames}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </Grid.Col>
      {currentAttribute &&
        attributeTypeToInput[currentAttribute.type]({
          attribute: currentAttribute,
          attributeField: value.type,
          control,
          index,
        })}
    </Grid>
  );
};

export const EventAttributeFilter: React.FC<{ ocelParams: OcelInputType }> =
  memo(({ ocelParams }) => {
    const { data: attributes = {} } = useEventAttributes({ ...ocelParams });

    const { control } = useFormContext<FilterFormType>();

    const { fields, append, remove } = useFieldArray({
      name: "event_attribute",
      control,
    });

    return (
      <Stack>
        {fields.map((field, index) => (
          <Paper shadow="xs" p="md" key={field.id}>
            <Grid gutter={0}>
              <Grid.Col
                style={{ display: "flex", justifyContent: "end" }}
                offset={11}
                span={1}
              >
                <Button
                  variant="subtle"
                  color="red"
                  onClick={() => remove(index)}
                >
                  <XIcon color="red" />
                </Button>
              </Grid.Col>
              <Grid.Col span={12}>
                <AttributeFilter
                  key={field.id}
                  control={control}
                  attributes={attributes}
                  index={index}
                  attributeField="event_attribute"
                />
              </Grid.Col>
            </Grid>
          </Paper>
        ))}
        <Button
          onClick={() => append(filterTypes["event_attribute"].defaultValue)}
        >
          Add Filter
        </Button>
      </Stack>
    );
  });
export const ObjectAttributeFilter: React.FC<{ ocelParams: OcelInputType }> =
  memo(({ ocelParams }) => {
    const { data: attributes = {} } = useObjectAttributes({ ...ocelParams });

    const { control } = useFormContext<FilterFormType>();

    const { fields, append, remove } = useFieldArray({
      name: "object_attribute",
      control,
    });

    return (
      <Stack>
        {fields.map((field, index) => (
          <Paper shadow="xs" p="md" key={field.id}>
            <Grid gutter={0}>
              <Grid.Col
                style={{ display: "flex", justifyContent: "end" }}
                offset={11}
                span={1}
              >
                <Button
                  variant="subtle"
                  color="red"
                  onClick={() => remove(index)}
                >
                  <XIcon color="red" />
                </Button>
              </Grid.Col>
              <Grid.Col span={12}>
                <AttributeFilter
                  key={field.id}
                  control={control}
                  attributes={attributes}
                  index={index}
                  attributeField="object_attribute"
                />
              </Grid.Col>
            </Grid>
          </Paper>
        ))}
        <Button
          onClick={() => append(filterTypes["object_attribute"].defaultValue)}
        >
          Add Filter
        </Button>
      </Stack>
    );
  });
