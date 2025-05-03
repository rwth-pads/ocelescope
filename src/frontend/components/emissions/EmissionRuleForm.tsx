/* eslint-disable react-hooks/exhaustive-deps */
import { SelectSkeleton, WithTooltip } from "@/components/common/misc";
import {
  ClimatiqEmissionFactorDetails,
  EventAttributeDefinition,
  ObjectAttributeDefinition,
} from "@/src/api/generated";
import { ClimatiqEmissionFactor } from "@/src/climatiq.types";
import {
  EditingEmissionFactor,
  EditingEmissionRule,
} from "@/src/emissions.types";
import { QualifiedObjectAttributeDefinition } from "@/src/ocel.types";
import { getActivityObjectTypes, getQualifiers } from "@/src/ocel.util";
import { Api } from "@/src/openapi";
import {
  GRAM,
  KILOGRAM,
  TONNE,
  unitTypeData,
  UnitTypeDim,
} from "@/src/units.types";
import { useOceanStore } from "@/src/zustand";
import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { Badge, ButtonGroup, Col, Row, ToggleButton } from "react-bootstrap";
import Form from "react-bootstrap/Form";
import {
  FaArrowUpRightFromSquare,
  FaBan,
  FaFilter,
  FaUserPen,
} from "react-icons/fa6";
import { ClimatiqLogoIcon } from "../climatiq/ClimatiqConfigModal";
import ClimatiqFactorInput, {
  ClimatiqUnitTypeFilterBadge,
} from "../climatiq/ClimatiqFactorInput";
import ActivitySelection from "../ocel/selections/ActivitySelection";
import AttributeMultiSelection, {
  AttributeSourceDefinition,
} from "../ocel/selections/AttributeMultiSelection";
import ObjectTypeSelection from "../ocel/selections/ObjectTypeSelection";
import QualifierSelection from "../ocel/selections/QualifierSelection";
import QuantityInput from "../QuantityInput";

type ClimatiqEmissionFactorSearchConfig = {
  isActive: boolean;
  unitTypeFilter?: string[];
};

export type EmissionRuleFormProps = {
  index: number;
  rule: EditingEmissionRule;
  setRule: (rule: EditingEmissionRule) => void;
  getId: (field: string) => string;
};

const EmissionRuleForm: React.FC<EmissionRuleFormProps> = ({
  index,
  rule,
  setRule,
  getId,
}) => {
  const session = useOceanStore.use.session();
  const ocel = useOceanStore.use.ocel();

  const [availableEventAttributes, setAvailableEventAttributes] = useState<
    EventAttributeDefinition[] | undefined
  >();
  const [availableObjectAttributes, setAvailableObjectAttributes] = useState<
    QualifiedObjectAttributeDefinition[] | undefined
  >();
  const [isAvailableAttributesLoading, setIsAvailableAttributesLoading] =
    useState(false);

  const climatiqConfig = useOceanStore.use.climatiqConfig();

  const [climatiqSearchConfig, setClimatiqSearchConfig] =
    useState<ClimatiqEmissionFactorSearchConfig>({
      isActive: false,
    });
  useEffect(() => {
    setClimatiqSearchConfig({
      ...climatiqSearchConfig,
      isActive: !!climatiqConfig.apiKey,
    });
  }, [climatiqConfig]);

  /** The set of climatiq unit types (Number, Money, WeightOverDistance, ...) matching the dimensionality of the selected attributes */
  const matchingInputClimatiqUnitTypes = useMemo(() => {
    const dims: UnitTypeDim[] =
      rule.factor?.attributes?.map((attr) => attr.attribute.unit?.dim ?? {}) ??
      [];
    const dimNames: string[] = _.uniq(dims.flatMap((dim) => Object.keys(dim)));
    // compute sum of exponents
    const productDim: UnitTypeDim = Object.fromEntries(
      dimNames
        .map((dimName) => [
          dimName,
          _(dims)
            .map((dim) => _.get(dim, dimName, 0))
            .sum(),
        ])
        .filter(([dimName, exp]) => exp != 0),
    );

    console.log("productDim", productDim);

    return _(unitTypeData)
      .filter(({ dim }) => _.isEqual(dim, productDim))
      .map("climatiqName")
      .filter()
      .value() as string[];
  }, [rule]);

  useEffect(() => {
    console.log("Matching unit type(s):", matchingInputClimatiqUnitTypes);
    setClimatiqSearchConfig((cnf) => ({
      ...cnf,
      unitTypeFilter: matchingInputClimatiqUnitTypes,
    }));
  }, [matchingInputClimatiqUnitTypes]);

  useEffect(() => {
    async function effect() {
      // get available attributes
      if (!session) return;
      if (!rule.activity) return;
      if (rule.type == "E2OEmissionRule") {
        if (!rule.objectType) return;
      }
      setAvailableEventAttributes(undefined);
      setAvailableObjectAttributes(undefined);
      setIsAvailableAttributesLoading(true);
      const res =
        await Api.getAvailableAttributesForEmissionRuleGetAvailableAttributesPost(
          {
            oceanSessionId: session,
            requestBody: {
              type: rule.type,
              activity: rule.activity,
              ...(rule.type == "E2OEmissionRule"
                ? {
                    objectType: rule.objectType,
                    qualifier: rule.qualifier,
                  }
                : {}),
              numericOnly: true,
            },
          },
        );
      // Save available attributes to cache
      setAvailableEventAttributes(
        _.sortBy(res.availableEventAttributes, (attribute) => [attribute.name]),
      );
      setAvailableObjectAttributes(
        _.sortBy(
          res.availableObjectAttributes.map((t) => {
            const [ot, q, attr] = t as unknown as [
              string,
              string | null,
              ObjectAttributeDefinition,
            ];
            return {
              objectType: ot,
              qualifier: q,
              attribute: attr,
            };
          }),
          ({ objectType, qualifier, attribute }) => [
            attribute.name,
            objectType,
            !!qualifier,
            qualifier,
          ],
        ),
      );
      setIsAvailableAttributesLoading(false);
    }
    effect();
  }, [rule]);

  if (!ocel) {
    return;
  }
  return (
    <>
      {/* ----- Rule level ----------------------------------------------------------- */}
      <Form.Group as={Row} className="mb-2">
        <Form.Label column sm={2} className="d-none d-sm-block">
          Type
        </Form.Label>
        <Col sm={10} className="d-flex flex-column justify-content-around">
          <Form.Check
            type="radio"
            label={`Event-level emission rule`}
            checked={rule.type == "EventEmissionRule"}
            onChange={(e) => {
              const prev =
                rule.type == "EventEmissionRule"
                  ? rule
                  : (() => {
                      const { objectType, qualifier, ...rest } = rule;
                      return rest;
                    })();
              setRule({ ...prev, type: "EventEmissionRule" });
            }}
            id={getId("type-EventEmissionRule")}
          />
          <Form.Check
            type="radio"
            label={`Event-to-Object-level emission rule`}
            checked={rule.type == "E2OEmissionRule"}
            onChange={(e) => setRule({ ...rule, type: "E2OEmissionRule" })}
            id={getId("type-E2OEmissionRule")}
          />
        </Col>
      </Form.Group>

      {/* ----- Activity selection ----------------------------------------------------------- */}
      <Form.Group as={Row} className="mb-2" controlId={getId("Activity")}>
        <Form.Label column sm={2} className="d-none d-sm-block">
          Activity
        </Form.Label>
        <Col sm={10} className="d-flex flex-column justify-content-around">
          <ActivitySelection
            id={getId("Activity")}
            activities={ocel.activities}
            selected={rule.activity}
            // Changing activity overrides rest of rule
            onChange={(act) =>
              setRule({
                index: rule.index,
                type: rule.type,
                activity: act,
              })
            }
          />
        </Col>
      </Form.Group>

      {rule.activity && rule.type == "E2OEmissionRule" && (
        <>
          {/* ----- Object type ----------------------------------------------------------- */}
          <Form.Group as={Row} className="mb-2" controlId={getId("ObjectType")}>
            <Form.Label column sm={2} className="d-none d-sm-block">
              Object type
            </Form.Label>
            <Col sm={10} className="d-flex flex-column justify-content-around">
              <ObjectTypeSelection
                id={getId("ObjectType")}
                objectTypes={getActivityObjectTypes(ocel, rule.activity)}
                selected={rule.objectType}
                // Changing object type overrides rest of rule
                onChange={(ot) =>
                  setRule({
                    index: rule.index,
                    type: rule.type,
                    activity: rule.activity,
                    objectType: ot ?? undefined,
                  })
                }
              />
            </Col>
          </Form.Group>
          {/* ----- Qualifier ----------------------------------------------------------- */}
          {rule.objectType && (
            <>
              <Form.Group
                as={Row}
                className="mb-2"
                controlId={getId("Qualifier")}
              >
                <Form.Label column sm={2} className="d-none d-sm-block">
                  Qualifier
                </Form.Label>
                <Col
                  sm={10}
                  className="d-flex flex-column justify-content-around"
                >
                  <QualifierSelection
                    id={getId("Qualifier")}
                    qualifiers={getQualifiers(ocel, {
                      activity: rule.activity,
                      objectType: rule.objectType,
                    })}
                    selected={rule.qualifier ?? null}
                    addUndefinedOption={true}
                    selectWhenUnique={true}
                    disableWhenUnique={true}
                    // Changing qualifier overrides rest of rule
                    onChange={(q) =>
                      setRule({
                        index: rule.index,
                        type: rule.type,
                        activity: rule.activity,
                        objectType: rule.objectType,
                        qualifier: q,
                      })
                    }
                  />
                </Col>
              </Form.Group>
            </>
          )}
        </>
      )}

      {rule.activity && (rule.type != "E2OEmissionRule" || rule.objectType) && (
        <>
          {/* ----- Attribute multi-selector ----------------------------------------------------------- */}
          <Row>
            <Col>
              <Form.Group
                as={Row}
                className="mb-2"
                controlId={getId("EventAttribute")}
              >
                <Form.Label column md={2}>
                  Proportional to
                </Form.Label>
                <Col md={10}>
                  {!isAvailableAttributesLoading && (
                    <AttributeMultiSelection
                      onChange={(attrs) => {
                        setRule({
                          ...rule,
                          factor: {
                            ...rule.factor,
                            attributes:
                              attrs?.map((s) => {
                                const def = "attribute" in s ? s.attribute : s;
                                if (def.target == "event")
                                  return { qualifier: null, attribute: def };
                                if (def.target == "object" && "qualifier" in s)
                                  return {
                                    qualifier: s.qualifier,
                                    attribute: def,
                                  };
                                throw Error("Unknown attribute type");
                              }) ?? [],
                          },
                        });
                      }}
                      eventAttributes={availableEventAttributes ?? []}
                      objectAttributes={availableObjectAttributes ?? []}
                      isDisabled={
                        !availableEventAttributes?.length &&
                        !availableObjectAttributes?.length
                      }
                      selected={
                        rule.factor
                          ? getSelectedAttributeSources(rule.factor)
                          : []
                      }
                      isClearable={true}
                      aria-describedby={`multiSelectHelpText-${index}`}
                      constLabel={"none (const.)"}
                    />
                  )}
                  {isAvailableAttributesLoading && <SelectSkeleton />}
                  <Form.Text id={`multiSelectHelpText-${index}`}>
                    Either use the emission factor as a constant value, or
                    select one or multiple attributes. When selecting multiple,
                    their values and the emission factor get multiplied.
                  </Form.Text>
                </Col>
              </Form.Group>
            </Col>
          </Row>

          {/* ----- Emission factor input ----------------------------------------------------------- */}
          <Row>
            <Col>
              <Form.Group
                as={Row}
                className="mb-2"
                controlId={getId("Quantity")}
              >
                <Form.Label column md={2}>
                  Emission factor
                  {rule.factor?.source == "climatiq" && !!rule.factor.data && (
                    <a
                      href={`https://www.climatiq.io/data/emission-factor/${rule.factor.data.id}`}
                      target="_blank"
                      className="ms-2"
                      title={rule.factor.data.name}
                    >
                      <FaArrowUpRightFromSquare />
                    </a>
                  )}
                </Form.Label>
                <Col
                  md={10}
                  className="d-flex flex-column justify-content-around gap-2"
                >
                  <div className="d-flex gap-2">
                    <ButtonGroup>
                      <ToggleButton
                        id={getId("radio-emission-rule-source-local")}
                        type="radio"
                        variant="light"
                        name={getId("radio-emission-rule-source")}
                        value={"local"}
                        checked={!rule.factor || rule.factor.source == "local"}
                        onChange={(e) =>
                          setRule({
                            ...rule,
                            factor: {
                              source: "local",
                              value: { value: 1, unit: KILOGRAM },
                              attributes: rule.factor?.attributes ?? [],
                            },
                          })
                        }
                      >
                        <WithTooltip tooltip="Manual emission factor input">
                          <FaUserPen />
                        </WithTooltip>
                      </ToggleButton>
                      <ToggleButton
                        id={getId("radio-emission-rule-source-climatiq")}
                        className="d-flex align-items-center"
                        type="radio"
                        variant="light"
                        name={getId("radio-emission-rule-source")}
                        value={"climatiq"}
                        disabled={!climatiqSearchConfig.isActive}
                        checked={rule.factor?.source == "climatiq"}
                        onChange={(e) =>
                          setRule({
                            ...rule,
                            factor: {
                              source: "climatiq",
                              data: undefined,
                              attributes: rule.factor?.attributes ?? [],
                            },
                          })
                        }
                      >
                        <WithTooltip
                          tooltip={
                            climatiqSearchConfig.isActive
                              ? "Climatiq emission factor search"
                              : "Climatiq emission factor search (first enter API key)"
                          }
                        >
                          <ClimatiqLogoIcon
                            // disabled={!climatiqSearchConfig.isActive}
                            variant="color"
                            style={{ pointerEvents: "all" }}
                          />
                        </WithTooltip>
                      </ToggleButton>
                    </ButtonGroup>

                    <div className="d-flex align-items-center gap-1 w-100">
                      {/* Manual emission factor input */}
                      {(!rule.factor || rule.factor.source == "local") && (
                        <QuantityInput
                          className="w-100"
                          units={[GRAM, KILOGRAM, TONNE]}
                          value={
                            rule.factor?.value ?? { unit: KILOGRAM, value: 1 }
                          }
                          onChange={(x) => {
                            let factor: EditingEmissionFactor | undefined =
                              undefined;
                            if (rule.factor) {
                              factor = {
                                attributes: [],
                                ...rule.factor,
                                source: "local",
                                value: x,
                              };
                            } else if (x) {
                              factor = {
                                source: "local",
                                value: x,
                                attributes: [],
                              };
                            }
                            setRule({
                              ...rule,
                              factor: factor,
                            });
                          }}
                        />
                      )}

                      {/* Climatiq search filters */}
                      {rule.factor?.source == "climatiq" &&
                        climatiqSearchConfig.unitTypeFilter !== undefined && (
                          <>
                            <FaFilter className="text-secondary me-2" />
                            {_.orderBy(
                              climatiqSearchConfig.unitTypeFilter,
                              (ut) => ut.length,
                            ).map((ut, i) => (
                              <ClimatiqUnitTypeFilterBadge
                                key={i}
                                unitType={ut}
                                onRemove={() =>
                                  setClimatiqSearchConfig((cnf) => ({
                                    ...cnf,
                                    unitTypeFilter: cnf.unitTypeFilter?.filter(
                                      (ut1) => ut1 != ut,
                                    ),
                                  }))
                                }
                              />
                            ))}
                            {climatiqSearchConfig.unitTypeFilter.length ==
                              0 && (
                              <Badge
                                bg="danger"
                                text="light"
                                className="d-flex align-items-center gap-1"
                              >
                                <FaBan />
                                Invalid unit type
                              </Badge>
                            )}
                          </>
                        )}
                    </div>
                  </div>

                  {/* Climatiq emission factor search */}
                  {rule.factor?.source == "climatiq" && (
                    <div>
                      <ClimatiqFactorInput
                        filterUnitTypes={climatiqSearchConfig.unitTypeFilter}
                        selected={
                          rule.factor.data as ClimatiqEmissionFactor | undefined
                        }
                        onChange={(climatiqFactor) => {
                          let factor: EditingEmissionFactor | undefined =
                            undefined;
                          const newClimatiqFactor = climatiqFactor as unknown as
                            | ClimatiqEmissionFactorDetails
                            | undefined;
                          if (rule.factor) {
                            factor = {
                              attributes: [],
                              ...rule.factor,
                              source: "climatiq",
                              data: newClimatiqFactor,
                            };
                          } else if (climatiqFactor) {
                            factor = {
                              source: "climatiq",
                              data: newClimatiqFactor,
                              attributes: [],
                            };
                          }
                          setRule({
                            ...rule,
                            factor: factor,
                          });
                        }}
                      />
                    </div>
                  )}
                </Col>
              </Form.Group>
            </Col>
          </Row>
        </>
      )}
    </>
  );
};
export default EmissionRuleForm;

export function getSelectedAttributeSources(
  ef: EditingEmissionFactor,
): AttributeSourceDefinition[] {
  return (ef.attributes ?? []).map(({ qualifier, attribute }) => {
    if (attribute.target == "event") return attribute;
    return {
      objectType: attribute.objectType,
      qualifier: qualifier ?? null,
      attribute: attribute,
    };
  });
}
