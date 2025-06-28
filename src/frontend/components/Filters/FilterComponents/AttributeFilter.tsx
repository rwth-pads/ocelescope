import {
  useEventAttributes,
  useObjectAttributes,
} from "@/api/fastapi/info/info";
import { TypeFormProps } from "..";
import { Controller } from "react-hook-form";
import { Grid, Select } from "@mantine/core";
import { useMemo } from "react";
import { ConfigByType } from "../types";
import { EventAttributes200, ObjectAttributes200 } from "@/api/fastapi-schemas";

const AttributeFilter: React.FC<{
  value: ConfigByType<"event_attribute"> | ConfigByType<"object_attribute">;
  onChange: (
    value: ConfigByType<"event_attribute"> | ConfigByType<"object_attribute">,
  ) => void;
  attributes: EventAttributes200 | ObjectAttributes200;
}> = ({ value, onChange, attributes }) => {
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

    const currentAttribute = attributes[value.target_type].find(
      ({ attribute }) => attribute === value.attribute,
    );

    return { attributeNames, targetNames, currentAttribute };
  }, [value, attributes]);

  return (
    <Grid>
      <Grid.Col span={3}>
        <Select
          data={targetNames}
          onChange={(newTarget) =>
            onChange({ ...value, target_type: newTarget ?? "" })
          }
          value={value.target_type}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Select
          data={attributeNames}
          value={value.attribute}
          onChange={(newAttribute) =>
            onChange({ ...value, attribute: newAttribute ?? "" })
          }
        />
      </Grid.Col>
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
