import {
  Button,
  ButtonGroup,
  Divider,
  Flex,
  Group,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Title,
} from "@mantine/core";
import {
  Control,
  FieldArrayWithId,
  useFieldArray,
  useForm,
} from "react-hook-form";
import {
  EventTypeFilterInput,
  ObjectTypeFilterInput,
} from "./FilterComponents/EntityTypeFilter";
import { useMemo, useState } from "react";
import { ConfigByType, FilterConfig, FilterType } from "./types";
import { Check, Plus, RefreshCw, X } from "lucide-react";
import TimeFrameFilter from "./FilterComponents/TimeFrameFilter";
import {
  E2OCountFilterInput,
  O2OCountFilterInput,
} from "./FilterComponents/RelationFilter";
import { FilterPipeLine } from "@/api/fastapi-schemas";
import { OcelInputType } from "@/types/ocel";

export type FilterFormValues = {
  pipeline: FilterConfig[];
};

export type TypeFormProps = {
  control: Control<FilterFormValues>;
  index: number;
} & OcelInputType;

type FilterConfigDefinition<K extends FilterType> = {
  defaultValue: ConfigByType<K>;
  typeForm: (props: TypeFormProps) => React.ReactNode;
};

const filterTypes: { [K in FilterType]: FilterConfigDefinition<K> } = {
  e2o_count: {
    defaultValue: {
      type: "e2o_count",
      source: "",
      range: [null, null],
      target: "",
    },
    typeForm: (props) => (
      <E2OCountFilterInput ocel_version={"original"} {...props} />
    ),
  },
  o2o_count: {
    defaultValue: {
      type: "o2o_count",
      source: "",
      range: [null, null],
      target: "",
    },
    typeForm: (props) => (
      <O2OCountFilterInput ocel_version={"original"} {...props} />
    ),
  },
  event_type: {
    defaultValue: { type: "event_type", event_types: [] },
    typeForm: (props) => (
      <EventTypeFilterInput ocel_version={"original"} {...props} />
    ),
  },
  object_type: {
    defaultValue: { type: "object_type", object_types: [] },
    typeForm: (props) => (
      <ObjectTypeFilterInput ocel_version={"original"} {...props} />
    ),
  },
  time_frame: {
    defaultValue: { type: "time_frame", time_range: [null, null] },
    typeForm: (props) => (
      <TimeFrameFilter ocel_version={"original"} {...props} />
    ),
  },
};

const getFilterDefinition = <T extends FilterType>(
  type: T,
): FilterConfigDefinition<T> => {
  return filterTypes[type] as FilterConfigDefinition<T>;
};

const FilterItem: React.FC<
  {
    index: number;
    control: Control<FilterFormValues>;
    field: FieldArrayWithId<FilterFormValues, "pipeline", "id">;
    remove: () => void;
  } & Pick<OcelInputType, "ocel_id">
> = ({ control, field, index, remove, ocel_id }) => {
  const a = useMemo(() => {
    return getFilterDefinition(field.type);
  }, [field.type, index]);
  return (
    <Paper
      component={Stack}
      mt="md"
      p="md"
      style={{ border: "1px solid #ccc", borderRadius: 4 }}
      shadow="md"
      w={800}
    >
      <Group justify="space-between">
        <Title size={"h4"}>{field.type}</Title>
        <Button variant="subtle" color="red" onClick={remove}>
          <X color="red" />
        </Button>
      </Group>
      <Divider />
      {a.typeForm({
        control,
        index,
        ocel_id,
      })}
    </Paper>
  );
};

const FilterPipelineForm: React.FC<
  {
    filter: FilterPipeLine;
    submit: (filter: FilterPipeLine) => void;
  } & Pick<OcelInputType, "ocel_id">
> = ({ filter, submit, ocel_id }) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
    setValue,
  } = useForm<FilterPipeLine>({
    defaultValues: filter,
  });

  const { fields, append, remove } = useFieldArray({
    name: "pipeline",
    control,
  });

  const [nextFilterType, setNextFilterType] =
    useState<FilterType>("event_type");

  return (
    <Flex
      direction={"column"}
      component={"form"}
      h={"100%"}
      onSubmit={handleSubmit((data) => {
        submit(data);
        reset(data);
      })}
      pb={"md"}
    >
      <Group pb={10} justify="space-between">
        <Group gap={0}>
          <Select
            value={nextFilterType}
            data={Object.keys(filterTypes)}
            allowDeselect={false}
            onChange={(nextType) => {
              if (nextFilterType != null) {
                setNextFilterType(nextType as FilterType);
              }
            }}
          />
          <Button
            color={"green"}
            onClick={() => append(filterTypes[nextFilterType].defaultValue)}
          >
            <Plus />
          </Button>
        </Group>

        <ButtonGroup>
          <Button
            color={"red"}
            onClick={() => setValue("pipeline", [], { shouldDirty: true })}
          >
            <X />
          </Button>
          <Button disabled={!isDirty} color={"yellow"} onClick={() => reset()}>
            <RefreshCw />
          </Button>
          <Button disabled={!isDirty} color={"green"} type="submit">
            <Check />
          </Button>
        </ButtonGroup>
      </Group>
      <Divider />

      <ScrollArea flex={1} h={"100%"} px={10}>
        <Stack w={"100%"} justify="center" align="center">
          {fields.map((field, index) => (
            <FilterItem
              key={field.id}
              field={field}
              control={control}
              index={index}
              ocel_id={ocel_id}
              remove={() => {
                remove(index);
              }}
            />
          ))}
        </Stack>
      </ScrollArea>
    </Flex>
  );
};

export default FilterPipelineForm;
