import styled from "styled-components";
import { CSSProperties, useEffect, useRef, useState } from "react";
import Select, { FormatOptionLabelMeta } from "react-select";
import { buildSelectStyles, SelectStylesProps } from "@/components/util";
import _ from "lodash";
import { ObjectTypeColors } from "@/src/app-state.types";
import { ObjectTypeWithIcon, objectTypeColorProps } from "../../misc";
import { FaCircle } from "react-icons/fa6";

type ObjectTypeItem = {
  value: string | null;
  label: string;
  objectType: string | null;
};

export const ObjectTypeMultiSelect: React.FC<{}> = ({}) => {
  // TODO
  return false;
};

const ObjectTypeSelection: React.FC<{
  id?: string;
  objectTypes: string[];
  selected?: string | null;
  onChange?: (objectType: string | null) => void;
  addUndefinedOption?: boolean;
  isMulti?: boolean;
  styles?: SelectStylesProps;
}> = ({
  id,
  objectTypes,
  selected,
  onChange,
  addUndefinedOption = false,
  isMulti = false,
  styles,
}) => {
  const makeItem = (ot: string | null): ObjectTypeItem => ({
    value: ot,
    label: ot ?? "(any)",
    objectType: ot,
  });
  const items = [
    ...(addUndefinedOption ? [makeItem(null)] : []),
    ...objectTypes.map(makeItem),
  ];

  return (
    <Select<ObjectTypeItem>
      inputId={id}
      className="basic-single"
      classNamePrefix="select"
      value={selected ? items.find((it) => it.value === selected) : undefined}
      onChange={(option) => {
        if (onChange) {
          onChange(option?.objectType ?? null);
        }
      }}
      options={items}
      formatOptionLabel={(
        option: ObjectTypeItem,
        {
          context,
          inputValue,
          selectValue,
        }: FormatOptionLabelMeta<ObjectTypeItem>,
      ) =>
        option.objectType ? (
          <ObjectTypeWithIcon objectType={option.objectType} />
        ) : (
          <FaCircle className="text-secondary" />
        )
      }
      // defaultValue={selected ? makeItem(selected) : undefined}
      isClearable={false}
      placeholder="Object type"
      styles={buildSelectStyles(styles)}
    />
  );
};

export default ObjectTypeSelection;
