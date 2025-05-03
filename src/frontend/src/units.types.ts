import _ from "lodash";
import { IconType } from "react-icons";
import {
  FaBolt,
  FaChargingStation,
  FaCoins,
  FaCube,
  FaDatabase,
  FaDumbbell,
  FaExpand,
  FaFlask,
  FaHashtag,
  FaLightbulb,
  FaMagnet,
  FaMinimize,
  FaPlug,
  FaRadiation,
  FaRuler,
  FaScaleBalanced,
  FaShip,
  FaStopwatch,
  FaSun,
  FaTemperatureHalf,
  FaUserGroup,
  FaWaveSquare,
} from "react-icons/fa6";
import { EventAttributeDefinition } from "./api/generated";

export type Unit = NonNullable<EventAttributeDefinition["unit"]>;
export type Quantity = {
  value: number;
  unit?: Unit | null;
};

export function unitEquals(
  unit1: Unit | null | undefined,
  unit2: Unit | null | undefined,
) {
  if (!unit1 || !unit2) return !unit1 && !unit2;
  return _.isEqual(unit1, unit2);
}

export const WEIGHT_DIM = { "[mass]": 1 };
export const MONEY_DIM = { "[currency]": 1 };

export function isWeight(unit: Unit | null) {
  if (!unit) return false;
  return _.isEqual(unit.dim, WEIGHT_DIM);
}

export function isMoney(unit: Unit | null) {
  if (!unit) return false;
  return _.isEqual(unit.dim, MONEY_DIM);
}

export const GRAM: Unit = { symbol: "g", name: "gram", dim: { "[mass]": 1 } };
export const KILOGRAM: Unit = {
  symbol: "kg",
  name: "kilogram",
  dim: { "[mass]": 1 },
};
export const TONNE: Unit = {
  symbol: "t",
  name: "metric_ton",
  dim: { "[mass]": 1 },
};

export const DAY: Unit = { symbol: "d", name: "day", dim: { "[time]": 1 } };
export const HOUR: Unit = { symbol: "h", name: "hour", dim: { "[time]": 1 } };
export const MINUTE: Unit = {
  symbol: "min",
  name: "minute",
  dim: { "[time]": 1 },
};
export const SECOND: Unit = {
  symbol: "s",
  name: "second",
  dim: { "[time]": 1 },
};

export type UnitTypeDim = Record<string, number>;

export type UnitTypeData = {
  name?: string;
  climatiqName?: string;
  dim: UnitTypeDim;
  Icon?: IconType;
  icons?: IconType[];
};

const TimeIcon = FaStopwatch;
const LengthIcon = FaRuler;
const MassIcon = FaScaleBalanced;
const AreaIcon = FaExpand;

export const unitTypeData: UnitTypeData[] = [
  // SI base types
  {
    name: "length",
    dim: { "[length]": 1 },
    Icon: LengthIcon,
    climatiqName: "Distance",
  },
  {
    name: "mass",
    dim: { "[mass]": 1 },
    Icon: MassIcon,
    climatiqName: "Weight",
  },
  { name: "time", dim: { "[time]": 1 }, Icon: TimeIcon, climatiqName: "Time" },
  { name: "electric current", dim: { "[current]": 1 }, Icon: FaPlug },
  { name: "temperature", dim: { "[temperature]": 1 }, Icon: FaTemperatureHalf },
  { name: "amount of substance", dim: { "[substance]": 1 }, Icon: FaFlask },
  { name: "luminous intensity", dim: { "[luminosity]": 1 }, Icon: FaLightbulb },

  // SI derived types
  {
    name: "force",
    dim: { "[mass]": 1, "[length]": 1, "[time]": -2 },
    Icon: FaDumbbell,
  },
  {
    name: "pressure",
    dim: { "[mass]": 1, "[length]": -1, "[time]": -2 },
    Icon: FaMinimize,
  },
  {
    name: "energy",
    dim: { "[mass]": 1, "[length]": 2, "[time]": -2 },
    Icon: FaBolt,
    climatiqName: "Energy",
  },
  {
    name: "power",
    dim: { "[mass]": 1, "[length]": 2, "[time]": -3 },
    Icon: FaPlug,
  },
  {
    name: "electric charge",
    dim: { "[time]": 1, "[current]": 1 },
    Icon: FaChargingStation,
  },
  {
    name: "voltage",
    dim: { "[mass]": 1, "[length]": 2, "[time]": -3, "[current]": -1 },
    Icon: FaPlug,
  },
  { name: "frequency", dim: { "[time]": -1 }, Icon: FaWaveSquare },
  {
    name: "magnetic field",
    dim: { "[mass]": 1, "[time]": -2, "[current]": -1 },
    Icon: FaMagnet,
  },
  {
    name: "illuminance",
    dim: { "[luminosity]": 1, "[length]": -2 },
    Icon: FaSun,
  },
  { name: "radioactivity", dim: { "[time]": -1 }, Icon: FaRadiation },

  // climatiq unit types
  {
    name: undefined,
    climatiqName: "Area",
    dim: { "[length]": 2.0 },
    Icon: AreaIcon,
  },
  {
    name: undefined,
    climatiqName: "AreaOverTime",
    dim: { "[length]": 2, "[time]": 1 },
    icons: [AreaIcon, TimeIcon],
  },
  {
    name: undefined,
    climatiqName: "ContainerOverDistance",
    dim: { "[length]": 1 },
    icons: [FaShip, LengthIcon],
  },
  {
    name: undefined,
    climatiqName: "Data",
    dim: { "[information]": 1 },
    Icon: FaDatabase,
  },
  {
    name: undefined,
    climatiqName: "DataOverTime",
    dim: { "[information]": 1, "[time]": 1 },
    icons: [FaDatabase, TimeIcon],
  },
  // Distance -> length
  {
    name: undefined,
    climatiqName: "DistanceOverTime",
    dim: { "[length]": 1, "[time]": 1 },
    icons: [LengthIcon, TimeIcon],
  },
  // Energy -> energy
  {
    name: undefined,
    climatiqName: "Money",
    dim: { "[currency]": 1 },
    Icon: FaCoins,
  },
  { name: undefined, climatiqName: "Number", dim: {}, Icon: FaHashtag },
  {
    name: undefined,
    climatiqName: "NumberOverTime",
    dim: { "[time]": 1 },
    icons: [FaHashtag, LengthIcon],
  },
  {
    name: undefined,
    climatiqName: "PassengerOverDistance",
    dim: { "[length]": 1 },
    icons: [FaUserGroup, LengthIcon],
  },
  // Time -> time
  {
    name: undefined,
    climatiqName: "Volume",
    dim: { "[length]": 3 },
    Icon: FaCube,
  },
  // Weight -> mass
  {
    name: undefined,
    climatiqName: "WeightOverDistance",
    dim: { "[mass]": 1, "[length]": 1 },
    icons: [MassIcon, LengthIcon],
  },
  {
    name: undefined,
    climatiqName: "WeightOverTime",
    dim: { "[mass]": 1, "[time]": 1 },
    icons: [MassIcon, TimeIcon],
  },
];
