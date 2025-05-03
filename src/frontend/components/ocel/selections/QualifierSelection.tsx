import styled from "styled-components";
import { CSSProperties, useEffect, useRef, useState } from "react";
import Select, { FormatOptionLabelMeta, PropsValue } from "react-select";
import { buildSelectStyles, SelectStylesProps } from "@/components/util";
import _ from "lodash";
import { ActivityWithIcon } from "../../misc";

type QualifierItem = {
  value: string | null;
  label: string;
};
type X = PropsValue<QualifierItem>;

const QualifierSelection: React.FC<{
  id?: string;
  qualifiers: string[];
  selected?: string | null;
  onChange?: (qualifier: string | null) => void;
  selectWhenUnique?: boolean;
  disableWhenUnique?: boolean;
  addUndefinedOption?: boolean;
  placeholder?: string;
  disabled?: boolean;
  styles?: SelectStylesProps;
}> = ({
  id,
  qualifiers,
  selected = null,
  onChange,
  selectWhenUnique = false,
  disableWhenUnique = true,
  addUndefinedOption = true,
  placeholder = "Qualifier",
  disabled,
  styles,
}) => {
  const item = (qualifier: string | null): QualifierItem => ({
    value: qualifier,
    label: qualifier ?? "(any)",
  });
  const items = [
    ...(addUndefinedOption ? [item(null)] : []),
    ...qualifiers.map(item),
  ];

  if (qualifiers.length == 1 && selectWhenUnique) {
    selected = qualifiers[0];
  }

  // const [selectedValue, setSelectedValue] = useState<string | null>(selected ?? null)
  // useEffect(() => {
  //   if (onChange) {
  //     onChange(selectedValue ?? null)
  //   }
  // }, [selectedValue])

  return (
    <Select<QualifierItem>
      inputId={id}
      className="basic-single"
      classNamePrefix="select"
      // defaultValue={selected ? item(selected) : undefined}
      value={selected ? items.find((it) => it.value === selected) : undefined}
      onChange={(item) => {
        if (onChange) {
          onChange(item?.value ?? null);
        }
        // setSelectedValue(item?.value ?? null)
      }}
      options={items}
      // formatOptionLabel={(item: QualifierItem, { context, inputValue, selectValue }: FormatOptionLabelMeta<QualifierItem>) => (
      //   {item.label}
      // )}
      isDisabled={
        disabled || (disableWhenUnique ? qualifiers.length == 1 : false)
      }
      isClearable={false}
      placeholder={placeholder}
      styles={buildSelectStyles(styles)}
    />
  );
};

export default QualifierSelection;
