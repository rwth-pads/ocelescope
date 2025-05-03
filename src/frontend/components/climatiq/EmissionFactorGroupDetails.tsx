/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal, { ModalProps } from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";

import "bootstrap/dist/css/bootstrap.min.css";
import _ from "lodash";

import styled from "styled-components";

import { buildSelectStyles } from "@/components/util";
import {
  ClimatiqEmissionFactor,
  ClimatiqPossibleFiltersList,
  ClimatiqSearchRequest,
  ClimatiqSearchResponse,
  Region,
  Source,
  climatiqSearchRequest,
} from "@/src/climatiq.types";
import { filterValueOrder } from "@/src/climatiq.util";
import Select from "react-select";
import { RegionIcon, ValueSet } from "./misc";
import { useOceanStore } from "@/src/zustand";

type EmissionFactorGroupDetailsProps = ModalProps & {
  activityId: string;
  initialRequest: ClimatiqSearchRequest;
  initialResponse: ClimatiqSearchResponse;
  initialEmissionFactors: ClimatiqEmissionFactor[];
};
const EmissionFactorGroupDetails = styled(
  ({
    activityId,
    initialRequest,
    initialResponse,
    initialEmissionFactors,
    ...props
  }: EmissionFactorGroupDetailsProps) => {
    // On opening the modal, a new request gets triggered, filtering for the activityId
    // Only this way, the complete list of possible filters can be received
    // (Otherwise the emissionFactors' value lists are limited to the page size, and possibleFilters include other activityIds.)
    const baseRequest = {
      ...initialRequest, // TODO completely override initial request?
      activityId: activityId,
      page: 1,
      resultsPerPage: 500, // TODO what page size?
      query: undefined,
    };
    const climatiqConfig = useOceanStore.use.climatiqConfig();
    const [climatiqResponse, setClimatiqResponse] = useState<
      ClimatiqSearchResponse | undefined
    >();
    const [climatiqRequest, setClimatiqRequest] =
      useState<ClimatiqSearchRequest>({
        ...baseRequest,
        // Reset all filters that can be set inside the modal (in case the user wants to change them, need all possible values)
        // Below, the original filters are passed to the new filter component.
        region: undefined,
        source: undefined,
        year: undefined,
      });
    const [emissionFactors, setEmissionFactors] = useState<
      ClimatiqEmissionFactor[]
    >(initialEmissionFactors);
    const [allFilters, setAllFilters] = useState<ClimatiqPossibleFiltersList>();
    const [filtersWithoutSourceAndYear, setFiltersWithoutSourceAndYear] =
      useState<ClimatiqPossibleFiltersList>();
    const [filtersWithoutYear, setFiltersWithoutYear] =
      useState<ClimatiqPossibleFiltersList>();

    const loadedActivityResponse = useMemo(
      () => !!climatiqResponse,
      [climatiqResponse],
    );

    useEffect(() => {
      effect();
      async function effect() {
        const res = await climatiqSearchRequest(
          climatiqRequest,
          climatiqConfig,
        );
        if (res === false) {
          return;
        }
        if (
          !climatiqRequest.region &&
          !climatiqRequest.source &&
          !climatiqRequest.year
        ) {
          setAllFilters(res.possibleFilters);
        }
        if (!climatiqRequest.source && !climatiqRequest.year) {
          setFiltersWithoutSourceAndYear(res.possibleFilters);
        }
        if (!climatiqRequest.year) {
          setFiltersWithoutYear(res.possibleFilters);
        }
        setClimatiqResponse(res);
        setEmissionFactors(res.results);
      }
    }, [climatiqRequest]);

    const rep = useMemo(
      () => initialEmissionFactors[0],
      [initialEmissionFactors],
    );

    // Init filters with previous filters from initialRequest, if they are unique
    const [selectedRegion, setSelectedRegion] = useState<Region | undefined>(
      initialRequest.region && initialRequest.region.length == 1
        ? initialResponse.possibleFilters.region.find(
            (region) => region.id == (initialRequest.region as string[])[0],
          )
        : undefined,
    );
    const [selectedSource, setSelectedSource] = useState<Source | undefined>(
      initialRequest.source && initialRequest.source.length == 1
        ? initialResponse.possibleFilters.source.find(
            (source) => source.source == (initialRequest.source as string[])[0],
          )
        : undefined,
    );
    const [selectedYear, setSelectedYear] = useState<number | undefined>(
      initialRequest.year && initialRequest.year.length == 1
        ? initialRequest.year[0]
        : undefined,
    );

    useEffect(() => {
      setClimatiqRequest({
        ...baseRequest,
        region: selectedRegion ? [selectedRegion.id] : undefined,
        source: selectedSource ? [selectedSource.source] : undefined,
        year: selectedYear ? [selectedYear] : undefined,
      });
    }, [selectedRegion, selectedSource, selectedYear]);

    // Init value sets from initialEmissionFactors. Then update with possibleFilters from activityId request.
    const names = useMemo(
      () =>
        _.sortBy(
          _.uniq(emissionFactors.map((ef) => ef.name)).filter(
            (value) => value.length,
          ),
          (name) => filterValueOrder("name", name),
        ),
      [emissionFactors],
    );
    const descriptions = useMemo(
      () =>
        _.sortBy(
          _.uniq(emissionFactors.map((ef) => ef.description)).filter(
            (value) => value.length,
          ),
          (description) => filterValueOrder("description", description),
        ),
      [emissionFactors],
    );
    const sectors = useMemo(
      () =>
        _.sortBy(
          (climatiqResponse ?? initialResponse).possibleFilters.sector.filter(
            (value) => value.length,
          ),
          (sector) => filterValueOrder("sector", sector),
        ),
      [climatiqResponse, initialResponse],
    );
    const categories = useMemo(
      () =>
        _.sortBy(
          (climatiqResponse ?? initialResponse).possibleFilters.category.filter(
            (value) => value.length,
          ),
          (category) => filterValueOrder("category", category),
        ),
      [climatiqResponse, initialResponse],
    );
    const unitTypes = useMemo(
      () =>
        _.sortBy(
          (climatiqResponse ?? initialResponse).possibleFilters.unitType.filter(
            (value) => value.length,
          ),
          (unitType) => filterValueOrder("unitType", unitType),
        ),
      [climatiqResponse, initialResponse],
    );
    const regions = useMemo(
      () =>
        _.sortBy(
          (climatiqResponse ?? initialResponse).possibleFilters.region.filter(
            (value) => value !== undefined,
          ),
          (region) => filterValueOrder("region", region),
        ),
      [climatiqResponse, initialResponse],
    );

    // TODO need filtering for region/source again!
    // Need new API request when selecting region/source.
    const sources = useMemo(
      () =>
        _.sortBy(
          (climatiqResponse ?? initialResponse).possibleFilters.source.filter(
            (value) => value !== undefined,
          ),
          (source) => filterValueOrder("source", source),
        ),
      [climatiqResponse, initialResponse],
    );
    const years = useMemo(
      () =>
        _.sortBy(
          (climatiqResponse ?? initialResponse).possibleFilters.year.filter(
            (value) => value !== undefined,
          ),
          (year) => filterValueOrder("year", year),
        ),
      [climatiqResponse, initialResponse],
    );

    // const names = useMemo(() => _.uniq((emissionFactors ?? []).map(ef => ef.name)).filter(value => value.length), [emissionFactors])
    // const descriptions = useMemo(() => _.uniq((emissionFactors ?? []).map(ef => ef.description)).filter(value => value.length), [emissionFactors])
    // const sectors = useMemo(() => _.uniq((emissionFactors ?? []).map(ef => ef.sector)).filter(value => value.length), [emissionFactors])
    // const categories = useMemo(() => _.uniq((emissionFactors ?? []).map(ef => ef.category)).filter(value => value.length), [emissionFactors])
    // const years = useMemo(() => _.uniq((filteredForRegionAndSource ?? []).map(ef => ef.year)).filter(value => value !== undefined).toSorted().reverse(), [filteredForRegionAndSource])
    // const regions: Region[] = useMemo(() => _.sortBy(_.uniqBy((emissionFactors ?? []).map(ef => ef.region), region => region.id), region => filterValueOrder("region", region)), [emissionFactors])
    // // TODO include source link in object?
    // const sources: Source[] = useMemo(() => Object.entries(_.groupBy(filteredForRegion ?? [], ef => ef.source)).map(([source, efs]) => (
    //   { source: source, datasets: efs.map(ef => ef.sourceDataset) }
    // )), [filteredForRegion])

    // useEffect(() => {
    //   console.log(sources)
    // }, [sources])
    // useEffect(() => {
    //   console.log(filteredForRegion)
    // }, [filteredForRegion])

    const createYearOption = (year: number, years: number[]) => ({
      year: year,
      value: year,
      label: year.toString() + (year == Math.max(...years) ? " (latest)" : ""),
    });
    const createSourceOption = (source: Source) => ({
      source: source,
      label: `${source.source} (${source.datasets.length} dataset${source.datasets.length > 1 ? "s" : ""})`,
    });
    const createRegionOption = (region: Region) => ({
      region: region,
      label: region.name,
    });

    // region filter uses allFilters, to not be limited
    const regionOptions = useMemo(
      () =>
        _.sortBy(allFilters?.region ?? [], (region) =>
          filterValueOrder("region", region),
        ).map((region) => createRegionOption(region)) ?? [],
      [regions],
    );
    const sourceOptions = useMemo(
      () =>
        _.sortBy(filtersWithoutSourceAndYear?.source ?? [], (source) =>
          filterValueOrder("source", source),
        ).map((source) => createSourceOption(source)) ?? [],
      [sources],
    );
    const yearOptions = useMemo(
      () =>
        _.sortBy(filtersWithoutYear?.year ?? [], (year) =>
          filterValueOrder("year", year),
        ).map((year) => createYearOption(year, years)) ?? [],
      [years],
    );

    useEffect(() => {
      setSelectedSource(undefined);
    }, [sourceOptions, selectedRegion]);
    useEffect(() => {
      setSelectedYear(
        yearOptions.length
          ? Math.max(...yearOptions.map((option) => option.year))
          : undefined,
      );
    }, [yearOptions, selectedRegion, selectedSource]);

    // const showSourceSelection = useMemo(() => selectedRegion !== undefined || regions.length == 1, [selectedRegion, regions])
    // const showYearSelection = useMemo(() => showSourceSelection && (selectedSource !== undefined || sources.length == 1), [showSourceSelection, selectedSource, sources])
    const showSourceSelection = useMemo(
      () => selectedRegion !== undefined || regionOptions.length == 1,
      [selectedRegion, regions],
    );
    const showYearSelection = useMemo(
      () =>
        showSourceSelection &&
        (selectedSource !== undefined || sourceOptions.length == 1),
      [showSourceSelection, selectedSource, sources],
    );

    return (
      <Modal size="lg" {...props}>
        <Modal.Header closeButton>
          {/* <Modal.Title>{rep?.activityId}</Modal.Title> */}
          <Modal.Title>Emission factor details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col lg={8}>
              <div className="d-flex flex-column gap-3">
                <div className="factor-property">
                  <div className="factor-key activity-id">Activity ID</div>
                  <div className="factor-values activity-id small">
                    {activityId}
                  </div>
                </div>
                <div className="factor-property">
                  <div className="factor-key">
                    Name{climatiqResponse?.lastPage == 1 ? "" : "s"}
                  </div>
                  <div className="factor-values">
                    <ValueSet
                      filterKey="name"
                      values={names}
                      climatiqResponse={climatiqResponse}
                    />
                  </div>
                </div>
                <div className="factor-property">
                  <div className="factor-key">
                    Description{climatiqResponse?.lastPage == 1 ? "" : "s"}
                  </div>
                  <div className="factor-values small">
                    <ValueSet
                      filterKey="description"
                      values={descriptions}
                      complete={!!climatiqResponse}
                      paragraphs
                      climatiqResponse={climatiqResponse}
                    />
                  </div>
                </div>
                <div className="factor-property">
                  <div className="factor-key">Unit types</div>
                  <div className="factor-values">
                    <ValueSet
                      filterKey="unitType"
                      values={unitTypes}
                      complete={!!climatiqResponse}
                      climatiqResponse={climatiqResponse}
                    />
                  </div>
                </div>
                <div className="factor-property">
                  <div className="factor-key">Number of factors</div>
                  <div className="factor-values">{emissionFactors.length}</div>
                </div>
              </div>
            </Col>
            <Col lg={4}>
              <div className="d-flex flex-column gap-3">
                {/* {regions[0] && <RegionIcon region={regions[0]} size={50} />} */}

                {loadedActivityResponse && (
                  <>
                    <Form.Group>
                      <Form.Label>Region</Form.Label>
                      <Select<{ region: Region }>
                        // inputId={id}
                        // menuIsOpen={true}
                        className="basic-single region-selection"
                        isDisabled={regionOptions.length == 1}
                        onChange={(option) => {
                          setSelectedRegion(option?.region);
                        }}
                        options={regionOptions}
                        formatOptionLabel={(option) => (
                          <div className="d-flex align-items-center gap-2">
                            <RegionIcon region={option.region} size={20} />
                            <span>{option.region.name}</span>
                            {/* <span>{option.region.id} {option.region.name}</span> */}
                          </div>
                        )}
                        defaultValue={
                          regionOptions.length == 1
                            ? regionOptions[0]
                            : undefined
                        }
                        isClearable={true}
                        placeholder="Select region ..."
                        styles={buildSelectStyles({})}
                      />
                    </Form.Group>
                    {showSourceSelection && (
                      <Form.Group>
                        <Form.Label>Source</Form.Label>
                        <Select<{ source: Source; label: string }>
                          // inputId={id}
                          className="basic-single source-selection"
                          isDisabled={sourceOptions.length == 1}
                          onChange={(option) => {
                            setSelectedSource(option?.source);
                          }}
                          options={sourceOptions}
                          defaultValue={
                            sourceOptions.length == 1
                              ? sourceOptions[0]
                              : undefined
                          }
                          isClearable={true}
                          placeholder="Select source ..."
                          styles={buildSelectStyles({})}
                        />
                      </Form.Group>
                    )}
                    {showYearSelection && (
                      <Form.Group>
                        <Form.Label>Year</Form.Label>
                        <Select<{ year: number; label: string }>
                          // inputId={id}
                          className="basic-single year-selection"
                          isDisabled={yearOptions.length == 1}
                          onChange={(option) => {
                            console.log(`select year ${option?.year}`);
                            setSelectedYear(option?.year);
                          }}
                          options={yearOptions}
                          defaultValue={yearOptions[0]}
                          placeholder="Select year ..."
                          isClearable={false}
                          isSearchable={false}
                          styles={buildSelectStyles({})}
                        />
                      </Form.Group>
                    )}
                  </>
                )}
              </div>
            </Col>
          </Row>
        </Modal.Body>
        {/* <Modal.Footer>
            <Button variant="secondary" onClick={handleCancel}>Select</Button>
          </Modal.Footer> */}
      </Modal>
    );
  },
)`
  @media (min-width: 992px) {
    .col-lg-8 {
      border-right: 1px solid var(--bs-border-color);
    }
  }

  .factor-key, .form-label {
    font-size: .875rem;
    text-transform: uppercase;
    color: var(--bs-secondary);
  }
  .factor-values {
    overflow: hidden;
    text-overflow: ellipsis;
    p {
      margin-bottom: .25rem;
      &:last-child {
        margin: 0;
      }
    }
  }
  .activity-id {
    &.factor-key {
    }
    &.factor-values {
      overflow-wrap: break-word;
      font-family: var(--bs-font-monospace);
    }
  }

  .region-selection {
    [role="option"] {
      .region-symbol {
      }
    }
  }

`;
export default EmissionFactorGroupDetails;
