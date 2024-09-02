/* eslint-disable react-hooks/exhaustive-deps */
// pages/emissions.tsx
"use client";
/**
 * Style changes for thesis screenshot:
 * - decrease h3 font-size (20px) -- now changed in code (use Heading (h4))
 * - remove Select padding -- now changed in code
 * - delete Attribute select help text
 * - decrease accordion padding (.5rem 1rem)
 * - remove Form.Label margin
 * - decrease emission rule name font size (.8em)
 */

import React, { Key, useCallback, useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';

import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import { FaCheck, FaCircle, FaCirclePlus, FaCloud, FaDiagramProject, FaListCheck, FaShoePrints } from 'react-icons/fa6';
import { PageProps } from './_app';

import { ButtonToolbar, Heading, IconButton, ObjectTypeIcon } from '@/components/misc';

import { useConfirmation } from '@/components/common/Confirmation';
import EmissionRuleFormWrapper from '@/components/emissions/EmissionRuleFormWrapper';
import ObjectAllocationForm from '@/components/emissions/ObjectAllocationForm';
import Histogram from '@/components/Histogram';
import Qty from '@/components/Quantity';
import { E2OEmissionRule_Input, EventEmissionRule_Input } from '@/src/api/generated';
import { EditingEmissionRule, EditingEventEmissionRule, EmissionRule, isEmissionRuleEmpty } from '@/src/emissions.types';
import { Api } from '@/src/openapi';
import { useOceanStore } from '@/src/zustand';
import Accordion, { AccordionProps } from 'react-bootstrap/Accordion';
import { Card, Stack } from 'react-bootstrap';

const EmissionsPage: React.FC<PageProps> = ({
  apiWrapper
}) => {
  const confirm = useConfirmation()
  const session = useOceanStore.use.session()
  const ocel = useOceanStore.use.ocel()
  const apiState = useOceanStore.use.apiState()
  const objectTypeColors = useOceanStore.use.objectTypeColors()
  const objectAllocationConfig = useOceanStore.use.objectAllocationConfig()
  const emissions = useOceanStore.use.emissions()
  const objectEmissionResults = useOceanStore.use.objectEmissionResults()

  const { emissionRules, setEmissionRules } = useOceanStore.useState.emissionRules()
  const [editingEmissionRules, setEditingEmissionRules] = useState<EditingEmissionRule[]>(emissionRules)

  // Save emission rules to appState zustand every time the non-empty rules have changed.
  const emissionRulesStringified = JSON.stringify(emissionRules)
  useEffect(() => {
    const nextEmissionRules = editingEmissionRules.filter(er => !isEmissionRuleEmpty(er))
    if (JSON.stringify(nextEmissionRules) != emissionRulesStringified) {
      setEmissionRules(nextEmissionRules as EmissionRule[])
    }
  }, [editingEmissionRules])

  const nextEmissionRuleIndex = useMemo(() => {
    if (!editingEmissionRules.length)
      return 0
    return Math.max(...editingEmissionRules.map(eer => eer.index)) + 1
  }, [editingEmissionRules])

  const handleApplyEmissionRules = useCallback(async () => {
    if (!session || !ocel) {
      return false
    }
    apiWrapper(() => Api.computeEmissionsComputeEmissionsPost({
      oceanSessionId: session,
      requestBody: {
        rules: emissionRules.filter(ec => !isEmissionRuleEmpty(ec)) as unknown as (EventEmissionRule_Input | E2OEmissionRule_Input)[]
      }
    }), {
      loadingText: "Computing emissions",
      successTitle: "Computed emissions",
      isComputeEmissions: true,
      onCompletion: data => {
        // collapse all rule forms
        setExpandedRule(-1)
      }
    })

  }, [emissionRules, session, ocel])

  // Re-compute emissions on page load if API state has changed
  // TODO fix this (pexs had been discovered with rules already set, then changing to this tab.)
  // useEffect(() => {
  //   if (emissions && emissions.apiState != apiState) {
  //     handleApplyEmissionRules()
  //   }
  // }, [session])

  const [accordionState, setAccordionState] = useState<AccordionProps & { key: number }>({
    key: 0,  // key is changed to force rerender
    defaultActiveKey: undefined
  })

  const setExpandedRule = (index: number) => {
    setAccordionState(({ key }) => ({
      key: key + 1,
      defaultActiveKey: index.toString()
    }))
  }

  if (!ocel || !session) return false

  return (<>
    <Row>
      {/* EMISSION RULES */}
      <Col xl={6} className="mb-3">
        <Heading><FaListCheck /> Emission Rules</Heading>
        {!!editingEmissionRules.length && (<>
          <Accordion
            // defaultActiveKey={expandedRuleForms.length != ? _.range(editingEmissionRules.length).filter(i => expandedRuleForms[i]).map(i => i.toString()) : undefined}
            alwaysOpen
            className="mb-3"
            {...accordionState}
          >
            {editingEmissionRules.map((rule, i) => (
              <EmissionRuleFormWrapper
                key={i}
                initialRule={rule}
                saveRule={async (er: EditingEmissionRule | null, prev?: EditingEmissionRule) => {
                  if (er === null) {
                    // remove rule
                    if (!prev || isEmissionRuleEmpty(prev) || await confirm("Dou you want to delete the emission rule?", {
                      confirmText: "Delete",
                      confirmButtonVariant: "danger",
                      title: "Delete emission rule",
                    })) {
                      setEditingEmissionRules(ers => [...ers.slice(0, i), ...ers.slice(i + 1)])
                    }
                  } else {
                    // edit rule
                    setEditingEmissionRules(ers => [...ers.slice(0, i), er, ...ers.slice(i + 1)])
                  }
                }}
              />
            ))}
          </Accordion>
        </>)}

        <ButtonToolbar>
          <IconButton variant="light" label="Add rule" onClick={() => {
            // add new empty rule at end of list
            const index = nextEmissionRuleIndex
            setEditingEmissionRules(ers => [
              ...ers,
              { index: index, type: "EventEmissionRule" }
            ])
            setExpandedRule(index)
          }}><FaCirclePlus /></IconButton>
          {!!editingEmissionRules.length && (
            <Button
              variant="primary"
              // disabled={editingEmissionRules.filter(ec => !isEmissionRuleEmpty(ec)).length == 0}
              disabled={editingEmissionRules.length == 0 || editingEmissionRules.some(ec => isEmissionRuleEmpty(ec))}
              onClick={() => handleApplyEmissionRules()}
            >
              Compute emissions
            </Button>
          )}
          {(!!emissions?.state.hasRuleBasedEmissions) && (
            <div className="d-flex align-items-center gap-1 text-ocean-green">
              <FaCheck />
              <Qty value={emissions.overallRuleBasedEmissions} unit={emissions.unit} />
            </div>
          )}
        </ButtonToolbar>
      </Col>

      {/* OVERALL EMISSIONS */}
      {!!emissions?.state.hasEmissions && (
        <Col md={6} className="mb-3">
          <Heading><FaCloud /> Overview</Heading>
          <Card>
            <Card.Body>
              <Stack direction="horizontal">
                <div className="w-50">Imported</div>
                <div><Qty value={emissions.overallImportedEmissions} unit={emissions.unit} /></div>
              </Stack>
              <Stack direction="horizontal">
                <div className="w-50">Rule-based</div>
                <div><Qty value={emissions.overallRuleBasedEmissions} unit={emissions.unit} /></div>
              </Stack>
              <hr />
              <Stack direction="horizontal">
                <div className="w-50">Total</div>
                <div><Qty value={emissions.overallEmissions} unit={emissions.unit} /></div>
              </Stack>
            </Card.Body>
          </Card>
        </Col>
      )}
    </Row>

    {!!emissions?.state.hasEmissions && (
      <Row>
        {/* OBJECT ALLOCATION */}
        <Col xl={6} className="mb-3">
          <Heading><FaDiagramProject /> Object Allocation</Heading>
          <ObjectAllocationForm apiWrapper={apiWrapper} />
        </Col>

        {/* OBJECT EMISSIONS HISTOGRAM */}
        {!!(emissions.state.hasObjectEmissions && objectEmissionResults) && (
          <Col xl={6} className="mb-3">
            <Heading><FaShoePrints /> Object Emissions</Heading>
            <Histogram
              aspectRatio={2}
              minHeight={150}
              maxHeight={300}
              data={Object.values(objectEmissionResults.objectEmissions)}
              unit={emissions?.unit}
              log={false}
              // log="y"
              xLabel="CO2e per object"
              yLabel="Number of objects"
              itemCountName={{ singular: "object", plural: "objects" }}
              color={(objectEmissionResults.objectAllocationConfig.targetObjectTypes.length == 1 ? objectTypeColors?.[objectEmissionResults.objectAllocationConfig.targetObjectTypes[0]]?.hex() : undefined) ?? undefined}
            />
          </Col>
        )}

      </Row>
    )}
  </>)

}

export default EmissionsPage
