import _ from "lodash"
import { useEffect, useId } from "react"
import { FormCheck, FormCheckProps } from "react-bootstrap"
import { WithTooltip } from "./misc"


export type CheckboxState = {
  visible?: boolean
  disabled?: boolean
  disabledTooltip?: string
  checked: boolean
  setChecked: ((b: boolean) => void) | undefined
}

export type CheckboxProps = CheckboxState & FormCheckProps

export const Checkbox: React.FC<CheckboxProps> = ({
  visible = true,
  disabled = false,
  disabledTooltip,
  checked,
  setChecked,
  ...props
}) => {

  if (!visible) return false
  return (
    <WithTooltip tooltip={disabledTooltip}>
      <FormCheck
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => {
          if (setChecked) {
            setChecked(e.target.checked)
          }
        }}
        {...props}
      />
    </WithTooltip>
  )
}


export const GroupCheckbox: React.FC<{
  states: CheckboxState[]
} & FormCheckProps> = ({ id, states, ...props }) => {

  const autoId = useId()
  id = id ?? autoId

  const checked = states.every(({ checked, disabled }) => checked && !disabled)
  const disabled = _.some(states, "disabled")

  const setAll = (b: boolean) => {
    states.forEach(({ disabled, setChecked }) => {
      if (!disabled && setChecked) {
        setChecked(b)
      }
    })
  }

  const disabledTooltip = _.filter(states, "disabledTooltip").map(({ disabledTooltip }) => disabledTooltip).find(t => !!t)

  // Indeterminate checkbox
  useEffect(() => {
    const checked = _.map(states, "checked")
    if (checked.some(b => b) && checked.some(b => !b)) {
      const checkbox = document.getElementById(id) as HTMLInputElement
      if (checkbox) checkbox.indeterminate = true
    }
  }, [states, id])

  if (!states.length) return false
  if (!states.some(({ visible }) => visible)) return false

  return (
    <WithTooltip tooltip={disabledTooltip}>
      <FormCheck
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => setAll(e.target.checked)}
        {...props}
      />
    </WithTooltip>
  )
}
