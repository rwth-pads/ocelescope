import { NumberStats } from "@/src/api/generated";
import _ from "lodash";
import { Key, useId } from "react";
import { Dropdown, DropdownProps, DropdownToggleProps } from "react-bootstrap";
import { ProgressBar, ProgressBarStyleProps } from "../ProgressBar";

export type KeysContainingNumbers<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];
export type AggModeKey = KeysContainingNumbers<NumberStats>;
export type AggMode = {
  key: AggModeKey;
  label?: string;
};

export const aggModes: { [K in AggModeKey]: AggMode & { key: K } } = {
  mean: { key: "mean", label: "average" },
  sum: { key: "sum", label: "sum" },
  min: { key: "min", label: "min" },
  median: { key: "median", label: "median" },
  max: { key: "max", label: "max" },
  nonzero: { key: "nonzero", label: "non-zero" },
  count: { key: "count", label: "count" },
};

export const AggModeSelector: React.FC<
  {
    label: JSX.Element;
    mode: AggMode;
    setMode: React.Dispatch<React.SetStateAction<AggMode>>;
    toggleProps?: DropdownToggleProps;
  } & Omit<DropdownProps, "children">
> = ({ label, mode, setMode, toggleProps, ...props }) => {
  const id = useId();
  const makeItem = (m: AggMode) => (
    <Dropdown.Item onClick={() => setMode(m)}>{m.label ?? m.key}</Dropdown.Item>
  );

  return (
    <Dropdown {...props}>
      <Dropdown.Toggle id={id} {...toggleProps}>
        {label}: {mode.label ?? mode.key}
      </Dropdown.Toggle>

      <Dropdown.Menu>
        {makeItem(aggModes.mean)}
        {makeItem(aggModes.sum)}
        <Dropdown.Divider />
        {makeItem(aggModes.min)}
        {makeItem(aggModes.median)}
        {makeItem(aggModes.max)}
        <Dropdown.Divider />
        {makeItem(aggModes.nonzero)}
        {makeItem(aggModes.count)}
      </Dropdown.Menu>
    </Dropdown>
  );
};

export const AggProgressBar: React.FC<
  ProgressBarStyleProps & {
    self: NumberStats;
    all: NumberStats[];
    aggMode: AggMode;
  }
> = ({ self, all, aggMode, unit, percent, ...props }) => {
  const now = self[aggMode.key];
  const allValues = _.map(all, aggMode.key);
  // const min = Math.min(...allValues)
  const min = Math.min(0, ...allValues);
  const max = Math.max(...allValues);
  console.log(`${now} -- [${min}, ${max}]`);
  if (aggMode.key == "nonzero") percent = true;
  else if (aggMode.key == "count") unit = undefined;

  return <ProgressBar {...{ now, min, max, unit, percent, ...props }} />;
};
