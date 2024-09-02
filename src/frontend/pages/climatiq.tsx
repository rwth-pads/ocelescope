/* eslint-disable react-hooks/exhaustive-deps */
// pages/climatiq.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { PageProps } from './_app';

import styled from 'styled-components';

import ClimatiqFilter from '@/components/climatiq/ClimatiqFilter';
import EmissionFactorGroupDetails from '@/components/climatiq/EmissionFactorGroupDetails';
import { ValueSet } from '@/components/climatiq/misc';
import Pagination from '@/components/common/Pagination';
import { Sidebar } from '@/components/layout/Layout';
import { ClimatiqEmissionFactor, ClimatiqPossibleFiltersList, ClimatiqSearchRequest, ClimatiqSearchResponse, climatiqSearchRequest } from '@/src/climatiq.types';
import { useOceanStore } from '@/src/zustand';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * Climatiq emission factor search page
 * @deprecated
 */


const initialClimatiqRequest = {
  dataVersion: "^8",
  page: 1,
  resultsPerPage: 20,
  // query: "diesel",
  // category: ["fuel"],
  // region: ["DE", "GB", "US", "FR"]
}



const ClimatiqPage: React.FC<PageProps> = ({}) => {

  const climatiqConfig = useOceanStore.use.climatiqConfig()
  const [climatiqResponse, setClimatiqResponse] = useState<ClimatiqSearchResponse | undefined>()
  const [climatiqRequest, setClimatiqRequest] = useState<ClimatiqSearchRequest | undefined>(initialClimatiqRequest)
  const [page, setPage] = useState(1)
  const [querySearchValue, setQuerySearchValue] = useState<string>(_.get(initialClimatiqRequest, "query") ?? "")
  const [waitingForClimatiqResponse, setWaitingForClimatiqResponse] = useState<boolean>(true)

  const [selectedEmissionFactorGroup, setSelectedEmissionFactorGroup] = useState<ClimatiqEmissionFactor[] | undefined>(undefined)

  useEffect(() => {
    effect()
    async function effect() {
      if (!climatiqRequest) return

      setWaitingForClimatiqResponse(true)

      // automatically trigger api call when the request state changes
      const response = await climatiqSearchRequest(climatiqRequest, climatiqConfig)
      setWaitingForClimatiqResponse(false)
      if (response) {
        setClimatiqResponse(response)
      }

    }

  }, [climatiqRequest])

  useEffect(() => {
    if (!climatiqRequest || !climatiqResponse) {
      console.warn("Cannot change page, either climatiqRequest or climatiqResponse is not set.")
      return
    }
    if (page < 1 || page > climatiqResponse.lastPage) {
      console.warn(`Cannot change page, the page number is invalid. Returning to page 1. (allowed 1-${climatiqResponse.lastPage}, got ${page})`)
      setPage(1)
      return
    }
    updateClimatiqRequest({ page: page })
  }, [page])

  const factorOrder = (ef: ClimatiqEmissionFactor) => {
    return [ef.activityId, ef.name, ef.id]
  }

  const factorsGroupedByActivity = useMemo(() => {
    if (!climatiqResponse) return undefined
    // const activityIds = Array.from(new Set(climatiqResponse.results.map(ef => ef.activityId)))
    // return activityIds.map(activityId => {
    //   return climatiqResponse.results.filter(ef => ef.activityId)
    // })

    return Object.values(_.groupBy(climatiqResponse.results, ef => ef.activityId ?? ef.id))
      .map(group => _.sortBy(group, factorOrder))

  }, [climatiqResponse])

  const updateClimatiqRequest = (values: Partial<ClimatiqSearchRequest>) => {
    setClimatiqRequest(prev => prev ? { ...prev, ...values } : undefined)
  }

  const showResetFilters = useMemo(() => {
    return !_.isEqual(initialClimatiqRequest, climatiqRequest)
  }, [climatiqRequest])

  const pageControl = (climatiqResponse && climatiqRequest) && (
    <div className="d-flex mb-3">
      <div className="d-flex align-items-center gap-2">
        {climatiqResponse.lastPage != 1 && (<>
          <Form.Select onChange={e => {
            const resultsPerPage = Number(e.target.value)
            updateClimatiqRequest({ resultsPerPage })
          }}>
            {[20, 50, 100].map((resultsPerPage, i) => (
              <option key={i} value={resultsPerPage}>{resultsPerPage}</option>
            ))}
          </Form.Select>
          <span style={{ whiteSpace: "nowrap" }}>of {climatiqResponse.totalResults}</span>
        </>)}
        {climatiqResponse.lastPage == 1 && (
          <span style={{ whiteSpace: "nowrap" }}>{climatiqResponse.totalResults} results</span>
        )}
      </div>

      <Pagination max={climatiqResponse.lastPage} current={page} setCurrent={setPage} className="ms-auto" />
    </div>
  )

  return (<>
    <Sidebar>

      {(climatiqRequest && climatiqResponse) && (<>

        <ClimatiqFilters>
          <div className="search d-flex align-items-center">
            <Form.Control
              placeholder="Search ..."
              onChange={e => setQuerySearchValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (querySearchValue.length > 2)
                    updateClimatiqRequest({ query: querySearchValue })
                  if (querySearchValue.length == 0)
                    updateClimatiqRequest({ query: undefined })
                }
              }}
              style={{ marginRight: "-28px", paddingRight: "40px" }}
            />
            <FaMagnifyingGlass className="text-secondary" />
          </div>
          <div className="filters">
            {/* {Object.keys(climatiqResponse.possibleFilters).filter(k => k != "region" && k != "source").map((key, i) => { */}
            {Object.keys(climatiqResponse.possibleFilters).map((key, i) => (
              <ClimatiqFilter
                key={i}
                filterKey={key as keyof ClimatiqPossibleFiltersList}
                filterIndex={i}
                climatiqRequest={climatiqRequest}
                setClimatiqRequest={setClimatiqRequest}
                climatiqResponse={climatiqResponse}
              />
            ))}
          </div>

          {showResetFilters && (<Button variant="primary" className="w-100 mt-2" onClick={() => setClimatiqRequest(initialClimatiqRequest)}>Reset filters</Button>)}

        </ClimatiqFilters>

      </>)}

    </Sidebar>

    {(climatiqRequest) && (
      <Row>
        <Col>

          {pageControl}

          <Table size="sm" striped bordered hover>
            <thead>
              <tr>
                {/* TODO responsive */}
                <th className="d-none">Activity ID</th>
                <th>Name</th>
                <th>Sectors</th>
                <th>Categories</th>
                <th>Regions</th>
                <th>Unit types</th>
              </tr>
            </thead>
            <tbody>

              {((!waitingForClimatiqResponse && factorsGroupedByActivity) ? factorsGroupedByActivity : _.range(climatiqRequest.resultsPerPage).map(i => undefined)).map((group, i) => {
                const rep = (group && group.length) ? group[0] : undefined
                const activityId = rep?.activityId
                const names = _.uniq((group ?? []).map(ef => ef.name))
                const sectors = _.uniq((group ?? []).map(ef => ef.sector))
                const categories = _.uniq((group ?? []).map(ef => ef.category))
                const sources = _.uniq((group ?? []).map(ef => ef.source))  // TODO objects
                const regions = _.uniqBy((group ?? []).map(ef => ef.region), region => region.id)
                const unitTypes = _.uniq((group ?? []).map(ef => ef.unitType))

                return (
                  <tr key={i} style={!waitingForClimatiqResponse ? { cursor: "pointer" } : undefined} onClick={() => {
                    setSelectedEmissionFactorGroup(group)
                  }}>
                    <td style={{ maxWidth: "200px" }} className="d-none">
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis" }} title={rep?.activityId}>
                        {activityId || <Skeleton />}
                      </div>
                    </td>
                    <td><ValueSet filterKey="name" values={names} climatiqResponse={climatiqResponse} /></td>
                    <td><ValueSet filterKey="sector" values={sectors} climatiqResponse={climatiqResponse} /></td>
                    <td><ValueSet filterKey="category" values={categories} climatiqResponse={climatiqResponse} /></td>
                    <td><ValueSet filterKey="region" values={regions} climatiqResponse={climatiqResponse} /></td>
                    <td><ValueSet filterKey="unitType" values={unitTypes} climatiqResponse={climatiqResponse} /></td>
                  </tr>
                )
              })}

            </tbody>
          </Table>

          {pageControl}

        </Col>
      </Row>

    )}

    {(climatiqRequest && climatiqResponse && selectedEmissionFactorGroup && selectedEmissionFactorGroup.length > 0) && (
      <EmissionFactorGroupDetails
        activityId={selectedEmissionFactorGroup[0].activityId}
        initialRequest={climatiqRequest}
        initialResponse={climatiqResponse}
        initialEmissionFactors={selectedEmissionFactorGroup}
        show={selectedEmissionFactorGroup && selectedEmissionFactorGroup.length > 0}
        onHide={() => {
          setSelectedEmissionFactorGroup(undefined)
        }}
      />
    )}

  </>)

}

export default ClimatiqPage;




const ClimatiqFilters = styled.div`
  transform: rotate(0);

  .filters {

    .filter {
      &:not(:last-child) {
        border-bottom: 1px solid var(--bs-border-color);
      }
      .title {
        text-transform: uppercase;
        color: var(--bs-secondary);
        margin: .5rem 0;
      }
      .values {
        list-style-type: none;
        padding: 0;
        .value {
          padding-left: .5rem;
        }
        .justify-evenly-left {
          justify-content: space-between;
          &::after {
            content: '';
            flex-grow: 0;
          }
        }
      }

      transform: rotate(0);

      .edge-buttons {
        position: absolute;
        top: 0;
        bottom: 0;
        right: -1rem;
        width: 0;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

      }
    }
  }


`
