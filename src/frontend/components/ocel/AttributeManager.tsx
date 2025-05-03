/* eslint-disable react-hooks/exhaustive-deps */
// pages/index.tsx
"use client";

import React, { CSSProperties, HTMLProps, useState } from "react";
import Button from "react-bootstrap/Button";
import Table, { TableProps } from "react-bootstrap/Table";

import "bootstrap/dist/css/bootstrap.min.css";
import _ from "lodash";
import { FaCloud, FaMinus, FaPlus } from "react-icons/fa6";

import {
  attributeDefinitionEquals,
  isCategoricalAttribute,
  isEventAttribute,
  isNumericAttribute,
  isNumericEventAttribute,
  isObjectAttribute,
  OCELAttribute,
  OCELCategoricalAttribute,
  OCELEventAttribute,
  OCELNumericAttribute,
  OCELObjectAttribute,
} from "@/src/ocel.types";
// import dotString from "@/public/ocpn";

import { QtyRange } from "@/components/Quantity";
import { UnitEditor, UnitSelectionProps } from "@/components/UnitSelection";
import { WithTooltip } from "@/components/common/misc";
import {
  ActivityWithIcon,
  AttributeName,
  ObjectTypeWithIcon,
  pluralize,
} from "@/components/misc";
import {
  AttributeDefinition,
  findOcelAttributeUnitDefinition,
  useAttributeUnitState,
} from "@/src/app-state.types";
import { isWeight, Unit } from "@/src/units.types";
import { combineClassNames } from "@/src/util";
import { Action, State, useOceanStore } from "@/src/zustand";
import { Badge } from "react-bootstrap";
import "react-loading-skeleton/dist/skeleton.css";
import styled from "styled-components";
import { Checkbox, CheckboxState, GroupCheckbox } from "../common/Checkbox";

export type AttributeManagerProps = (
  | {
      target: "both";
      attributes: OCELAttribute[];
    }
  | {
      target: "event";
      attributes: OCELEventAttribute[];
    }
  | {
      target: "object";
      attributes: OCELObjectAttribute[];
    }
) & {
  selectEmissionAttributes?: boolean;
  editingEmissionAttributes?: State["emissionAttributes"];
  setEditingEmissionAttributes?: Action["setEmissionAttributes"];
} & TableProps;

export type AttributeUnitState = ReturnType<typeof useAttributeUnitState>;

export type EmissionAttributeState = {
  attrDefinition?: AttributeDefinition;
  attrIsValid: boolean;
  isEmissionAttribute: boolean;
  checkboxState: CheckboxState;
};

export type AttributeState = AttributeUnitState & EmissionAttributeState;

/**
 * Returns if an attribute is a valid element of appState.emissionAttributes
 * @param attr
 * @param def
 * @returns True iff the attribute is numeric and has a weight unit
 */
const isValidEmissionAttribute = (
  attr: OCELAttribute,
  def: AttributeDefinition | undefined,
) => {
  // in general object attributes are supported
  return isNumericAttribute(attr) && !!def?.unit && isWeight(def.unit);
};

/**
 * Returns if an attribute is a valid input element of appState.emissionAttributes
 * Currently, only event attributes can be imported as emissions.
 * @param attr
 * @param def
 * @returns True iff attr is a numeric event attribute, and has a weight unit
 */
const isValidEventEmissionAttributeInput = (
  attr: OCELAttribute,
  def: AttributeDefinition | undefined,
) => {
  return isEventAttribute(attr) && isValidEmissionAttribute(attr, def);
};

const unitSelectionProps: Omit<UnitSelectionProps, "units"> = {
  unitTypeGroups: true,
  size: "sm",
  styles: {
    control: { minHeight: "30px" },
    valueContainer: {
      minWidth: "40px",
      fontSize: ".9em",
      paddingLeft: "4px",
      paddingRight: "4px",
    },
    dropdownIndicator: { padding: "4px" },
  },
};

export const AttributeManager = styled(
  ({
    target,
    attributes,
    selectEmissionAttributes = false,
    className,
    editingEmissionAttributes,
    setEditingEmissionAttributes,
    ...props
  }: AttributeManagerProps) => {
    const attributeUnits = useOceanStore.use.attributeUnits();

    const attrOrder = (attr: OCELAttribute) => [
      attr.name,
      isEventAttribute(attr) ? 0 : 1,
      isEventAttribute(attr) ? attr.activity : attr.objectType,
    ];
    attributes = _.sortBy(attributes, attrOrder);
    const attrNameGroups = _.groupBy(
      _.sortBy(attributes, (attr) => attr.name),
      (attr) => attr.name,
    );
    const [expandedAttrNameGroups, setExpandedAttrNameGroups] = useState<
      string[]
    >([]);

    const emissionAttributes = useOceanStore.use.emissionAttributes();
    const currentEmissionAttributes =
      editingEmissionAttributes ?? emissionAttributes;

    // const _unitStates = attributes.map(attr => useAttributeUnitState(attr))
    const attributeStates = Object.fromEntries(
      Object.entries(attrNameGroups).map(([name, attrNameGroup]) => [
        name,
        attrNameGroup.map((attr) => {
          const attrDefinition = findOcelAttributeUnitDefinition(
            attr,
            attributeUnits,
          );
          const attrIsValid = isValidEventEmissionAttributeInput(
            attr,
            attrDefinition,
          );
          const isEmissionAttribute = currentEmissionAttributes.some(
            (emAttr) => {
              return attributeDefinitionEquals(attr, emAttr);
            },
          );

          const setIsEmissionAttribute =
            attrIsValid && attrDefinition && setEditingEmissionAttributes
              ? (b: boolean) => {
                  setEditingEmissionAttributes((emAttrs) => {
                    const others = emAttrs.filter(
                      (emAttr) => !attributeDefinitionEquals(attr, emAttr),
                    );
                    if (b) return [...others, attrDefinition];
                    return others;
                  });
                }
              : undefined;

          return {
            attrDefinition: attrDefinition,
            ...useAttributeUnitState(attr),

            attrIsValid: attrIsValid,
            isEmissionAttribute: isEmissionAttribute,
            // setIsEmissionAttribute: setIsEmissionAttribute,
            // isEmissionCheckboxShown: isNumericEventAttribute(attr),
            checkboxState: {
              visible: isNumericEventAttribute(attr),
              disabled: !attrIsValid,
              disabledTooltip: !attrIsValid
                ? "First assign a weight unit"
                : undefined,
              checked: isEmissionAttribute,
              setChecked: setIsEmissionAttribute,
            },
          } as AttributeState;
        }),
      ]),
    );

    const rowContents: {
      cells: JSX.Element;
      props: HTMLProps<HTMLTableRowElement>;
    }[] = [];

    Object.entries(attrNameGroups).forEach(([name, attrNameGroup], i) => {
      const isExpanded =
        expandedAttrNameGroups.includes(name) || attrNameGroup.length == 1;
      const toggleExpanded = () =>
        setExpandedAttrNameGroups((names) =>
          names.includes(name)
            ? names.filter((n) => n != name)
            : [...names, name],
        );

      if (attrNameGroup.length > 1) {
        rowContents.push({
          cells: (
            <AttributeNameGroupRow
              target={target}
              groupIndex={i}
              name={name}
              isExpanded={isExpanded}
              toggleExpanded={toggleExpanded}
              attrNameGroup={attrNameGroup}
              selectEmissionAttributes={selectEmissionAttributes}
              attributeStates={attributeStates[name]}
            />
          ),
          props: {},
        });
      }
      if (isExpanded) {
        attrNameGroup.forEach((attr, j) => {
          const isSubRow = attrNameGroup.length > 1;
          const attrState = attributeStates[name][j];

          rowContents.push({
            cells: (
              <AttributeRow
                attr={attr}
                attributeState={attrState}
                selectEmissionAttributes={selectEmissionAttributes}
              />
            ),
            props: {
              className: isSubRow ? "sub-row" : undefined,
              style: isSubRow
                ? {
                    borderLeft: "3px solid var(--bs-secondary)",
                    // borderRight: "3px solid var(--bs-secondary)"
                  }
                : undefined,
            },
          });
        });
      }
    });

    return (
      <div className="mb-3">
        <Table
          striped
          size="sm"
          className={combineClassNames("align-middle", className)}
          {...props}
        >
          <thead>
            <tr>
              <th className="expand-toggle-cell"></th>
              <th className="name-cell">Name</th>
              <th className="types-cell">
                {target == "event" && "Activity"}
                {target == "object" && "Object type"}
                {target == "both" && "Type"}
              </th>
              <th className="num-values-cell">Values</th>
              <th className="range-cell d-none d-md-table-cell">Range</th>
              <th className="unit-cell">Unit</th>
              {selectEmissionAttributes && (
                <th className="emissions-cell">
                  <FaCloud />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rowContents.map(({ cells, props }, k) => (
              <tr key={k} {...props}>
                {cells}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  },
)`
  tr {
    td, th {
      &.expand-toggle-cell {
        color: var(--bs-secondary);
        padding-left: 0;
        padding-right: 0;
        font-size: .875rem;
        .btn {
        }
      }
      &.range-cell {
        max-width: 35%;
      }
      &.units-cell {
        min-width: 80px;
      }
    }
    &.sub-row {
      td, th {
        padding-top: .1rem;
        padding-bottom: .1rem;
      }
    }
  }

`;

export default AttributeManager;

const AttributeRow: React.FC<{
  attr: OCELAttribute;
  attributeState: AttributeState;
  selectEmissionAttributes: boolean;
}> = ({ attr, attributeState, selectEmissionAttributes }) => {
  const { unit, setUnit, isEmissionAttribute, checkboxState } = attributeState;

  return (
    <>
      <td className="expand-toggle-cell"></td>
      <td className="name-cell ms-0">
        <AttributeName attr={attr} />
      </td>
      <td className="types-cell">
        {attr.target == "event" && (
          <ActivityWithIcon activity={attr.activity} />
        )}
        {attr.target == "object" && (
          <ObjectTypeWithIcon objectType={attr.objectType} />
        )}
      </td>
      <td className="num-values-cell">{attr.numValues}</td>
      <td className="range-cell d-none d-md-table-cell">
        {isNumericAttribute(attr) && (
          <NumericAttributeRange attr={attr} unit={unit} />
        )}
        {isCategoricalAttribute(attr) && (
          <CategoricalAttributeRange attr={attr} maxBadgeWidth="100px" />
        )}
      </td>
      <td className="unit-cell">
        {attr.numeric && setUnit && (
          <WithTooltip
            tooltip={
              isEmissionAttribute
                ? "Emissions units cannot be changed"
                : undefined
            }
          >
            <UnitEditor
              value={unit}
              disabled={isEmissionAttribute}
              onChange={(unit) => {
                console.log("change unit to", unit);
                setUnit(unit);
              }}
            />
          </WithTooltip>
        )}
        {!attr.numeric && <small className="text-secondary">not numeric</small>}
        {attr.numeric && !setUnit && (
          // This should not happen
          <small className="text-danger">Immutable unit</small>
        )}
      </td>
      {selectEmissionAttributes && (
        <td className="emissions-cell">
          <Checkbox {...checkboxState} />
        </td>
      )}
    </>
  );
};

const AttributeNameGroupRow: React.FC<{
  target: AttributeManagerProps["target"];
  name: string;
  groupIndex: number;
  isExpanded: boolean;
  toggleExpanded: () => void;
  attrNameGroup: OCELAttribute[];
  selectEmissionAttributes: boolean;
  attributeStates: AttributeState[];
}> = ({
  target,
  name,
  groupIndex,
  isExpanded,
  toggleExpanded,
  attrNameGroup,
  selectEmissionAttributes,
  attributeStates,
}) => {
  const numActivities = attrNameGroup.filter((attr) =>
    isEventAttribute(attr),
  ).length;
  const numObjectTypes = attrNameGroup.filter((attr) =>
    isObjectAttribute(attr),
  ).length;

  const uniqueUnits = _.uniqWith(
    attributeStates,
    ({ unit: u1 }, { unit: u2 }) => {
      // additional props like numberFormatName might get lost. Just compare { unit, dim }.
      if (!u1 || !u2) return !u1 && !u2;
      return u1.name == u2.name && _.isEqual(u1.dim, u2.dim);
    },
  ).map(({ unit }) => unit);
  const hasUniqueUnit = uniqueUnits.length == 1;
  const uniqueUnit = hasUniqueUnit ? uniqueUnits[0] : undefined;

  const uniqueTypes = _.uniq(attrNameGroup.map((attr) => attr.type));
  const hasUniqueType = uniqueTypes.length == 1;
  const allNumeric = attrNameGroup.every((attr) => attr.numeric);
  const allCategorical = attrNameGroup.every((attr) => !attr.numeric);
  const showMergedRange = hasUniqueType && hasUniqueUnit && allNumeric;

  const canEditAllUnits = attributeStates.every(({ setUnit }) => !!setUnit);

  const areSomeEmissionAttributes = _.some(
    attributeStates,
    "isEmissionAttribute",
  );

  return (
    <>
      <td className="expand-toggle-cell">
        <Button variant="link" size="sm" onClick={() => toggleExpanded()}>
          {isExpanded ? <FaMinus /> : <FaPlus />}
        </Button>
      </td>
      <td className="name-cell ms-0">
        {attrNameGroup.length > 1 ? (
          <span onClick={() => toggleExpanded()} style={{ cursor: "pointer" }}>
            {name}
          </span>
        ) : (
          name
        )}
      </td>
      <td className="types-cell">
        <div className="d-flex flex-column">
          {(target == "event" || (target == "both" && numActivities != 0)) && (
            <span>{pluralize(numActivities, "activity", "activities")}</span>
          )}
          {(target == "object" ||
            (target == "both" && numObjectTypes != 0)) && (
            <span>
              {pluralize(numObjectTypes, "object type", "object types")}
            </span>
          )}
        </div>
      </td>
      <td className="num-values-cell">
        {_.sumBy(attrNameGroup, (attr) => attr.numValues)}
      </td>
      <td className="range-cell d-none d-md-table-cell">
        {showMergedRange && (
          <>
            {allNumeric && (
              <NumericAttributeRange
                attr={{
                  target: "event",
                  activity: "<dummy>",
                  numeric: true,
                  name: name,
                  numValues: _.sumBy(attrNameGroup, (attr) => attr.numValues),
                  min: Math.min(
                    ...(attrNameGroup as OCELNumericAttribute[]).map(
                      (attr) => attr.min,
                    ),
                  ),
                  max: Math.max(
                    ...(attrNameGroup as OCELNumericAttribute[]).map(
                      (attr) => attr.max,
                    ),
                  ),
                  mean: NaN,
                  median: NaN,
                  type: uniqueTypes[0],
                }}
                unit={uniqueUnit}
              />
            )}
            {/* {allCategorical && <AttributeRange attr={{
                // TODO currently not possible to compute this in frontend!
              }} />} */}
          </>
        )}
        {!showMergedRange && <span className="text-secondary">-</span>}
      </td>
      <td className="unit-cell">
        {canEditAllUnits && (
          <WithTooltip
            tooltip={
              areSomeEmissionAttributes
                ? "Emissions units cannot be changed"
                : undefined
            }
          >
            <UnitEditor
              value={hasUniqueUnit ? uniqueUnit : undefined}
              disabled={areSomeEmissionAttributes}
              onChange={(unit) => {
                console.log("change all units to", unit);
                attributeStates.forEach(({ setUnit }) => {
                  if (setUnit) setUnit(unit);
                  else throw Error(); // this should not happen
                });
              }}
            />
          </WithTooltip>
        )}
        {!canEditAllUnits && (
          <>
            {allCategorical && (
              <small className="text-secondary">not numeric</small>
            )}
            {!allCategorical && <span className="text-secondary">-</span>}
          </>
        )}
      </td>
      {selectEmissionAttributes && (
        <td className="emissions-cell">
          <GroupCheckbox
            states={attributeStates.map(({ checkboxState }) => checkboxState)}
          />
        </td>
      )}
    </>
  );
};

export const NumericAttributeRange: React.FC<{
  attr: OCELNumericAttribute;
  unit?: Unit | null;
}> = ({ attr, unit }) => {
  return (
    <>
      <QtyRange
        value1={attr.min}
        value2={attr.max}
        unit={unit ?? undefined}
        options={{ showZero: true }}
      />
      {/* {(attr.min != attr.max) && (<>
      <Qty value={attr.min} unit={unit ?? undefined} options={{ showZero: true }} />
      <span> - </span>
      <Qty value={attr.max} unit={unit ?? undefined} options={{ showZero: true }} />
    </>)}
    {(attr.min == attr.max) && (<>
      <Qty value={attr.min} unit={unit ?? undefined} options={{ showZero: true }} />
    </>)} */}
    </>
  );
};

export const CategoricalAttributeRange: React.FC<{
  attr: OCELCategoricalAttribute;
  maxBadgeWidth?: CSSProperties["width"];
}> = ({ attr, maxBadgeWidth }) => {
  // If there are many distinct values and non of them are frequent, don't even show the top 3 values, show just one.
  const numValuesShown = Math.min(
    attr.modeFrequency <= 5 && attr.numUnique >= 100 ? 1 : 3,
    attr.numUnique,
  );
  return (
    <div className="d-flex gap-1 flex-wrap">
      {/* {attr.numUnique} distinct values {attr.numUnique != 1 ? "s" : ""}:&nbsp; */}
      {_.sortBy(Object.entries(attr.frequentValues), ([x, count]) => -count)
        .map(([x, count]) => x)
        .slice(0, numValuesShown)
        .map((x, i) => {
          // const shortened = _.truncate(x, { length: 50 })
          return (
            <Badge
              bg="light"
              text="dark"
              key={i}
              style={
                maxBadgeWidth
                  ? {
                      maxWidth: maxBadgeWidth,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }
                  : undefined
              }
            >
              {x}
            </Badge>
          );
        })}
      {attr.numUnique > numValuesShown && (
        <Badge bg="secondary" text="light" className="">
          +{attr.numUnique - numValuesShown}
        </Badge>
      )}
    </div>
  );
};
