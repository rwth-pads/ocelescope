import styled from "styled-components";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Select, {
  FormatOptionLabelMeta,
  Props as SelectProps,
} from "react-select";
import { buildSelectStyles, SelectStylesProps } from "@/components/util";
import _ from "lodash";
import { OCELAttribute, isDynamicObjectAttribute } from "@/src/ocel.types";
import { AttributeDefinition, useAttributeUnit } from "@/src/app-state.types";
import { combineClassNames } from "@/src/util";
import { AttributeName, getAttributeNameAndIcon } from "../../misc";

type AttributeItem<T extends OCELAttribute> = {
  value: string;
  attribute: T;
  label: string;
};

const availabilityNumberFormat = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumSignificantDigits: 1,
});

const createItem = <T extends OCELAttribute>(
  attr: T,
  attributeUnits: AttributeDefinition[],
  showAvailabilityForActivity?: string,
): AttributeItem<T> => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const unit = useAttributeUnit(attr);
  const availability =
    isDynamicObjectAttribute(attr) && showAvailabilityForActivity
      ? _.get(attr.availability, showAvailabilityForActivity)
      : undefined;
  return {
    label:
      `${attr.name}` +
      (unit ? ` [${unit.symbol}]` : "") +
      (availability !== undefined
        ? ` (available ${availabilityNumberFormat.format(availability)})`
        : ""),
    attribute: attr,
    value: attr.name,
  };
};

type AttributeSelectionProps<T extends OCELAttribute> = Omit<
  SelectProps,
  | "id"
  | "inputId"
  | "classNamePrefix"
  | "selected"
  | "options"
  | "onChange"
  | "defaultValue"
  | "styles"
> & {
  id?: string;
  attributes: T[];
  attributeUnits: AttributeDefinition[];
  selected?: T;
  onChange?: (attr: T | undefined) => void;
  showAvailabilityForActivity?: string;
  styles?: SelectStylesProps;
};
const AttributeSelection = <T extends OCELAttribute>({
  id,
  className,
  attributes,
  attributeUnits,
  selected,
  onChange,
  showAvailabilityForActivity,
  styles,
  isClearable,
  placeholder,
  ...props
}: AttributeSelectionProps<T>) => {
  // const { attrTypeDescription, AttrTypeIcon } = useMemo(() => attributes.map(attr => getAttributeNameAndIcon(attr)), [ocel, attributes])

  return (
    <Select<AttributeItem<T>>
      // {...props}
      inputId={id}
      className={combineClassNames("basic-single", className)}
      classNamePrefix="select"
      onChange={(item) => {
        if (onChange) {
          onChange(item?.attribute);
        }
      }}
      formatOptionLabel={(
        item: AttributeItem<T>,
        {
          context,
          inputValue,
          selectValue,
        }: FormatOptionLabelMeta<AttributeItem<T>>,
      ) => <AttributeName attr={item.attribute} label={item.label} />}
      options={attributes.map((attr) =>
        createItem(attr, attributeUnits, showAvailabilityForActivity),
      )}
      defaultValue={
        selected
          ? createItem(selected, attributeUnits, showAvailabilityForActivity)
          : undefined
      }
      placeholder={placeholder ?? "Attribute"}
      isClearable={isClearable}
      styles={buildSelectStyles(styles)}
    />
  );
};

export default AttributeSelection;
