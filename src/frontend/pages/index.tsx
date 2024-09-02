/* eslint-disable react-hooks/exhaustive-deps */
// pages/index.tsx
"use client";

import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import { FaArrowsRotate, FaCircleInfo, FaFileLines } from 'react-icons/fa6';
import { PageProps } from './_app';

import { defaultOcelIcons, isEventAttribute, isObjectAttribute } from '@/src/ocel.types';
// import dotString from "@/public/ocpn";

import { AggMode, aggModes, AggModeSelector, AggProgressBar } from "@/components/common/AggMode";
import { useToast } from '@/components/common/Toast';
import { useLoadingText } from '@/components/layout/Layout';
import { ActivityWithIcon, ButtonToolbar, IconButton, ObjectTypeWithIcon, ParagraphLinks, SkeletonIcon } from '@/components/misc';
import ObjectTypeManager from '@/components/ObjectTypeManager';
import AttributeManager from '@/components/ocel/AttributeManager';
import { AttrValue } from '@/components/ocel/ocelMisc';
import OcelOverview from '@/components/ocel/OcelOverview';
import PetriNet from '@/components/PetriNet';
import { ProgressBar } from '@/components/ProgressBar';
import { DefaultOCEL, OcelEvent, OcelObject } from '@/src/api/generated';
import { processOcelUpload as processOcelFile } from '@/src/ocel.util';
import { Api } from "@/src/openapi";
import { useHandlingUnitsAndResources, useOceanStore } from '@/src/zustand';
import chroma from 'chroma-js';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Alert } from 'react-bootstrap';


const StartPage: React.FC<PageProps> = ({
  apiWrapper
}) => {
  const session = useOceanStore.use.session()
  const ocel = useOceanStore.use.ocel()
  const ocpn = useOceanStore.use.ocpn()
  const emissions = useOceanStore.use.emissions()

  const addToast = useToast()
  const setLoadingText = useLoadingText()
  const setErrorMessage = useOceanStore.use.setErrorMessage()

  const { objectTypeColors, setObjectTypeColors } = useOceanStore.useState.objectTypeColors()
  const { objectTypeClasses, setObjectTypeClasses } = useOceanStore.useState.objectTypeClasses()
  const { attributeUnits, setAttributeUnits } = useOceanStore.useState.attributeUnits()
  const { handlingUnits, resources } = useOceanStore(useHandlingUnitsAndResources)

  // ----- GENERAL ---------------------------------------------------------------------
  const [selectedFile, setSelectedFile] = useState<File>()

  const [objectSample, setObjectSample] = useState<OcelObject[]>()
  const objectSampleAttrs = useMemo(() => {
    if (!objectSample)
      return undefined
    return _.uniq(objectSample?.map(obj => Object.keys(obj.attr)).flat(1)).toSorted()
  }, [objectSample])

  const [eventSample, setEventSample] = useState<OcelEvent[]>()
  const eventSampleAttrs = useMemo(() => {
    if (!eventSample)
      return undefined
    return _.uniq(eventSample?.map(ev => Object.keys(ev.attr)).flat(1)).toSorted()
  }, [eventSample])

  // ----- PETRI NET DISCOVERY ---------------------------------------------------------------------
  const [showOcpn, setShowOcpn] = useState<boolean>(false)

  useEffect(() => {
    // Re-format the OCPN, except if an objectType in a visible OCPN is now missing a color
    // if (ocel && ocpn && objectTypeColors && ocpnDotStringTemplate) {
    if (ocel && ocpn && objectTypeColors) {
      if (!ocpn.objectTypes.every(ot => ot in objectTypeColors)) {
        return
      }
      setShowOcpn(false)
      setTimeout(() => setShowOcpn(true), 500)
    } else {
      setShowOcpn(false)
    }
  }, [ocel, ocpn, objectTypeColors])

  // ----- MISC ---------------------------------------------------------------------
  useEffect(() => {
    setLoadingText(null)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      return
    }
    const { ocelBlob, ocelFileName, appState, error } = await processOcelFile(selectedFile)
    if (error || !ocelBlob || !ocelFileName) {
      setErrorMessage("OCEL Upload failed: " + (error ?? "Internal error"))
      return
    }

    // *import* request
    // appState from file is passed to server in subsequent *update* request
    const data = await apiWrapper(() => Api.importOcelImportPost({
      formData: {
        file: ocelBlob
      },
      name: ocelFileName
    }), {
      loadingText: "Uploading Event log",
      successTitle: "Upload successful",
      isImportOrLoad: true,
      importedAppState: appState
    })

  }, [selectedFile])

  const handleSampleEvents = useCallback(async () => {
    if (!session) return false
    const data = await apiWrapper(() => Api.sampleEventsSampleEventsGet({
      oceanSessionId: session
    }), {
      loadingText: "Sampling events",
      successTitle: "New event sample",
    })
    setEventSample(data.events)
  }, [session])

  const handleSampleObjects = useCallback(async () => {
    if (!session) return false
    const data = await apiWrapper(() => Api.sampleObjectsSampleObjectsGet({
      oceanSessionId: session
    }), {
      loadingText: "Sampling objects",
      successTitle: "New object sample",
    })
    setObjectSample(data.objects)
  }, [session])

  const handleDiscoverPetriNet = useCallback(async () => {
    if (!session || !ocel) {
      return false
    }
    // const objectTypes = selectedObjectTypes
    const objectTypes = handlingUnits
    if (!objectTypes || !objectTypes.length || !objectTypes.every(ot => ocel.objectTypes.includes(ot))) {
      return false
    }
    const data = await apiWrapper(() => Api.ocpnOcpnPost({
      oceanSessionId: session,
      requestBody: {
        objectTypes: objectTypes
      }
    }), {
      loadingText: "Discovering Object-centric Petri Net",
      successTitle: "Discovered Object-centric Petri Net",
    })
    // if (data.ocpn) {
    //   updateObjectTypeColors(data.ocpn.objectTypes, setObjectTypeColors)
    // }

  }, [session, ocel, setObjectTypeColors])

  const eventAttributes = ocel?.attributes.filter(attr => isEventAttribute(attr)) ?? []
  const objectAttributes = ocel?.attributes.filter(attr => isObjectAttribute(attr)) ?? []

  // Load default OCELs if no OCEL loaded
  const [showLegacyDefaultOcels, setShowLegacyDefaultOcels] = useState(false)
  const [defaultOcels, setDefaultOcels] = useState<DefaultOCEL[]>()
  useEffect(() => {
    if (ocel) return
    const effect = async () => {
      const results = await Api.defaultOcelsOcelDefaultGet({
        onlyLatestVersions: !showLegacyDefaultOcels,
        onlyPreloaded: false
      })
      setDefaultOcels(results)
    }
    effect()
  }, [ocel, showLegacyDefaultOcels])

  const { emissionAttributes, setEmissionAttributes } = useOceanStore.useState.emissionAttributes()
  const { isEmissionAttributeSelectionOpen, setIsEmissionAttributeSelectionOpen } = useOceanStore.useState.isEmissionAttributeSelectionOpen()
  const [editingEmissionAttributes, setEditingEmissionAttributes] = useState(emissionAttributes ?? [])

  const handleApplyEmissionAttributes = useCallback(() => {
    setEmissionAttributes(editingEmissionAttributes)
    setIsEmissionAttributeSelectionOpen(false)
  }, [setEmissionAttributes, editingEmissionAttributes, setIsEmissionAttributeSelectionOpen])

  const handleResetEmissionAttributes = useCallback(() => {
    setEditingEmissionAttributes(emissionAttributes)
  }, [emissionAttributes, setEditingEmissionAttributes])


  const [activityEmissionsAggMode, setActivityEmissionsAggMode] = useState<AggMode>(aggModes.mean)

  return (<>
    {(!!ocel && !!session) && (<>

      <Row>
        {/* Basic OCEL Stats */}
        <Col lg={6} className="mb-3">

          <h4>Overview</h4>
          <OcelOverview
            handleSampleEvents={handleSampleEvents}
            handleSampleObjects={handleSampleObjects}
            apiWrapper={apiWrapper}
          />
          <ButtonToolbar className="mt-2">
            <Button
              variant="primary"
              onClick={() => { handleDiscoverPetriNet() }}
              disabled={(ocpn && showOcpn && handlingUnits) ? _.isEqual(ocpn.objectTypes.toSorted(), handlingUnits.toSorted()) : false}
            >Discover OCPN</Button>
            {!!showOcpn && (<Button
              variant="secondary"
              onClick={() => { setShowOcpn(false) }}
            >Hide</Button>)}
          </ButtonToolbar>

        </Col>

        {/* Select otypes, Discover OCPN */}
        {!!ocel && (<>
          <Col lg={6} className="mb-3">
            <h4>Object types</h4>
            <p className="mb-2 small">Select which object types are handling units (HUs) and which are process resources.</p>
            <div className="mb-2">
              <ObjectTypeManager
                minNumCols={2}
                maxNumCols={3}
                maxColLength={10}
                breakpoint="sm"
              />
            </div>
          </Col>
        </>)}

      </Row>

      {(ocpn && ocel && showOcpn && objectTypeColors) && (
        <Row>
          <Col className="mb-3">
            <h4>Object-centric Petri Net (OCPN)</h4>
            <PetriNet
              ocpn={ocpn}
              emissions={emissions}
              options={{ zoom: true }}
            />
          </Col>
        </Row>
      )}

      {/* ATTRIBUTES & UNITS */}
      <Row>
        <Col>
          <h4>Attributes</h4>

          <Tabs id="attribute-manager-tabs" defaultActiveKey={eventAttributes.length ? "eattrs" : "oattrs"}>
            <Tab title={`Event attributes (${eventAttributes.length})`} eventKey="eattrs" disabled={!eventAttributes.length}>
              <AttributeManager target="event" attributes={eventAttributes} />
            </Tab>
            <Tab title={`Object attributes (${objectAttributes.length})`} eventKey="oattrs" disabled={!objectAttributes.length}>
              <AttributeManager target="object" attributes={objectAttributes} />
            </Tab>
            {(!!eventAttributes.length && !!objectAttributes.length) && (
              <Tab title={`All (${ocel.attributes.length})`} eventKey="all" disabled={!ocel.attributes.length}>
                <AttributeManager target="both" attributes={ocel.attributes} />
              </Tab>
            )}
          </Tabs>

        </Col>

      </Row>

      {/* ACTIVITIES AND OBJECT TYPES */}
      <Row>
        <Col md={(emissions && emissions.activityEmissions) ? 8 : 6} lg={6} className="mb-3">
          <h4>Activities</h4>
          <Table striped size="sm">
            <thead>
              <tr>
                <th>Activity</th>
                {(emissions && emissions.activityEmissions) && (<>
                  <th>
                    <AggModeSelector
                      mode={activityEmissionsAggMode}
                      setMode={setActivityEmissionsAggMode}
                      label={<span>CO<sub>2</sub>e</span>}
                      toggleProps={{ as: "span", style: { cursor: "pointer" } }}
                    />
                  </th>
                </>)}
                <th className="d-sm-none">Freq.</th>
                <th className="d-none d-sm-table-cell">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {_.sortBy(Object.entries(ocel.activityCounts), ([_act, count]) => -count).map(([activity, count], i) => (
                <tr key={i}>
                  <td><ActivityWithIcon activity={activity} /></td>
                  {(emissions && emissions.activityEmissions) && (<>
                    <td className="align-middle text-end" style={{ width: "30%", minWidth: "80px" }}>
                      <AggProgressBar
                        self={emissions.activityEmissions[activity]}
                        all={Object.values(emissions.activityEmissions)}
                        log={true}
                        rounded={false}
                        color={chroma.hex("#dd1c77")}
                        aggMode={activityEmissionsAggMode}
                        unit={emissions.unit}
                      />
                    </td>
                  </>)}
                  <td className="align-middle" style={{ width: "30%", minWidth: "80px" }}>
                    <ProgressBar now={count} max={ocel.numEvents} log={true} min={.5} rounded={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>

        <Col md={(emissions && emissions.activityEmissions) ? 4 : 6} lg={6} className="mb-3">
          <h4>Object types</h4>
          <Table striped size="sm">
            <thead>
              <tr>
                <th>Object type</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {_.sortBy(Object.entries(ocel.objectTypeCounts), ([_ot, count]) => -count).map(([objectType, count], i) => {
                // const iconColor = ((objectTypeColors ?? {})[objectType])?.hex() ?? "var(--bs-secondary)"

                return (
                  <tr key={i}>
                    <td><ObjectTypeWithIcon objectType={objectType} /></td>
                    <td className="align-middle" style={{ width: "30%", minWidth: "80px" }}>
                      <ProgressBar now={count} max={ocel.numObjects} log={true} min={.5} rounded={false} color={_.get(objectTypeColors ?? {}, objectType)} variant="secondary" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* OBJECT SAMPLE */}
      <Modal show={!!objectSample} size="xl" fullscreen="lg-down" onHide={() => setObjectSample(undefined)}>
        <Modal.Header closeButton>
          <Modal.Title>Object Sample</Modal.Title>
        </Modal.Header>
        <Modal.Body>

          {!!objectSample && (
            <Table striped size="sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  {!!objectSampleAttrs && objectSampleAttrs.map((attr, i) => (
                    <th key={i}>{attr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {objectSample.map((obj, i) => (
                  <tr key={i}>
                    <td>{obj.id}</td>
                    <td>{obj.type}</td>
                    {!!objectSampleAttrs && objectSampleAttrs.map((name, j) => {
                      return (
                        <td key={j}>
                          <AttrValue object={obj} name={name} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

        </Modal.Body>
        <Modal.Footer>
          <ButtonToolbar>
            <IconButton variant="primary" label="New sample" onClick={() => handleSampleObjects()}><FaArrowsRotate /></IconButton>
            <Button variant="secondary" onClick={() => setObjectSample(undefined)}>Close</Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>

      {/* EVENT SAMPLE */}
      <Modal show={!!eventSample} size="xl" fullscreen="lg-down" onHide={() => setEventSample(undefined)}>
        <Modal.Header closeButton>
          <Modal.Title>Event Sample</Modal.Title>
        </Modal.Header>
        <Modal.Body>

          {!!eventSample && (
            <Table striped size="sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Activity</th>
                  {!!eventSampleAttrs && eventSampleAttrs.map((attr, i) => (
                    <th key={i}>{attr}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventSample.map((ev, i) => (
                  <tr key={i}>
                    <td>{ev.id}</td>
                    <td>{ev.timestamp}</td>
                    <td>{ev.activity}</td>
                    {!!eventSampleAttrs && eventSampleAttrs.map((name, j) => (
                      <td key={j}>
                        <AttrValue event={ev} name={name} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

        </Modal.Body>
        <Modal.Footer>
          <ButtonToolbar>
            <IconButton variant="primary" label="New sample" onClick={() => handleSampleEvents()}><FaArrowsRotate /></IconButton>
            <Button variant="secondary" onClick={() => setEventSample(undefined)}>Close</Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>


      {/* EMISSION ATTRIBUTE SELECTION */}
      <Modal show={isEmissionAttributeSelectionOpen} size="xl" fullscreen="md-down" onHide={() => setIsEmissionAttributeSelectionOpen(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Emission Attribute Selection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="light" dismissible>
            <FaCircleInfo className="me-2" />
            Only numeric event attributes are shown.
            OCEAn currently does not support importing object emissions.
            To use an object emission attribute, create an emission rule using that attribute.
          </Alert>
          <AttributeManager
            target="event"
            attributes={eventAttributes}
            selectEmissionAttributes={true}
            // onApply={() => setIsEmissionAttributeSelectionOpen(false)}
            editingEmissionAttributes={editingEmissionAttributes}
            setEditingEmissionAttributes={setEditingEmissionAttributes}
          />
        </Modal.Body>
        <Modal.Footer>
          <ButtonToolbar>
            <Button
              variant="primary"
              onClick={() => handleApplyEmissionAttributes()}
            >
              Apply
            </Button>
            {/* <Button
              variant="secondary"
              onClick={() => handleResetEmissionAttributes()}
            >
              Reset
            </Button> */}
            <Button variant="secondary" onClick={() => {
              handleResetEmissionAttributes()
              setIsEmissionAttributeSelectionOpen(false)
            }}>Close</Button>
          </ButtonToolbar>
        </Modal.Footer>
      </Modal>
    </>)}

    {/* OCEL Import */}
    {!ocel && (<>

      <h4>OCEL 2.0 Import</h4>
      <div className="mb-5">
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Select an event log (<code>.sqlite</code> OCEL 2.0 format) from your local disk</Form.Label>
          <Form.Control type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files ?? []
            setSelectedFile(files[0] ?? undefined)
          }} accept=".sqlite,.zip" />
        </Form.Group>
        <Button onClick={handleUpload} disabled={!selectedFile}>Import</Button>
      </div>

      <h4>Use default OCELs</h4>
      <div className="mb-5">
        <SkeletonTheme>
          <ParagraphLinks>
            {!defaultOcels && _.range(3).map(i => <p key={i} className="disabled">
              <SkeletonIcon />
              <Skeleton count={1} width={200} />
            </p>)}
            {!!defaultOcels && defaultOcels.map(({ key, name, version, url }, i) => {
              const Icon = _.get(defaultOcelIcons, key, FaFileLines)
              return (
                <div key={i}>
                  <Icon className="text-secondary" />
                  <a className="stretched-link d-flex align-items-center me-auto" onClick={async () => {
                    await apiWrapper(() => Api.importDefaultOcelImportDefaultGet({
                      key: key,
                      version: version
                    }), {
                      loadingText: "Importing Event log",
                      successTitle: "OCEL imported successfully",
                      isImportOrLoad: true
                    })
                  }}>
                    {name}
                  </a>
                  {/* <span className="me-auto">{name}</span> */}
                  {!!url && (
                    <div>
                      <a
                        // size={30}
                        // size="sm"
                        // variant="link"
                        className="text-secondary"
                        href={url}
                        onClick={e => e.stopPropagation()}
                        target="_blank"
                        style={{ position: "relative", zIndex: 2 }}
                      >
                        {/* <FaUpRightFromSquare /> */}
                        {/* <FaGlobe /> */}
                        <FaCircleInfo />
                      </a>
                    </div>
                  )}
                  {!!version && <span className="text-secondary">{versionString(version)}</span>}
                </div>
              )
            })}
          </ParagraphLinks>
        </SkeletonTheme>

        <Form className="mt-2">
          <Form.Group controlId="showLegacyOcels">
            <Form.Check
              label="Show legacy datasets"
              checked={showLegacyDefaultOcels}
              onChange={e => setShowLegacyDefaultOcels(e.target.checked)}
            />
          </Form.Group>
        </Form>

      </div>
    </>)}

  </>)
}

export default StartPage;

export const versionString = (v: string) => {
  let v1 = v.toLowerCase().trim()
  if (v1.startsWith("version"))
    v1 = v1.substring("version".length).trim()
  if (v1.startsWith("v"))
    v1 = v1.substring(1).trim()

  if (v1.match(/^\d(?:\.\d+)*$/))
    return `V${v1}`
  return v
}

