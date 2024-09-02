import ChunkedColumns, { ChunkedColumnsProps } from "@/components/common/ChunkedColumns";
import { combineClassNames } from "@/src/util";
import { useHandlingUnitsAndResources, useOceanStore } from "@/src/zustand";
import _ from "lodash";
import React, { Dispatch, useState } from "react";
import { Button, ButtonGroup, FormCheckProps, ToggleButton } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import styled from "styled-components";
import { ButtonToolbar, ObjectTypeWithIcon } from "./misc";


const ObjectTypeManager = styled(({ colProps, className, ...props }: ChunkedColumnsProps) => {
  const ocel = useOceanStore.use.ocel()
  const { objectTypeClasses, setObjectTypeClasses } = useOceanStore.useState.objectTypeClasses()
  const { handlingUnits, resources } = useOceanStore(useHandlingUnitsAndResources)

  const [editingHandlingUnits, setEditingHandlingUnits] = useState<string[]>(handlingUnits ?? ocel?.objectTypes ?? [])
  if (!ocel) return false

  const { className: colClassName, ...colRestProps } = colProps ?? {}

  const setHandlingUnit = (objectType: string, b: boolean) => {
    setEditingHandlingUnits(edhus => [
      ...edhus.filter(ot => ot != objectType),
      ...(b ? [objectType] : [])
    ])
    // setObjectTypeClasses(otcs => {
    //   if (!otcs) {
    //     otcs = Object.fromEntries(ocel.objectTypes.map(ot => [ot, "handling_unit"]))
    //   }
    //   return {
    //     ...otcs,
    //     [objectType]: b ? "handling_unit" : "resource"
    //   }
    // })
  }
  const saveHandlingUnits = () => {
    setObjectTypeClasses(Object.fromEntries(ocel.objectTypes.map(ot => [ot, editingHandlingUnits.includes(ot) ? "handling_unit" : "resource"])))
  }

  if (handlingUnits === undefined) return false
  if (resources === undefined) return false

  return (<>
    <Form>
      <ChunkedColumns
        className={combineClassNames(className)}
        colProps={{
          className: combineClassNames("d-flex flex-column gap-1 mb-1", colClassName),
          ...colRestProps
        }}
        {...props}
      >
        {_.orderBy(ocel.objectTypes, [
          ot => ocel.medianNumEventsPerObjectType[ot],
          ot => ocel.objectTypeCounts[ot],
          ot => ot,
        ], ["asc", "desc", "asc"]).map((ot, i) => {
          const isHandlingUnit = editingHandlingUnits.includes(ot)
          return (
            <div key={i} className="d-flex align-items-center gap-2 ot-manager-item">
              {/* <ColorIndicator $color={(objectTypeColors ?? {})[ot]?.hex() ?? null} $size={16} $circle /> */}
              <ButtonGroup>
                <ToggleButton
                  size="sm"
                  id={`radio-ot-${i}-resource`}
                  type="radio"
                  variant="light"
                  name={`radio-ot-${i}`}
                  value={"resource"}
                  checked={!isHandlingUnit}
                  onChange={e => setHandlingUnit(ot, e.target.value == "handling_unit")}
                >
                  Resource
                </ToggleButton>
                <ToggleButton
                  size="sm"
                  id={`radio-ot-${i}-handling_unit`}
                  type="radio"
                  variant="light"
                  name={`radio-ot-${i}`}
                  value={"handling_unit"}
                  checked={isHandlingUnit}
                  onChange={e => setHandlingUnit(ot, e.target.value == "handling_unit")}
                >
                  HU
                </ToggleButton>
              </ButtonGroup>
              {/* <LabeledToggleSwitch
                id={`huSwitch-${ocel.objectTypes.indexOf(ot)}`}
                offLabel="Resource"
                onLabel="HU"
                checked={handlingUnits.includes(ot)}
                setChecked={checked => setHandlingUnit(ot, checked)}
              /> */}
              <ObjectTypeWithIcon objectType={ot} objectTypeClass={isHandlingUnit ? "handling_unit" : "resource"} />
            </div>
          )
        })}
      </ChunkedColumns>
      <ButtonToolbar className="mt-2">
        <Button variant="primary" onClick={() => saveHandlingUnits()}>
          Save
        </Button>
        <Button variant="secondary" onClick={() => setEditingHandlingUnits(handlingUnits)}>
          Reset
        </Button>
      </ButtonToolbar>
    </Form>

  </>)

})`

  .ot-manager-item {
    .btn-group {
      .btn {
        padding: .1rem .25rem;
      }
    }
  }

`

export default ObjectTypeManager;

export const ColorIndicator = styled.span<{ $color: string, $size: number, $circle?: boolean }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background-color: ${({ $color }) => $color ?? "white"};
  border-radius: ${({ $size, $circle = false }) => $circle ? "50%" : "var(--bs-border-radius)"};
`

type LabeledToggleSwitchProps = {
  offLabel: string
  onLabel: string
  checked: boolean
  setChecked: Dispatch<boolean>
} & Omit<FormCheckProps, "checked">

const LabeledToggleSwitch = styled(({ offLabel, onLabel, checked, setChecked, className, ...props }: LabeledToggleSwitchProps) => {
  return (
    <div className={combineClassNames("d-flex gap-2 align-items-center me-2", checked ? "checked" : undefined, className)}>
      <span className="off-label" onClick={() => setChecked(false)}>{offLabel}</span>
      <Form.Check
        checked={checked}
        onChange={e => setChecked(e.target.checked)}
        type="switch"
        // style={{ margin: "0 .5rem" }}
        // inline={true}
        {...props}
      />
      <span className="on-label" onClick={() => setChecked(true)}>{onLabel}</span>
    </div>
  )
})`
  .form-switch {
    padding-left: 0;
    input {
      margin-left: 0;
    }
  }

  .off-label, .on-label {
    font-size: 75%;
  }
  .off-label {
    text-align: right;
  }
  .on-label {
    text-align: left;
    opacity: .25;
  }
  &.checked {
    .off-label {
      opacity: .25 !important;
    }
    .on-label {
      opacity: 1 !important;
    }
  }

`
