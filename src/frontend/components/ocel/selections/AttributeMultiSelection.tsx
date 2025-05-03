import { buildSelectStyles, SelectStylesProps } from "@/components/util";
import { EventAttributeDefinition } from "@/src/api/generated";
import {
  AttributeDefinition,
  findOcelAttribute,
  useAttributeUnit,
} from "@/src/app-state.types";
import {
  isDynamicObjectAttribute,
  OCEL,
  OCELAttribute,
  QualifiedObjectAttributeDefinition,
} from "@/src/ocel.types";
import { combineClassNames } from "@/src/util";
import { useOceanStore } from "@/src/zustand";
import _ from "lodash";
import { FaEquals } from "react-icons/fa6";
import Select, {
  FormatOptionLabelMeta,
  Props as SelectProps,
} from "react-select";
import { AttributeName } from "../../misc";

export type AttributeSourceDefinition =
  | EventAttributeDefinition
  | QualifiedObjectAttributeDefinition;

type AttributeItem = {
  value: string;
  attribute?: OCELAttribute;
  attributeSource?: AttributeSourceDefinition;
  attributeUnit?: AttributeDefinition;
  label: string;
};

const availabilityNumberFormat = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumSignificantDigits: 1,
});
const otq = ({
  objectType,
  qualifier,
  attribute,
}: QualifiedObjectAttributeDefinition) =>
  !!qualifier ? `${objectType}/${qualifier}` : objectType;

const makeItem = (
  s: AttributeSourceDefinition | undefined,
  ocel: OCEL,
  attributeUnits: AttributeDefinition[],
  constLabel: string,
  showAvailabilityForActivity?: string,
): AttributeItem => {
  if (!s) {
    return {
      value: "const",
      label: constLabel,
    };
  }
  const def = "attribute" in s ? s.attribute : s;
  const attr = findOcelAttribute(ocel, def);
  if (!attr) throw Error(`Attribute '${def.name}' not found`);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const unit = useAttributeUnit(attr);
  const availability =
    isDynamicObjectAttribute(attr) && showAvailabilityForActivity
      ? _.get(attr.availability, showAvailabilityForActivity)
      : undefined;
  return {
    label:
      `${attr.name}` +
      (unit ? ` [${unit.symbol}]` : "") +
      ("objectType" in s ? ` (${otq(s)})` : "") +
      (availability !== undefined
        ? ` (available ${availabilityNumberFormat.format(availability)})`
        : ""),
    attribute: attr,
    attributeUnit: def,
    attributeSource: s,
    value: attr.name,
  };
};

type AttributeMultiSelectionProps = Omit<
  SelectProps,
  | "id"
  | "inputId"
  | "classNamePrefix"
  | "selected"
  | "options"
  | "onChange"
  | "defaultValue"
  | "styles"
> & {
  id?: string;
  eventAttributes: EventAttributeDefinition[];
  objectAttributes: QualifiedObjectAttributeDefinition[];
  includeNoneOption?: boolean;
  selected?: AttributeSourceDefinition[];
  onChange?: (attr: AttributeSourceDefinition[] | undefined) => void;
  showAvailabilityForActivity?: string;
  constLabel?: string;
  styles?: SelectStylesProps;
};

const AttributeMultiSelection = ({
  id,
  className,
  eventAttributes,
  objectAttributes,
  includeNoneOption = true,
  selected,
  onChange,
  showAvailabilityForActivity,
  constLabel = "(constant value per event)",
  styles,
  isClearable,
  placeholder,
  ...props
}: AttributeMultiSelectionProps) => {
  const ocel = useOceanStore.use.ocel();
  const attributeUnits = useOceanStore.use.attributeUnits();
  if (!ocel) return false;

  const noneItem = makeItem(
    undefined,
    ocel,
    attributeUnits,
    constLabel,
    showAvailabilityForActivity,
  );
  const items = [
    ...(includeNoneOption ? [noneItem] : []),
    ...eventAttributes.map((ea) =>
      makeItem(
        ea,
        ocel,
        attributeUnits,
        constLabel,
        showAvailabilityForActivity,
      ),
    ),
    ...objectAttributes.map((oa) =>
      makeItem(
        oa,
        ocel,
        attributeUnits,
        constLabel,
        showAvailabilityForActivity,
      ),
    ),
  ];
  const selectedStringified = selected?.map((s) => JSON.stringify(s));

  // const { attrTypeDescription, AttrTypeIcon } = useMemo(() => attributes.map(attr => getAttributeNameAndIcon(attr)), [ocel, attributes])

  return (
    <Select<AttributeItem, true>
      isMulti
      inputId={id}
      className={combineClassNames("basic-single", className)}
      classNamePrefix="select"
      onChange={(items, actionMeta) => {
        if (onChange) {
          if (
            actionMeta.action == "select-option" &&
            !actionMeta.option?.attributeSource
          ) {
            // select "const" - clear all
            console.log(`select "const" - clear all`);
            onChange([]);
          } else {
            console.log(`selected ${items.length} items`);
            const attrSources =
              (items
                ?.map((it) => it.attributeSource)
                .filter((s) => s) as AttributeSourceDefinition[]) ?? [];
            onChange(attrSources);
          }
        }
      }}
      formatOptionLabel={(
        item: AttributeItem,
        {
          context,
          inputValue,
          selectValue,
        }: FormatOptionLabelMeta<AttributeItem>,
      ) =>
        !!item.attribute ? (
          <AttributeName attr={item.attribute} label={item.label} />
        ) : (
          <span className="d-inline-flex align-items-center gap-1">
            <FaEquals className="text-secondary" />
            {item.label}
          </span>
        )
      }
      // components={{
      //   ValueContainer: CustomValueContainer
      // }}
      options={items}
      isOptionDisabled={(item, selectValue) => {
        // Disable "const" option when some attribute is selected
        // if (item.value == "const" && selectValue.some(it => it.value != "const")) return true
        // Disable attributes when "const" is selected
        // if (item.value != "const" && selectValue.some(it => it.value == "const")) return true
        return false;
      }}
      value={[
        ...items.filter(
          (it) =>
            it.attributeSource &&
            selectedStringified?.includes(JSON.stringify(it.attributeSource)),
        ),
        ...(includeNoneOption && !!selected?.length ? [noneItem] : []),
      ]}
      placeholder={placeholder ?? "Attribute"}
      isClearable={isClearable}
      styles={buildSelectStyles(styles)}
    />
  );
};

export default AttributeMultiSelection;
