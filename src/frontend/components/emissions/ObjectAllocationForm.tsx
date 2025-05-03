/* eslint-disable react-hooks/exhaustive-deps */
import { useOceanStore } from "@/src/zustand";
import { Form, Row, Col, Button } from "react-bootstrap";
import Select from "react-select";
import ObjectTypeSelection from "../ocel/selections/ObjectTypeSelection";
import { useEffect, useMemo, useState } from "react";
import { FaCheck } from "react-icons/fa6";
import { Api } from "@/src/openapi";
import { ObjectAllocationConfig } from "@/src/api/generated";
import { ApiWrapper } from "@/src/api.types";
import { removeNull } from "@/src/util";
import _ from "lodash";
import { buildSelectStyles } from "../util";

export type Rule = "AllTargets" | "ParticipatingTargets" | "ClosestTargets";
type RuleOption = { label: Rule; value: Rule };
export type GraphMode = "HU" | "full";

const ObjectAllocationForm: React.FC<{
  apiWrapper: ApiWrapper<any>;
}> = ({ apiWrapper }) => {
  const session = useOceanStore.use.session();
  const ocel = useOceanStore.use.ocel();
  const { objectAllocationConfig, setObjectAllocationConfig } =
    useOceanStore.useState.objectAllocationConfig();
  const objectEmissionResults = useOceanStore.use.objectEmissionResults();

  const rules: Rule[] = [
    "AllTargets",
    "ParticipatingTargets",
    "ClosestTargets",
  ];
  const ruleOptions = Object.fromEntries(
    rules.map((r) => [r, { label: r, value: r }]),
  );
  const [ruleOption, setRuleOption] = useState(ruleOptions["ClosestTargets"]);

  const rule = useMemo(() => ruleOption.value, [ruleOption]);
  const [targetObjectType, setTargetObjectType] = useState<string>();
  const [graphMode, setGraphMode] = useState<GraphMode>("HU");
  const [removeOTLoops, setRemoveOTLoops] = useState<boolean>(false);
  const [maxDistance, setMaxDistance] = useState<number>(-1);

  useEffect(() => {
    const buildConfig = () => {
      if (!targetObjectType) return null;
      const base = {
        targetObjectTypes: [targetObjectType],
        rule: rule,
      };
      if (rule == "AllTargets" || rule == "ParticipatingTargets") return base;
      if (rule == "ClosestTargets")
        return {
          ...base,
          graphMode: graphMode,
          removeOtypeLoops: removeOTLoops,
          maxDistance: maxDistance,
        };
      return null;
    };
    setObjectAllocationConfig(buildConfig());
  }, [targetObjectType, rule, graphMode, removeOTLoops, maxDistance]);

  const hasBeenApplied = useMemo(() => {
    if (!objectAllocationConfig) return false;
    return _.isEqual(
      removeNull(objectEmissionResults?.objectAllocationConfig),
      removeNull(objectAllocationConfig),
    );
  }, [objectEmissionResults, objectAllocationConfig]);

  const triggerObjectAllocation = async () => {
    if (!objectAllocationConfig || !session) return false;
    // const res = await Api.objectAllocationObjectAllocationPost({
    //   oceanSessionId: session,
    //   requestBody: objectAllocationConfig
    // })
    const data = await apiWrapper(
      () =>
        Api.objectAllocationObjectAllocationPost({
          oceanSessionId: session,
          requestBody: {
            objectAllocationConfig: objectAllocationConfig,
          },
        }),
      {
        loadingText: "Allocating emissions",
        successTitle: "Allocated emissions to objects",
        updateAppState: true,
      },
    );
  };

  if (!ocel) return false;

  return (
    <Form>
      <Form.Group as={Row} className="mb-2" controlId="objAllocForm-targets">
        <Form.Label column sm={2}>
          Target objects
        </Form.Label>
        <Col sm={10} className="d-flex flex-column justify-content-around">
          <ObjectTypeSelection
            objectTypes={ocel.objectTypes}
            id="objAllocForm-targets"
            selected={targetObjectType}
            onChange={(ot) => setTargetObjectType(ot ?? undefined)}
          />
        </Col>
      </Form.Group>
      <Form.Group as={Row} className="mb-2" controlId="objAllocForm-rule">
        <Form.Label column sm={2}>
          Rule
        </Form.Label>
        <Col sm={10}>
          <Select<RuleOption>
            options={Object.values(ruleOptions)}
            value={ruleOption}
            onChange={(it) => {
              if (it) setRuleOption(it);
            }}
            inputId="objAllocForm-rule"
            styles={buildSelectStyles({})}
          />
        </Col>
      </Form.Group>
      {rule == "ClosestTargets" && (
        <>
          <Form.Group as={Row} className="mb-2">
            <Form.Label column sm={2}>
              Options
            </Form.Label>
            <Col sm={10}>
              <Form.Check
                type="checkbox"
                id="object-allocation-options-graph-mode"
                label="Pass emissions via resources"
                checked={graphMode == "full"}
                onChange={(e) => setGraphMode(e.target.checked ? "full" : "HU")}
              />
              <Form.Check
                type="checkbox"
                id="object-allocation-options-rm-ot-selfloops"
                label="Pass emissions between objects of same type"
                checked={!removeOTLoops}
                onChange={(e) => setRemoveOTLoops(!e.target.checked)}
              />
            </Col>
          </Form.Group>
        </>
      )}
      {/* <p>new: {JSON.stringify(removeNull(objectAllocationConfig))}</p>
      <p>applied: {JSON.stringify(removeNull(objectEmissionResults?.objectAllocationConfig))}</p>
      <p>equal: {hasBeenApplied ? "true" : "false"}</p> */}
      <Form.Group as={Row} className="mb-2">
        <Col sm={2}></Col>
        <Col sm={10}>
          <Button
            variant="primary"
            disabled={!objectAllocationConfig || !session || hasBeenApplied}
            onClick={triggerObjectAllocation}
          >
            Apply
          </Button>
          {hasBeenApplied && <FaCheck className="ms-2 text-ocean-green" />}
        </Col>
      </Form.Group>
    </Form>
  );
};
export default ObjectAllocationForm;
