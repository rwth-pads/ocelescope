
import styled from "styled-components";
import { CSSProperties, useEffect, useRef, useState } from 'react';
import Select, { FormatOptionLabelMeta } from "react-select";
import { buildSelectStyles, SelectStylesProps } from "@/components/util";
import _ from "lodash";
import { ActivityWithIcon } from "../../misc";

type ActivityItem = {
  value: string
  label: string
}

const ActivitySelection: React.FC<{
  id?: string;
  activities: string[];
  selected?: string;
  onChange?: (activity: string) => void;
  selectWhenUnique?: boolean;
  disableWhenUnique?: boolean;
  placeholder?: string
  disabled?: boolean
  styles?: SelectStylesProps;
}> = ({ id, activities, selected, onChange, placeholder = "Activity", selectWhenUnique = false, disableWhenUnique = true, disabled, styles }) => {

  const item = (act: string): ActivityItem => ({ value: act, label: act })

  if (activities.length == 1) {
    if (selectWhenUnique) {
      if (onChange && selected != activities[0]) {
        onChange(activities[0])
        selected = activities[0]
      }
    }
    if (disableWhenUnique) {
      disabled = true
    }
  }

  return (
    <Select<ActivityItem>
      inputId={id}
      className="basic-single"
      classNamePrefix="select"
      onChange={item => {
        if (onChange && item) {
          onChange(item.value)
        }
      }}
      options={activities.map(item)}
      formatOptionLabel={(item: ActivityItem, { context, inputValue, selectValue }: FormatOptionLabelMeta<ActivityItem>) => (
        <ActivityWithIcon activity={item.value} />
      )}
      defaultValue={selected ? item(selected) : undefined}
      isDisabled={disabled}
      isClearable={false}
      placeholder={placeholder}
      styles={buildSelectStyles(styles)}
    />
  )

}

export default ActivitySelection;
