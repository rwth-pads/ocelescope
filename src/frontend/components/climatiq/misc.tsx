import {
  ClimatiqPossibleFiltersList,
  ClimatiqSearchResponse,
  Region,
} from "@/src/climatiq.types";
import { filterValueOrder } from "@/src/climatiq.util";
import { combineClassNames } from "@/src/util";
import _ from "lodash";
import { Children, HTMLProps, ReactNode, useId } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { CircleFlag, countries } from "react-circle-flags";
import { FaEllipsis } from "react-icons/fa6";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import styled from "styled-components";

/**
 * A horizontal stack of region icons (flags / earth icons) overlapping by 50%.
 */
export const RegionIconStack = styled(
  ({
    size,
    overlap,
    children,
    ...props
  }: HTMLProps<HTMLDivElement> & { size: number; overlap?: number }) => {
    return (
      <div {...props}>
        {Children.toArray(children)
          .filter((child) => child)
          .map((child, i) => (
            <div key={i} className="stack-item">
              {child}
            </div>
          ))}
      </div>
    );
  },
)`
  display: flex;
  transform: rotate(0);
  .stack-item {
    &:not(:last-child) {
      width: ${({ size, overlap = 0.5 }) => `${(1 - overlap) * size}px`};
      overflow: visible;
    }

    .region-symbol {
      // when overlapping, prevent half-transparent icons
      &:has(.region-icon) {
        background: var(--bs-body-bg);
      }
      border-radius: 50%;
    }
    &:not(:first-child) .region-symbol {
      // Add a little shadow on the icon below (to its left)
      box-shadow: ${({ size }) => `-${0.25 * size}px 0 ${0.25 * size}px -${0.125 * size}px`} rgba(0, 0, 0, .5);
    }
    .ellipsis {
      width: ${({ size }) => `${size}px`};
      margin-left: ${({ size, overlap = 0.5 }) => `${overlap * size}px`};
      opacity: .5;
    }
    .ellipsis-complete {
      background: var(--bs-light-bg-subtle);
      border: 1px solid var(--bs-light-border-subtle);
      color: var(--bs-light-text-emphasis);
      border-radius: ${({ size }) => `${size / 2}px`};
      box-sizing: content-box;
      padding: 0 .25rem;
    }
    .ellipsis, .ellipsis-complete {
      height: ${({ size }) => `${size}px`};
      font-size: 75%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
`;

export type RegionIconProps = HTMLProps<HTMLDivElement> & {
  region: Region | undefined;
  size?: number;
  tooltip?: boolean;
};

/**
 * A component showing an icon for a climatiq region. This is either a circular country flag, an earth icon, or an empty placeholder.
 */
export const RegionIcon = styled(
  ({
    region,
    size = 20,
    tooltip = false,
    className,
    ...props
  }: RegionIconProps) => {
    // TODO tooltip

    let icon: ReactNode = <div className="region-no-icon"></div>;
    if (region?.Icon) {
      icon = <region.Icon className="region-icon" />;
    } else if (region?.countryCode && region?.countryCode in countries) {
      icon = (
        <CircleFlag
          className="region-flag"
          countryCode={region.countryCode}
          height={size}
        />
      );
    }

    const tooltipId = useId();

    return (
      <OverlayTrigger
        overlay={<Tooltip id={tooltipId}>{region?.name}</Tooltip>}
      >
        <div
          className={combineClassNames("region-symbol", className)}
          {...props}
        >
          {icon}
        </div>
      </OverlayTrigger>
    );
  },
)`
  width: ${({ size }) => `${size}px`};
  height: ${({ size }) => `${size}px`};
  display: flex;

  .region-icon {
    font-size: ${({ size }) => `${size}px`};
  }
  .region-no-icon {
    width: ${({ size }) => `${size}px`};
    height: ${({ size }) => `${size}px`};
  }
`;
/*



*/

type ValueSetProps = HTMLProps<HTMLDivElement> & {
  filterKey: string;
  values: any[];
  climatiqResponse?: ClimatiqSearchResponse | undefined;
  complete?: boolean;
  paragraphs?: boolean;
  regionIconSize?: number;
};

/**
 * A component listing distinct values of a specified climatiq field.
 * Regions are shown as an icon stack.
 * Depending on the climatiqResponse, it is determined whether the list is exhaustive.
 */
export const ValueSet = styled(
  ({
    filterKey,
    values,
    complete = false,
    climatiqResponse,
    paragraphs = false,
    regionIconSize = 20,
    ref,
    ...props
  }: ValueSetProps) => {
    // If there is only one result page, the value list is complete
    complete = complete || climatiqResponse?.lastPage == 1;
    // If the possibleFilters list is as long as the values list, the latter is complete
    if (
      [
        "year",
        "source",
        "region",
        "category",
        "sector",
        "unitType",
        "sourceLcaActivity",
        "accessType",
        "dataQualityFlags",
      ].includes(filterKey)
    ) {
      const allValues =
        climatiqResponse?.possibleFilters[
          filterKey as keyof ClimatiqPossibleFiltersList
        ];
      complete = complete || allValues?.length == values.length;
    }

    const maxNumValues = 4;
    if (!values) return undefined;
    values = values.filter((x) => x !== undefined);
    values = _.sortBy(values, (x) => filterValueOrder(filterKey, x));

    if (!values.length) {
      return <Skeleton />;
    }

    const visibleValuesWithEllipsis = [
      ...values.slice(0, maxNumValues),
      ...(!complete || values.length > maxNumValues ? [undefined] : []),
    ];
    const visibleValues = values.slice(0, maxNumValues);
    const hasEllipsis = !complete || values.length > maxNumValues;
    const ellipsis = complete
      ? ` [+ ${values.length - maxNumValues} more]`
      : " [+more]";

    if (filterKey == "region") {
      return (
        <RegionIconStack size={regionIconSize} overlap={0.4} {...props}>
          {(visibleValues as Region[]).map((region, i) => (
            <RegionIcon
              key={i}
              region={region}
              tooltip={true}
              size={regionIconSize}
            />
          ))}
          {hasEllipsis && !complete && (
            <div className="ellipsis">
              <FaEllipsis />
            </div>
          )}
          {hasEllipsis && complete && (
            <div className="ellipsis-complete">
              +{values.length - maxNumValues}
            </div>
          )}
        </RegionIconStack>
      );
    }
    if (paragraphs) {
      return visibleValuesWithEllipsis.map((value, i) => {
        if (value === undefined) {
          return <p key={i}>{ellipsis}</p>;
        }
        return <p key={i}>{value}</p>;
      });
    }

    if (
      visibleValuesWithEllipsis.every(
        (value, i) =>
          typeof value === "string" ||
          (value === undefined && i == visibleValuesWithEllipsis.length - 1),
      )
    ) {
      return (
        <>
          {visibleValuesWithEllipsis
            .filter((value) => value !== undefined)
            .join(", ")}
          {visibleValuesWithEllipsis.includes(undefined) && (
            <span className="text-secondary small">{ellipsis}</span>
          )}
        </>
      );
    }
    // other ReactNode was given, return as array
    return visibleValuesWithEllipsis.map((value, i) =>
      value !== undefined ? value : ellipsis,
    );
  },
)`



`;

export function joinValues(
  values: ReactNode[] | undefined,
  paragraphs: boolean = false,
) {
  const maxNumValues = 4;
  if (!values) return undefined;
  const displayValues = [
    ...values.slice(0, maxNumValues),
    ...(values.length > maxNumValues ? [undefined] : []),
  ];
  const ellipsis = ` [${values.length - maxNumValues} more]`;
  if (paragraphs) {
    return displayValues.map((value, i) => {
      if (value === undefined) {
        return <p key={i}>{ellipsis}</p>;
      }
      return <p key={i}>{value}</p>;
    });
  }
  if (
    displayValues.every(
      (value, i) =>
        typeof value === "string" ||
        (value === undefined && i == displayValues.length - 1),
    )
  ) {
    return displayValues
      .map((value, i) => (value !== undefined ? value : ellipsis))
      .join(", ");
  }
  // other ReactNode was given, return as array
  return displayValues.map((value, i) =>
    value !== undefined ? value : ellipsis,
  );
}
