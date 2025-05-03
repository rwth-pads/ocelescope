import {
  FaCartShopping,
  FaDoorOpen,
  FaFileInvoiceDollar,
  FaGitAlt,
  FaTaxi,
  FaTruckFast,
} from "react-icons/fa6";
import { ObjectAttributeDefinition } from "./api/generated";
import { AttributeDefinition } from "./app-state.types";
import { unitEquals } from "./units.types";

export type OCEL = {
  meta: {
    path: string;
    fileName: string;
    uploadDate: string;
    importReport: {
      pythonVersion: string;
      pm4pyVersion: string;
      unsatisfiedOcelConstraints: string[];
      warnings: {
        type: string;
        msg: string;
        count: number;
        locations: string[];
      }[];
      ocelStrPm4py?: string;
      ocelStr?: string;
    };
  };
  numEvents: number;
  numObjects: number;
  objectTypes: string[];
  objectTypeCounts: { [ot: string]: number };
  // autoHuObjectTypes: string[]
  // autoResourceObjectTypes: string[]
  medianNumEventsPerObjectType: { [ot: string]: number };
  activities: string[];
  activityCounts: { [act: string]: number };
  e2oCounts: { [act: string]: { [ot: string]: number } };
  e2oQualifierCounts: {
    [act: string]: { [ot: string]: { [q: string]: number } };
  };
  attributes: OCELAttribute[];
};

export type QualifiedObjectAttributeDefinition = {
  objectType: string;
  qualifier: string | null;
  attribute: ObjectAttributeDefinition;
};

type OCELAttributeBase = {
  name: string;
  numValues: number;
  type: "float" | "int" | "str" | "object";
};

type OCELEventAttributeBase = OCELAttributeBase & {
  target: "event";
  activity: string;
};

type OCELObjectAttributeBase = OCELAttributeBase & {
  target: "object";
  objectType: string;
  dynamic: boolean;
};

type OCELDynamicAttributeBase = OCELObjectAttributeBase & {
  dynamic: true;
  availability: { [act: string]: number };
};

type OCELStaticAttributeBase = OCELObjectAttributeBase & {
  dynamic: false;
};

type OCELNumericAttributeBase = OCELAttributeBase & {
  numeric: true;
  // unit?: Unit
  min: number;
  max: number;
  mean: number;
  median: number;
};

type OCELCategoricalAttributeBase = OCELAttributeBase & {
  numeric: false;
  mode: any;
  modeFrequency: number;
  frequentValues: { [x: string]: number };
  numUnique: number;
};

export type OCELEventAttribute = OCELEventAttributeBase &
  (OCELNumericAttributeBase | OCELCategoricalAttributeBase);
export type OCELObjectAttribute = OCELObjectAttributeBase &
  (OCELNumericAttributeBase | OCELCategoricalAttributeBase);
export type OCELDynamicObjectAttribute = OCELDynamicAttributeBase &
  (OCELNumericAttributeBase | OCELCategoricalAttributeBase);
export type OCELStaticObjectAttribute = OCELStaticAttributeBase &
  (OCELNumericAttributeBase | OCELCategoricalAttributeBase);
export type OCELNumericAttribute = (
  | OCELEventAttributeBase
  | OCELObjectAttributeBase
) &
  OCELNumericAttributeBase;
export type OCELNumericEventAttribute = OCELEventAttributeBase &
  OCELNumericAttributeBase;
export type OCELNumericObjectAttribute = OCELObjectAttributeBase &
  OCELNumericAttributeBase;
export type OCELCategoricalAttribute = (
  | OCELEventAttributeBase
  | OCELObjectAttributeBase
) &
  OCELCategoricalAttributeBase;
export type OCELCategoricalEventAttribute = OCELEventAttributeBase &
  OCELCategoricalAttributeBase;
export type OCELCategoricalObjectAttribute = OCELObjectAttributeBase &
  OCELCategoricalAttributeBase;
export type OCELAttribute = (OCELEventAttributeBase | OCELObjectAttributeBase) &
  (OCELNumericAttributeBase | OCELCategoricalAttributeBase);

// Attribute type helpers
export const isEventAttribute = ((attr) =>
  attr.target == "event" && "activity" in attr) as (
  attr: OCELAttribute,
) => attr is OCELEventAttribute;
export const isObjectAttribute = ((attr) =>
  attr.target == "object" && "objectType" in attr) as (
  attr: OCELAttribute,
) => attr is OCELObjectAttribute;
export const isDynamicObjectAttribute = ((attr) =>
  isObjectAttribute(attr) && attr.dynamic) as (
  attr: OCELAttribute,
) => attr is OCELDynamicObjectAttribute;
export const isStaticObjectAttribute = ((attr) =>
  isObjectAttribute(attr) && !attr.dynamic) as (
  attr: OCELAttribute,
) => attr is OCELStaticObjectAttribute;
export const isNumericAttribute = ((attr) => attr.numeric) as (
  attr: OCELAttribute,
) => attr is OCELNumericAttribute;
export const isNumericEventAttribute = ((attr) =>
  isEventAttribute(attr) && isNumericAttribute(attr)) as (
  attr: OCELAttribute,
) => attr is OCELNumericEventAttribute;
export const isNumericObjectAttribute = ((attr) =>
  isObjectAttribute(attr) && isNumericAttribute(attr)) as (
  attr: OCELAttribute,
) => attr is OCELNumericObjectAttribute;
export const isCategoricalAttribute = ((attr) => !attr.numeric) as (
  attr: OCELAttribute,
) => attr is OCELCategoricalAttribute;
export const isCategoricalEventAttribute = ((attr) =>
  isEventAttribute(attr) && isCategoricalAttribute(attr)) as (
  attr: OCELAttribute,
) => attr is OCELCategoricalEventAttribute;
export const isCategoricalObjectAttribute = ((attr) =>
  isObjectAttribute(attr) && isCategoricalAttribute(attr)) as (
  attr: OCELAttribute,
) => attr is OCELCategoricalObjectAttribute;

export function attributeDefinitionEquals(
  attr1: OCELAttribute | AttributeDefinition,
  attr2: OCELAttribute | AttributeDefinition,
  // options: { requireSameUnit?: boolean }
) {
  // const { requireSameUnit = false } = options
  if (attr1.name != attr2.name) return false;
  // if (requireSameUnit) {
  if ("unit" in attr1 && "unit" in attr2) {
    if (!unitEquals(attr1.unit, attr2.unit)) return false;
  }
  if (attr1.target == "event" && attr2.target == "event") {
    return attr1.activity == attr2.activity;
  }
  if (attr1.target == "object" && attr2.target == "object") {
    if (attr1.dynamic != attr2.dynamic) throw Error();
    return attr1.objectType == attr2.objectType;
  }
  return false;
}

export const defaultOcelIcons = {
  containerLogistics: FaTruckFast,
  orderManagement: FaCartShopping,
  orderManagementWithDistances: FaCartShopping,
  p2p: FaFileInvoiceDollar,
  angularCommits: FaGitAlt,
  hinge: FaDoorOpen,
  taxi: FaTaxi,
  "pallet-logistics": FaTruckFast,
};
