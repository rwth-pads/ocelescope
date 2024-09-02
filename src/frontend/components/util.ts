/* eslint-disable react-hooks/exhaustive-deps */
import { CSSProperties, useEffect, useLayoutEffect, useState } from 'react';
import { GroupBase, StylesConfig as SelectStylesConfig } from "react-select";

// from https://www.react-graph-gallery.com/histogram
export const useDimensions = (targetRef: React.RefObject<HTMLDivElement>) => {

  const getDimensions = () => {
    return {
      width: targetRef.current ? targetRef.current.offsetWidth : 0,
      height: targetRef.current ? targetRef.current.offsetHeight : 0
    }
  }

  const [dimensions, setDimensions] = useState(getDimensions)

  const handleResize = () => {
    setDimensions(getDimensions())
  }

  useEffect(() => {
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useLayoutEffect(() => {
    handleResize()
  }, [])

  return dimensions
}

export type SelectStylesProps<Option = unknown, IsMulti extends boolean = boolean, Group extends GroupBase<Option> = GroupBase<Option>> = {
  [K in keyof SelectStylesConfig<Option, IsMulti, Group>]?: CSSProperties
}

/**
 * @param styles An object containing CSS styles for different react-select components
 * @returns A react-select Select styles prop value, enriched with some common defaults used in this page
 */
export function buildSelectStyles<
  Option = unknown,
  IsMulti extends boolean = boolean,
  Group extends GroupBase<Option> = GroupBase<Option>
>(styles: SelectStylesProps | undefined): SelectStylesConfig<Option, IsMulti, Group> | undefined {
  // might change the styles type to the same type as in <Select> to allow styles depending on state
  if (!styles) {
    styles = {}
  }
  const { container, control, input, option, menu, valueContainer, singleValue, clearIndicator, ...rest } = styles
  return {
    container: (provided: any) => ({
      ...provided,
      ...container
    }),
    control: (provided: any, { isDisabled, isFocused }: any) => ({
      ...provided,
      backgroundColor: `var(--bs-body-bg)`,
      color: "var(--bs-body-color)",
      border: "var(--bs-border-width) solid var(--bs-border-color)",
      borderRadius: "var(--bs-border-radius)",
      lineHeight: 1.5,
      // padding: ".375rem .75rem",
      fontSize: "1rem",
      fontWeight: 400,
      appearance: "none",
      backgroundClip: "padding-box",
      borderColor: isFocused ? "#86b7fe" : undefined,
      boxShadow: isFocused ? "boxShadow: 0 0 0 .25rem rgba(13,110,253,.25)" : undefined,
      outline: isFocused ? "0" : undefined,
      ...control
    }),
    input: ({ margin, paddingTop, paddingBottom, ...provided }: any, state: any) => ({
      ...provided,
      cursor: "text",
      color: "var(--bs-body-color)",
      ...input
    }),
    valueContainer: (provided: any, state: any) => ({
      ...provided,
      ...valueContainer,
    }),
    menu: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: `var(--bs-body-bg)`,
      color: "var(--bs-body-color)",
      zIndex: 5,  // default value (1) is overlayed by bootstrap ToggleButton
      ...menu
    }),
    option: (provided: any, { isFocused, isDisabled }: any) => ({
      ...provided,
      backgroundColor: !isDisabled ? (isFocused ? "var(--bs-primary-bg-subtle)" : `var(--bs-body-bg)`) : `var(--bs-body-bg)`,
      color: !isDisabled ? "var(--bs-body-color)" : "var(--bs-secondary)",
      padding: "4px 12px",
      ...option
    }),
    singleValue: (provided: any, state: any) => ({
      ...provided,
      ...singleValue
    }),
    ...Object.fromEntries(Object.entries(rest).map(([k, kStyles]) => ([
      k,
      (provided: any, state: any) => ({
        ...provided,
        ...kStyles
      })
    ])))
  }
}
