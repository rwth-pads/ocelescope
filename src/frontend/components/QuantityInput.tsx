/* eslint-disable react-hooks/exhaustive-deps */

import { HTMLProps, useMemo, useRef, useState } from 'react';
import UnitSelection from "@/components/UnitSelection";
import { SelectStylesProps } from "@/components/util";
import { Unit, Quantity } from "@/src/units.types";
import Form from "react-bootstrap/Form";
import { combineClassNames } from '@/src/util';

const QuantityInput: React.FC<{
  name?: string
  units: Unit[]
  value?: Quantity
  onChange?: (x: Quantity | undefined) => void
  styles?: SelectStylesProps
} & Omit<HTMLProps<HTMLDivElement>, "value" | "onChange" | "name">> = ({
  id,
  className,
  name,
  units,
  value,
  onChange,
  styles,
}) => {

  const [currentUnit, setCurrentUnit] = useState<Unit | undefined>(value?.unit ?? undefined)
  const [currentValue, setCurrentValue] = useState<number | undefined>(value?.value)
  const currentQty = useMemo(() => {
    if (currentValue === undefined) return undefined
    return {
      unit: currentUnit,
      value: currentValue
    }
  }, [currentUnit, currentValue])
  const qtyRef = useRef(currentQty)
  qtyRef.current = currentQty

  const [isNumberValid, setIsNumberValid] = useState(true)

  // useEffect(() => {
  //   if (onChange) {
  //     onChange(currentQty)
  //   }
  // }, [currentQty])

  const callOnChange = () => {
    if (onChange) onChange(qtyRef.current)
  }

  return (
    <div className={combineClassNames("d-flex gap-2", className)}>
      <Form.Control
        id={id}
        name={name}
        defaultValue={value?.value}
        // value={currentValue}
        // onChange={e => {
        // }}
        onBlur={e => {
          const f = Number.parseFloat(e.target.value)
          setIsNumberValid(!isNaN(f))
          setCurrentValue(!isNaN(f) ? f : undefined)
          setTimeout(callOnChange, 100)
        }}
        style={{
          flexGrow: 2
        }}
        isInvalid={!isNumberValid ? true : undefined}
      />
      <UnitSelection
        onChange={unit => {
          setCurrentUnit(unit ?? undefined)
          setTimeout(callOnChange, 100)
        }}
        units={units}
        value={value?.unit}
        styles={{
          ...styles,
          container: {
            width: "33%",
            minWidth: "100px",
            // flexGrow: 1,
            ...styles?.container
          }
        }}
      />
    </div>
  )

}

export default QuantityInput;
