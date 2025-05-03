import { WithTooltip } from "@/components/common/misc";
import { ObjectTypeColors } from "@/src/app-state.types";
import {
  OCELAttribute,
  isDynamicObjectAttribute,
  isEventAttribute,
  isStaticObjectAttribute,
} from "@/src/ocel.types";
import { useHandlingUnitsAndResources, useOceanStore } from "@/src/zustand";
import React, { SVGProps, useId } from "react";
import Button, { ButtonProps } from "react-bootstrap/Button";
import BsButtonToolbar from "react-bootstrap/ButtonToolbar";
import {
  FaCalendarCheck,
  FaChartLine,
  FaCircle,
  FaCircleDot,
  FaCirclePlay,
} from "react-icons/fa6";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import styled from "styled-components";

export const Heading = styled.h4`
  display: flex;
  align-items: center;
  gap: .5rem;
  svg, .icon {
    font-size: 75%;
  }
`;

export const CustomIcon = ({
  d,
  stroke = "currentColor",
  fill = "currentColor",
  strokeWidth = "0",
  height = "1em",
  width = "1em",
  ...props
}: SVGProps<SVGSVGElement> & {
  d: string;
}) => (
  <svg
    viewBox="0 0 512 512"
    stroke={stroke}
    fill={fill}
    strokeWidth={strokeWidth}
    width={width}
    height={height}
    {...props}
  >
    <path id="path" d={d} />
  </svg>
);

// Reusable icon aliases
export const HandlingUnitIcon = FaCirclePlay;
export const ResourceIcon = FaCircleDot;
export const UnspecifiedObjectIcon = FaCircle;
// export const ObjectIcon = FaBox
export const EventIcon = FaCalendarCheck;
// export const ProcessExecutionIcon = FaCirclePlay
export const DynamicObjectAttributeIcon = FaChartLine;
// export const StaticObjectAttributeIcon = FaLock
export const StaticObjectAttributeIcon = ({
  ...props
}: SVGProps<SVGSVGElement>) => (
  <CustomIcon
    d="m 447.92356,239.91124 c 17.67767,0 32.03193,-14.35427 32.03193,-32.03194 0,-17.67767 -14.35426,-32.03193 -32.03193,-32.03193 l -319.55985,0.0707 c -17.67767,0 -32.03193,14.35426 -32.03193,32.03193 0,17.67767 14.35426,32.03193 32.03193,32.03193 l 319.55985,0.0707 z M 64,64 C 64,46.3 49.7,32 32,32 14.3,32 0,46.3 0,64 v 336 c 0,44.2 35.8,80 80,80 h 400 c 17.7,0 32,-14.3 32,-32 0,-17.7 -14.3,-32 -32,-32 H 80 c -8.8,0 -16,-7.2 -16,-16 z"
    {...props}
  />
);

export function getAttributeNameAndIcon(attr: OCELAttribute) {
  if (isEventAttribute(attr))
    return { attrTypeDescription: "Event attribute", AttrTypeIcon: EventIcon };
  if (isDynamicObjectAttribute(attr))
    return {
      attrTypeDescription: "Dynamic object attribute",
      AttrTypeIcon: DynamicObjectAttributeIcon,
    };
  if (isStaticObjectAttribute(attr))
    return {
      attrTypeDescription: "Static object attribute",
      AttrTypeIcon: StaticObjectAttributeIcon,
    };
  return {};
}

export const AttributeName: React.FC<{
  attr: OCELAttribute;
  label?: string;
}> = ({ attr, label }) => {
  const { attrTypeDescription, AttrTypeIcon } = getAttributeNameAndIcon(attr);
  const id = useId();
  if (!attrTypeDescription || AttrTypeIcon === undefined) return false;
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <WithTooltip tooltip={attrTypeDescription}>
        <AttrTypeIcon className="text-secondary" />
      </WithTooltip>
      {label ?? attr.name}
    </span>
  );
};

export const objectTypeColorProps = (
  objectTypeColors: ObjectTypeColors | null,
  objectType?: string,
) => ({
  color:
    objectTypeColors && objectType && objectType in (objectTypeColors ?? {})
      ? objectTypeColors[objectType].css()
      : undefined,
  className:
    !objectType || !(objectType in (objectTypeColors ?? {}))
      ? "text-secondary"
      : undefined,
});

export const ObjectTypeIcon: React.FC<{
  objectType?: string;
  objectTypeClass?: "handling_unit" | "resource";
}> = ({ objectType, objectTypeClass }) => {
  const objectTypeColors = useOceanStore.use.objectTypeColors();
  const { handlingUnits, resources } = useOceanStore(
    useHandlingUnitsAndResources,
  );
  const colorProps = objectTypeColorProps(objectTypeColors, objectType);
  const { icon, tooltip } = (() => {
    if (!objectType) {
      return {
        icon: <UnspecifiedObjectIcon {...colorProps} />,
        tooltip: null,
      };
    }
    if (
      objectTypeClass !== undefined
        ? objectTypeClass == "handling_unit"
        : (handlingUnits?.includes(objectType) ?? true)
    ) {
      return {
        icon: <HandlingUnitIcon {...colorProps} />,
        tooltip: `${objectType} (handling unit)`,
      };
    }
    if (
      objectTypeClass !== undefined
        ? objectTypeClass == "resource"
        : (resources?.includes(objectType) ?? false)
    ) {
      return {
        icon: <ResourceIcon {...colorProps} />,
        tooltip: `${objectType} (resource)`,
      };
    }
    throw Error("ObjectTypeIcon: invalid object type class");
  })();

  if (tooltip) {
    return <WithTooltip tooltip={tooltip}>{icon}</WithTooltip>;
  }
  return icon;
};

export const ObjectTypeWithIcon: React.FC<{
  objectType?: string;
  objectTypeClass?: "handling_unit" | "resource"; // objectTypeClass is inferred internally, pass this only when editing the assignment
}> = ({ objectType, objectTypeClass }) => {
  return (
    <div className="d-inline-flex align-items-center gap-2">
      <ObjectTypeIcon
        objectType={objectType}
        objectTypeClass={objectTypeClass}
      />
      {objectType}
    </div>
  );
};

export const ActivityWithIcon: React.FC<{
  activity?: string;
}> = ({ activity }) => {
  return (
    <div className="d-inline-flex align-items-center gap-2">
      <div>
        <EventIcon className="text-secondary" />
      </div>
      {activity}
    </div>
  );
};

// export const IconOption = styled.div`
//   display: flex;
//   align-items: center;
//   gap: .5rem;
// `

export const ButtonToolbar = styled(BsButtonToolbar)`
  gap: .5rem;
  & > .left {
    margin-right: auto;
  }
  & > .left, & > .right {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    & > :not(:last-child) {
      margin-right: .5rem !important;
    }
  }
`;

export const IconButton = styled(
  ({
    children,
    label,
    labelProps,
    ref,
    ...props
  }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> } & {
    label?: string;
    labelProps?: React.HTMLProps<HTMLSpanElement>;
  }) => (
    <Button ref={ref} {...props}>
      <div className="btnContents">
        {children}
        {label && <span {...labelProps}>{label}</span>}
      </div>
    </Button>
  ),
)`
  .btnContents {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    min-height: 24px;
  }
`;

export const CircleButton = styled(
  ({
    children,
    size,
    ...props
  }: Omit<ButtonProps, "size"> & { size: number }) => (
    <Button {...props}>{children}</Button>
  ),
)`
  width: ${({ size }) => `${size}px`};
  height: ${({ size }) => `${size}px`};
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ParagraphLinks = styled.div`
  & > p, & > div {
    display: flex;
    align-items: center;
    margin: 0;
    gap: 1rem;
    padding: .5rem;
    border-top: var(--bs-border-width) solid var(--bs-border-color);
    &:last-child {
      border-bottom: var(--bs-border-width) solid var(--bs-border-color);
    }
    transform: rotate(0); /* Make containing block for stretched-link to work */
    & > a {
      text-decoration: none;
      cursor: pointer;
    }
    &:hover:not(.disabled):not(:has(a:not(.stretched-link):hover)):not(:has(.btn:not(.stretched-link):hover)) {
      background: var(--bs-secondary-bg);
    }
  }
`;

export const SkeletonIcon = () => (
  <Skeleton circle={true} width={16} height={16} />
);

export function pluralize(count: number, singular: string, plural: string) {
  if (count == 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}
