import {
  Accordion,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  Group,
  Select,
} from "@mantine/core";
import { FormProvider, useForm } from "react-hook-form";

import { useEffect, useState } from "react";
import {
  ConfigByType,
  FilterType,
  Filter,
  FilterConfig,
} from "@/types/filters";
import { Check, Plus, RefreshCw, Trash2Icon, X } from "lucide-react";
import { OcelInputType } from "@/types/ocel";
import {
  EventTypeFilterInput,
  ObjectTypeFilterInput,
} from "./FilterComponents/EntityTypeFilter";
import TimeFrameFilter from "./FilterComponents/TimeFrameFilter";
import {
  E2OCountFilter,
  O2OCountFilter,
} from "./FilterComponents/RelationFilter";
import {
  EventAttributeFilter,
  ObjectAttributeFilter,
} from "./FilterComponents/AttributeFilter";

type FilterConfigDefinition<K extends FilterType> = {
  defaultValue: ConfigByType<K>;
  label: string;
  filterForm: (ocelParams: OcelInputType) => React.ReactNode;
};

export const filterTypes: { [K in FilterType]: FilterConfigDefinition<K> } = {
  e2o_count: {
    defaultValue: {
      type: "e2o_count",
      source: "",
      range: [null, null],
      target: "",
    },
    label: "E2O Count Filter",
    filterForm: (ocelParams) => <E2OCountFilter ocelParams={ocelParams} />,
  },
  o2o_count: {
    defaultValue: {
      type: "o2o_count",
      source: "",
      range: [null, null],
      target: "",
    },
    filterForm: (ocelParams) => <O2OCountFilter ocelParams={ocelParams} />,
    label: "O2O Count Filter",
  },
  event_type: {
    defaultValue: { type: "event_type", event_types: [] },
    label: "Event Type Filter",
    filterForm: (ocelParams) => (
      <EventTypeFilterInput ocelParams={ocelParams} />
    ),
  },
  object_type: {
    defaultValue: { type: "object_type", object_types: [] },
    label: "Object Type Filter",
    filterForm: (ocelParams) => (
      <ObjectTypeFilterInput ocelParams={ocelParams} />
    ),
  },
  time_frame: {
    defaultValue: { type: "time_frame", time_range: [null, null] },
    label: "Time Frame Filter",
    filterForm: (ocelParams) => <TimeFrameFilter ocelParams={ocelParams} />,
  },
  event_attribute: {
    defaultValue: { type: "event_attribute", attribute: "", target_type: "" },
    label: "Event Attribute Filter",
    filterForm: (ocelParams) => (
      <EventAttributeFilter ocelParams={ocelParams} />
    ),
  },
  object_attribute: {
    defaultValue: { type: "object_attribute", attribute: "", target_type: "" },
    label: "Object Attribute Filter",
    filterForm: (ocelParams) => (
      <ObjectAttributeFilter ocelParams={ocelParams} />
    ),
  },
} as const;

const multiFormKeys = [
  "e2o_count",
  "o2o_count",
  "event_attribute",
  "object_attribute",
] as const;

type MultiFormKeys = (typeof multiFormKeys)[number];

const isMultiFormKey = (key: FilterType): key is MultiFormKeys =>
  multiFormKeys.includes(key as MultiFormKeys);

type SingleFormKeys = Exclude<FilterType, MultiFormKeys>;

export type FilterFormType = {
  [K in MultiFormKeys]?: ConfigByType<K>[];
} & {
  [K in SingleFormKeys]?: ConfigByType<K>;
};

const parsePipelineIntoFilterForm = ({ pipeline }: Filter) => {
  return pipeline.reduce(
    (filter, currentPipelineItem) => {
      const filterType = currentPipelineItem.type as FilterType;
      if (isMultiFormKey(filterType)) {
        if (!filter[filterType]) {
          filter[filterType] = [];
        }
        (filter[filterType] as Array<ConfigByType<FilterType>>).push(
          currentPipelineItem,
        );
      } else {
        filter[filterType] = currentPipelineItem;
      }
      return filter;
    },
    {} as Record<
      FilterType,
      Array<ConfigByType<FilterType>> | ConfigByType<FilterType>
    >,
  ) as FilterFormType;
};

const FilterPipelineForm: React.FC<
  {
    filter: Filter;
    submit: (filter: Filter) => void;
  } & Pick<OcelInputType, "ocel_id">
> = ({ filter, submit, ocel_id }) => {
  const [selectedFields, setSelectedFields] = useState<Set<FilterType>>(
    new Set(
      Object.keys(parsePipelineIntoFilterForm(filter)) as Array<FilterType>,
    ),
  );

  const [nextFilterType, setNextFilterType] = useState<FilterType | undefined>(
    "event_type",
  );

  const methods = useForm<FilterFormType>({
    defaultValues: parsePipelineIntoFilterForm(filter),
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
    subscribe,
    setValue,
  } = methods;

  useEffect(() => {
    return subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        const usedFilters = new Set(
          Object.entries(values)
            .filter(([key, value]) => !!value)
            .map(([key, _]) => key) as FilterType[],
        );
        if (usedFilters !== selectedFields) {
          setSelectedFields(usedFilters);
        }
        if (nextFilterType && usedFilters.has(nextFilterType)) {
          setNextFilterType(
            Object.keys(filterTypes).find(
              (filterType) => !usedFilters.has(filterType as FilterType),
            ) as FilterType | undefined,
          );
        }
      },
    });
  }, [subscribe]);

  return (
    // #TODO: Find ways to not use formProvider
    <FormProvider {...methods}>
      <Flex
        onSubmit={handleSubmit((data) => {
          const pipeline: FilterConfig[] = Object.entries(data).flatMap(
            ([_, filter]) => {
              if (!filter) return [];
              return Array.isArray(filter)
                ? (filter as FilterConfig[])
                : [filter];
            },
          );
          submit({ pipeline });
          reset(data);
        })}
        component={"form"}
        direction={"column"}
        h={"100%"}
        pb={"md"}
      >
        <Group pb={10} justify="space-between">
          <Group gap={0}>
            <Select
              value={nextFilterType}
              data={Object.entries(filterTypes)
                .filter(([filter]) => !selectedFields.has(filter as FilterType))
                .map(([filter, { label }]) => ({
                  value: filter,
                  label,
                }))}
              allowDeselect={false}
              onChange={(nextType) => {
                if (nextFilterType != null) {
                  setNextFilterType(nextType as FilterType);
                }
              }}
            />
            <Button
              color={"green"}
              onClick={() => {
                if (multiFormKeys.includes(nextFilterType as MultiFormKeys)) {
                  setValue(nextFilterType as MultiFormKeys, []);
                } else {
                  setValue(
                    nextFilterType as SingleFormKeys,
                    filterTypes[nextFilterType as SingleFormKeys].defaultValue,
                  );
                }
              }}
            >
              <Plus />
            </Button>
          </Group>
          <ButtonGroup>
            <Button color={"red"} onClick={() => reset()}>
              <X />
            </Button>
            <Button
              disabled={!isDirty}
              color={"yellow"}
              onClick={() =>
                reset(
                  Object.fromEntries(
                    Object.keys(filterTypes).map((filter) => [
                      filter,
                      undefined,
                    ]),
                  ),
                )
              }
            >
              <RefreshCw />
            </Button>
            <Button disabled={!isDirty} color={"green"} type="submit">
              <Check />
            </Button>
          </ButtonGroup>
        </Group>
        <Divider />
        <Accordion multiple m={"md"} variant="separated" chevronPosition="left">
          {Array.from(selectedFields).map((filter) => (
            <>
              <Accordion.Item
                key={filter}
                value={filter}
                bd={"1px solid black"}
              >
                <Accordion.Control>
                  <Group align="center" justify="space-between">
                    {filterTypes[filter].label}
                    <Button
                      variant="subtle"
                      color="red"
                      onClick={(event) => {
                        event.stopPropagation();
                        setValue(filter, undefined, { shouldDirty: true });
                      }}
                      p={5}
                    >
                      <Trash2Icon width={20} height={20} />
                    </Button>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  {filterTypes[filter].filterForm({
                    ocel_id,
                    ocel_version: "original",
                  })}
                </Accordion.Panel>
              </Accordion.Item>
            </>
          ))}
        </Accordion>
      </Flex>
    </FormProvider>
  );
};

export default FilterPipelineForm;
