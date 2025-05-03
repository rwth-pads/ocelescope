import {
  ClimatiqEmissionFactor_Output,
  E2OEmissionRule_Output,
  EventEmissionRule_Output,
  LocalEmissionFactor_Output,
} from "./api/generated";
import { Quantity } from "./units.types";

interface EmissionRuleBase {
  name?: string;
  type?: string;
}

// EditingEmissionRule is defined separately for the frontend, with most properties made optional.
// This allows using the type for the form state, including representing incomplete rules.

export type EmissionRule = EventEmissionRule_Output | E2OEmissionRule_Output;
export type EmissionFactor =
  | LocalEmissionFactor_Output
  | ClimatiqEmissionFactor_Output;

export type EditingEmissionFactor = Partial<EmissionFactor>;

export type GenericEditingEmissionRule<R extends EmissionRule> = Partial<
  Omit<R, "type" | "index" | "factor">
> & {
  type: R["type"];
  index: R["index"];
  factor?: EditingEmissionFactor;
};
// export type EditingEmissionRule = GenericEditingEmissionRule<EmissionRule>
export type EditingEventEmissionRule =
  GenericEditingEmissionRule<EventEmissionRule_Output>;
export type EditingE2OEmissionRule =
  GenericEditingEmissionRule<E2OEmissionRule_Output>;
export type EditingEmissionRule =
  | EditingEventEmissionRule
  | EditingE2OEmissionRule;

export function isEventEmissionRule(
  rule: EditingEmissionRule,
): rule is EditingEventEmissionRule {
  return rule.type == "EventEmissionRule";
}
export function isE2OEmissionRule(
  rule: EditingEmissionRule,
): rule is EditingE2OEmissionRule {
  return rule.type == "E2OEmissionRule";
}

export function notZero(x: Quantity | number | undefined | null) {
  if (!x) return false;
  if (typeof x === "number") return true;
  return x.value != 0;
}

export function getEmissionRuleDisplayName(
  rule: EditingEmissionRule | undefined,
) {
  if (!rule || rule.type === undefined || isEmissionRuleEmpty(rule)) {
    return "Empty rule";
  }
  const name = rule.name ?? rule.defaultName;
  return name ?? "New rule";
}

export function isEmissionFactorEmpty(
  factor: EditingEmissionFactor | undefined,
) {
  if (!factor) return true;
  if (!factor.source) return true;
  if (factor.source == "climatiq") return !factor.data?.id;
  if (factor.source == "local") return !factor.value || factor.value.value == 0;
  throw Error();
}

export function isEmissionRuleEmpty(
  rule: EditingEventEmissionRule | EditingE2OEmissionRule | undefined,
) {
  if (!rule?.type) {
    return true;
  }
  if (rule.type == "EventEmissionRule") {
    if (rule.activity === undefined) return true;
    if (isEmissionFactorEmpty(rule.factor)) return true;
    return false;
  }
  if (rule.type == "E2OEmissionRule") {
    if (rule.activity === undefined) return true;
    if (rule.objectType === undefined) return true;
    if (isEmissionFactorEmpty(rule.factor)) return true;
    return false;
  }
  throw Error();
}
