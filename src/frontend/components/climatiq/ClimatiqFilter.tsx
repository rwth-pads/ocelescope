/* eslint-disable react-hooks/exhaustive-deps */
// pages/climatiq.tsx
"use client";

import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import 'bootstrap/dist/css/bootstrap.min.css';
import _ from 'lodash';
import { FaArrowRight } from 'react-icons/fa6';

import ChunkedColumns from '@/components/common/ChunkedColumns';
import { ClimatiqPossibleFiltersList, ClimatiqSearchRequest, ClimatiqSearchResponse } from '@/src/climatiq.types';
import { filterValueOrder, getFilterValue } from '@/src/climatiq.util';
import { CircleButton } from '../misc';


const ClimatiqFilter: React.FC<{
  climatiqRequest: ClimatiqSearchRequest
  setClimatiqRequest: Dispatch<SetStateAction<ClimatiqSearchRequest | undefined>>
  climatiqResponse: ClimatiqSearchResponse
  filterKey: keyof ClimatiqPossibleFiltersList
  filterIndex: number
}> = ({ climatiqRequest, setClimatiqRequest, climatiqResponse, filterKey, filterIndex }) => {


  const responseFilterValues = useMemo(() => {
    return climatiqResponse.possibleFilters[filterKey as keyof ClimatiqPossibleFiltersList] as any[]
  }, [climatiqResponse])

  const sortUniq = (values: any[]) => _.sortBy(_.uniqBy(values, x => getFilterValue(filterKey, x)), x => filterValueOrder(filterKey, x))

  const [selectedValues, setSelectedValues] = useState<any[]>(sortUniq(responseFilterValues))
  const [unselectedValues, setUnselectedValues] = useState<any[]>([])
  const [prevUnselectedValues, setPrevUnselectedValues] = useState<any[]>([])

  useEffect(() => {
    setPrevUnselectedValues(unselectedValues)
  }, [climatiqRequest])

  useEffect(() => {
    setSelectedValues(sortUniq(responseFilterValues.filter(value => {
      const filterValue = getFilterValue(filterKey, value)
      return !unselectedValues.some(x => getFilterValue(filterKey, x) == filterValue)
    })))
  }, [responseFilterValues])

  const isSelected = useCallback((value: any) => {
    const filterValue = getFilterValue(filterKey, value)
    return selectedValues.map(x => getFilterValue(filterKey, x)).includes(filterValue)
  }, [selectedValues])

  const allValues = useMemo(() => {
    return sortUniq([
      ...responseFilterValues,
      ...selectedValues,
      ...unselectedValues
    ])
  }, [responseFilterValues, selectedValues, unselectedValues])
  const visibleValues = useMemo(() => {
    return sortUniq([
      ...responseFilterValues,
      ...unselectedValues,
      ...prevUnselectedValues
    ])
  }, [responseFilterValues, unselectedValues])

  const allVisibleSelected = useMemo(() => visibleValues.every(isSelected), [isSelected, visibleValues])

  // useEffect(() => {
  //   console.log(filterKey, { selectedValues, unselectedValues, allValues })
  // }, [selectedValues, unselectedValues, allValues])

  const canApply = useMemo(() => {
    if (!climatiqRequest) return undefined
    if (!selectedValues.length) return false  // Everything is unselected
    const prevFilters = (climatiqRequest[filterKey as keyof ClimatiqSearchRequest] ?? []) as any[]
    if (!prevFilters.length && !unselectedValues.length) return false  // Everything is and has been selected
    const prevFilterValues = _.uniq(prevFilters).toSorted()
    const filterValues = _.uniq(selectedValues.map(x => getFilterValue(filterKey, x))).toSorted()  // Cannot use sortUniq() here, need lexicographic order of filter values.
    if (_.isEqual(prevFilterValues, filterValues)) return false  // Nothing changed
    return true
  }, [selectedValues, unselectedValues, climatiqRequest])

  if (visibleValues.length <= 1) {
    return false
  }

  const selectValue = (value: any, state: boolean) => {
    const filterValue = getFilterValue(filterKey, value)
    if (state) {
      if (!isSelected(value)) {
        setSelectedValues(sortUniq([...selectedValues, value]))
        setUnselectedValues(unselectedValues.filter(x => getFilterValue(filterKey, x) != filterValue))
      }
    } else {
      if (isSelected(value)) {
        setSelectedValues(selectedValues.filter(x => getFilterValue(filterKey, x) != filterValue))
        setUnselectedValues(sortUniq([...unselectedValues, value]))
      }
    }
  }
  const selectAll = (state: boolean) => {
    // allValues.forEach(value => selectValue(value, state))  // side effects?
    if (state) {
      setSelectedValues(visibleValues)
      setUnselectedValues([])
    } else {
      setSelectedValues([])
      setUnselectedValues(visibleValues)
    }
  }

  const apply = () => {
    setClimatiqRequest(prev => {
      if (!prev) {
        return undefined
      }
      const next: any = { ...prev }
      const selectedFilterValueValues = selectedValues.map(value => getFilterValue(filterKey, value))
      const allFilterValueValues = allValues.map(value => getFilterValue(filterKey, value))
      if (_.isEqual(selectedFilterValueValues, allFilterValueValues)) {
        next[filterKey] = undefined
      } else {
        next[filterKey] = selectedFilterValueValues
      }
      return next as ClimatiqSearchRequest
    })
  }

  return (
    <div className="filter">
      <p className="title">{_.snakeCase(filterKey).replaceAll("_", " ")}</p>
      <ul className="values">
        <ChunkedColumns numCols={filterKey == "year" ? 2 : 1} gap={3} className="justify-evenly-left" flow="row">
          {visibleValues.length != 0 && (
            <li key={-1} className="value all">
              <Form.Group controlId={`climatiq-filter-${filterIndex}-all`}>
                <Form.Check label="(all)" checked={allVisibleSelected} onChange={e => selectAll(e.target.checked)} />
              </Form.Group>
            </li>
          )}
          {visibleValues.map((value, j) => {
            const label = ((filterKey == "region" && "name" in value) ? value.name : (filterKey == "source" ? value.source : value)) as string
            const isChecked = isSelected(value)

            return (
              <li key={j} className="value">
                <Form.Group controlId={`climatiq-filter-${filterIndex}-${j}`}>
                  <Form.Check label={label} checked={isChecked} onChange={e => selectValue(value, e.target.checked)} />
                </Form.Group>
              </li>
            )

          })}
        </ChunkedColumns>
      </ul>

      <div className="edge-buttons">
        <CircleButton size={40} className="apply-filters" onClick={() => apply()} disabled={!canApply}>
          <FaArrowRight />
        </CircleButton>
      </div>

    </div>
  )

}

export default ClimatiqFilter
