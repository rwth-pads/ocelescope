/* eslint-disable react-hooks/exhaustive-deps */

import { buildSelectStyles, SelectStylesProps } from "@/components/util";
// import { AbstractUnit } from "@/src/api/generated";
import { sortUnits } from "@/src/climatiq.types";
import { Api } from "@/src/openapi";
import { Unit, unitTypeData } from "@/src/units.types";
import _ from "lodash";
import React, { useEffect, useId, useMemo, useState } from "react";
import { Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { IconBaseProps } from "react-icons";
import { FaPencil, FaQuestion, FaXmark } from "react-icons/fa6";
import Select from "react-select";

export const UnitLabel: React.FC<{
  unit: Unit | null;
}> = ({ unit }) => {
  const id = useId();

  return (
    <OverlayTrigger
      overlay={
        <Tooltip id={`unit-type-tooltip-${id}`}>
          {unit?.name ?? "No unit"}
        </Tooltip>
      }
    >
      <div>
        {!!unit?.symbol && <span>{unit.symbol}</span>}
        {!unit?.symbol && <span className="text-secondary">---</span>}
      </div>
    </OverlayTrigger>
  );
};

export type UnitEditorProps = {
  name?: string;
  id?: string;
  // units: (AbstractUnit | null)[]
  value?: Unit | null;
  onChange: (x: Unit | null) => void;
  // unitTypeGroups?: boolean
  // size?: "sm" | "lg"
  disabled?: boolean;
  // styles?: SelectStylesProps
};

export const UnitEditor: React.FC<UnitEditorProps> = ({
  id,
  name,
  value,
  onChange,
  disabled = false,
  // units,
  // unitTypeGroups = true,
  // size = "lg",
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    setHasError(false);
  }, [isEditing]);
  // const [searchValue, setSearchValue] = useState("")

  const searchUnit = async (query: string) => {
    try {
      const unit = await Api.unitSearchUnitsSearchGet({ q: query });
      setIsEditing(false);
      onChange(unit);
    } catch (e) {
      console.log(`Unit '${query}' not found`);
      setHasError(true);
    }
  };

  return (
    <div className="d-flex align-items-center">
      {isEditing && (
        <>
          {/* <UnitLabel unit={value ?? null} /> */}
          {/* <AsyncSelect cacheOptions defaultOptions loadOptions={loadDummyOptions} /> */}
          <Form.Control
            name={name}
            id={id}
            // value={searchValue}
            // onChange={e => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const query = (e.target as HTMLInputElement).value;
                searchUnit(query);
              }
            }}
            autoFocus
            isInvalid={hasError}
          />
          <Button variant="link" size="sm" onClick={() => setIsEditing(false)}>
            <FaXmark className="text-danger" />
          </Button>
        </>
      )}
      {!isEditing && (
        <>
          <UnitLabel unit={value ?? null} />
          <Button
            variant="link"
            size="sm"
            disabled={disabled}
            onClick={() => setIsEditing(true)}
          >
            <FaPencil />
          </Button>
        </>
      )}
    </div>
  );
};

type UnitOption = {
  value: Unit | null;
  label: string;
  unit: Unit | null;
};
type UnitOptionGroup = {
  label: string;
  options: UnitOption[];
};

const createOption = (u: Unit | null): UnitOption => ({
  value: u,
  label: u?.symbol ?? "---",
  unit: u,
});

export type UnitSelectionProps = {
  name?: string;
  id?: string;
  units: (Unit | null)[];
  value?: Unit | null;
  disabled?: boolean;
  onChange?: (x: Unit | null) => void;
  // attr?: OCELAttribute
  unitTypeGroups?: boolean;
  size?: "sm" | "lg";
  styles?: SelectStylesProps;
};

export const UnitSelection: React.FC<UnitSelectionProps> = ({
  id,
  name,
  units,
  // attr,
  value,
  disabled = false,
  onChange,
  unitTypeGroups = false,
  size = "lg",
  styles,
}) => {
  if (unitTypeGroups) throw Error("Removed feature `unitTypeGroups`");

  units = _.sortBy(units, sortUnits);

  const { options, defaultOption } = useMemo(() => {
    const allOptions = units.map(createOption);
    // if (unitTypeGroups) {
    //   const unitTypes = _.uniq(units.map(u => u?.unitType))
    //   const groupedOptions = unitTypes.map(ut => {
    //     const uos = allOptions.filter(o => o.unit?.unitType === ut)
    //     const labels = [...uos.map(o => o.unit?.unitTypeLabel), ...uos.map(o => o.unit?.unitType)].filter(s => s)
    //     return {
    //       label: (labels[0] ?? ut) ?? "None",
    //       options: uos
    //     }
    //   })
    //   return {
    //     options: groupedOptions,
    //     defaultOption: createOption(value ?? null)
    //   }
    // } else {
    return {
      options: allOptions,
      defaultOption: createOption(value ?? null),
      // defaultOption: (value || units.includes(undefined)) ? createOption(value) : null
    };
    // }
  }, [units, value, unitTypeGroups]);

  const [selectedOption, setSelectedOption] =
    useState<UnitOption>(defaultOption);

  const { control, option, singleValue, menu, ...restStyles } = styles ?? {};

  return (
    <Select<UnitOption>
      id={id}
      name={name}
      className="basic-single"
      classNamePrefix="select"
      options={options}
      // defaultValue={defaultOption ?? null}
      value={selectedOption}
      isDisabled={disabled}
      onChange={(option) => {
        setSelectedOption(option ?? defaultOption);
        if (onChange) {
          onChange(option?.unit ?? null);
        }
      }}
      isClearable={false}
      placeholder="Unit"
      styles={buildSelectStyles({
        ...restStyles,
        control:
          size == "sm"
            ? {
                padding: "0",
                ...control,
              }
            : control,
        singleValue: {
          // minWidth: "40px",
          ...singleValue,
        },
        option: {
          padding: "0 12px",
          ...option,
        },
        menu: {
          width: "auto",
          minWidth: "100%",
          ...menu,
        },
      })}
    />
  );
};

export default UnitSelection;

export const UnitTypeIcon: React.FC<
  {
    climatiqName?: string;
    name?: string;
  } & IconBaseProps
> = ({ name, climatiqName, ...props }) => {
  const def = unitTypeData.find((ut) => {
    if (name && ut.name?.toLowerCase() == name.toLowerCase()) return true;
    if (
      climatiqName &&
      ut.climatiqName?.toLowerCase() == climatiqName.toLowerCase()
    )
      return true;
    return false;
  });

  if (!def) return <FaQuestion {...props} />;
  if (def.Icon) {
    return <def.Icon {...props} />;
  }
  if (def.icons) {
    return (
      <div className="d-flex align-items-center">
        {def.icons.map((Icon, i) => (
          <Icon key={i} {...props} />
        ))}
      </div>
    );
  }
};
