import { Unit, Quantity, isMoney } from "@/src/units.types";
import { combineClassNames } from "@/src/util";
import _ from "lodash";

const defaultNumberFormatOptions = {
  maximumFractionDigits: 2
}
export const defaultLocales: Intl.LocalesArgument = "en"
const defaultNoUnitNumberFormat = new Intl.NumberFormat(defaultLocales, defaultNumberFormatOptions)

export type QuantityStringOptions = {
  showZero?: boolean
  numberFormatOptions?: Intl.NumberFormatOptions | undefined
  locales?: Intl.LocalesArgument
}

export function quantityString(
  x: Quantity | null | undefined,
  options: QuantityStringOptions = {}
): string {
  const {
    showZero = false,
    numberFormatOptions = undefined,
    locales = defaultLocales
  } = options

  if (x === undefined || x === null || (x.value === 0 && !showZero)) {
    return "-"
  }

  let unit: Unit | null = x.unit ?? null
  
  // Built-in currency formatting
  if (unit && isMoney(unit)) {
    const currencyNumberFormatOptions: Intl.NumberFormatOptions = {
      ...defaultNumberFormatOptions,
      ...numberFormatOptions,
      style: "currency",
      currency: unit.symbol ?? undefined,
      currencyDisplay: "symbol"
    }
    try {
      const currencyNumberFormat = new Intl.NumberFormat(locales, currencyNumberFormatOptions)
      return currencyNumberFormat.format(x.value)
    } catch (err) {
      console.error(`quantityString() failed with style: "currency"`, x, options)
    }

  }

  // Render number + unit
  const noUnitNumberFormat = !_.isEmpty(numberFormatOptions) ? new Intl.NumberFormat(locales, {
    ...defaultNumberFormatOptions,
    ...numberFormatOptions
  }) : defaultNoUnitNumberFormat
  return `${noUnitNumberFormat.format(x.value)}${unit ? " " + unit?.symbol : ""}`
}

export type QtyProps = Omit<React.HTMLProps<HTMLSpanElement>, "value"> & {
  value: Quantity | number | null | undefined
  unit?: Unit | null
  options?: QuantityStringOptions
}

const Qty: React.FC<QtyProps> = ({
  value,
  unit,
  options,
  className,
  ...props
}) => {
  if (typeof value === "number" && value !== null && value !== undefined)
    value = { "value": value, "unit": unit ?? null }

  const str = quantityString(value, options ?? {})
  if (value === undefined || str == "-") {
    return <span className={combineClassNames(className, "text-secondary")} {...props}>-</span>
  }
  return <span className={className}>{str}</span>

}

export type QtyRangeProps = Omit<QtyProps, "value"> & {
  value1: Quantity | number | undefined
  value2: Quantity | number | undefined
  summarizeEqual?: boolean
  summarizeUnit?: boolean  // -> "1 - 2 km" (Currencies are not summarized -> "€1 - €2")
}

export const QtyRange: React.FC<QtyRangeProps> = ({
  value1,
  value2,
  unit,
  summarizeEqual = true,
  summarizeUnit = true,
  options,
  className,
  ...props
}) => {
  if (unit === undefined) unit = null

  if (typeof value1 === "number" && value1 !== undefined)
    value1 = { "value": value1, "unit": unit ?? null }
  if (typeof value2 === "number" && value2 !== undefined)
    value2 = { "value": value2, "unit": unit ?? null }

  if (value1 === undefined || value2 === undefined) {
    return <span className={combineClassNames(className, "text-secondary")} {...props}>-</span>
  }
  if (!_.isEqual(value1?.unit, value2?.unit)) {
    throw Error("<QtyRange> received values of different units")
  }
  if (value1.value == value2.value && summarizeEqual) {
    return <Qty value={value1} options={options} className={className} {...props} />
  }
  if (summarizeUnit && !isMoney(unit)) {
    value1 = { ...value1, unit: null }
  }

  const str1 = quantityString(value1, options ?? {})
  const str2 = quantityString(value2, options ?? {})
  return <span className={className} {...props}>{str1} - {str2}</span>

}

export default Qty
