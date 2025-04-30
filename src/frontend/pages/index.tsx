/* eslint-disable react-hooks/exhaustive-deps */
// pages/index.tsx
"use client";

import React, { ChangeEvent } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import { FaCircleInfo, FaFileLines } from 'react-icons/fa6';

import { defaultOcelIcons } from '@/src/ocel.types';
// import dotString from "@/public/ocpn";

import { ParagraphLinks, SkeletonIcon } from '@/components/misc';
import { DefaultOCEL, OcelEvent, OcelObject } from '@/src/api/generated';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { useImportDefault } from '@/api/ocel/ocel';


const StartPage: React.FC = () => {
  const defaultOcels: DefaultOCEL[] = [];
  return (<>
    <h4>OCEL 2.0 Import</h4>
    <div className="mb-5">
      <Form.Group controlId="formFile" className="mb-3">
        <Form.Label>Select an event log (<code>.sqlite</code> OCEL 2.0 format) from your local disk</Form.Label>
        <Form.Control type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => {

        }} accept=".sqlite,.zip" />
      </Form.Group>
      <Button >Import</Button>
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
                <a className="stretched-link d-flex align-items-center me-auto" >
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
          />
        </Form.Group>
      </Form>

    </div>

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

