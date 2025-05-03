import { WithTooltip } from "@/components/common/misc";
import {
  ClimatiqEmissionFactor,
  climatiqSearchRequest,
  ClimatiqSearchRequest,
} from "@/src/climatiq.types";
import { useOceanStore } from "@/src/zustand";
import debounce from "debounce-promise";
import _ from "lodash";
import { Badge, BadgeProps } from "react-bootstrap";
import { FaXmark } from "react-icons/fa6";
import { FormatOptionLabelMeta } from "react-select";
import AsyncSelect from "react-select/async";
import styled from "styled-components";
import { UnitTypeIcon } from "../UnitSelection";
import { buildSelectStyles, SelectStylesProps } from "../util";
import { RegionIcon } from "./misc";

type EmissionFactorOption = {
  value: string;
  label: string;
  emissionFactor: ClimatiqEmissionFactor;
};

export type ClimatiqFactorInputProps = {
  // searchFields: SearchField[]
  selected?: ClimatiqEmissionFactor;
  onChange?: (factor: ClimatiqEmissionFactor | undefined) => void;
  filterUnitTypes?: string[];
  styles?: SelectStylesProps;
};

const minSearchLength = 3;

const ClimatiqFactorInput: React.FC<ClimatiqFactorInputProps> = ({
  // searchFields
  selected,
  onChange,
  filterUnitTypes,
  styles,
}) => {
  const makeOption = (factor: ClimatiqEmissionFactor) => ({
    value: factor.id,
    label: `${factor.name} (${factor.id})`,
    emissionFactor: factor,
  });
  const selectedOption = selected ? makeOption(selected) : undefined;
  const climatiqConfig = useOceanStore.use.climatiqConfig();
  const { setErrorMessage } = useOceanStore.useState.setErrorMessage();

  const loadOptions = async (
    inputValue: string,
  ): Promise<EmissionFactorOption[]> => {
    console.log("loadOptions()");
    if (inputValue.length < minSearchLength) {
      return [];
    }
    const request: ClimatiqSearchRequest = {
      query: inputValue,
      page: 1,
      resultsPerPage: 50,
      unitType: filterUnitTypes,
      // accessType: ["private", "public"]
    };
    const response = await climatiqSearchRequest(request, climatiqConfig);
    console.log(response);
    if (response === false) {
      setErrorMessage(
        "Climatiq search request failed. Make sure to enter a valid API key in the settings.",
      );
      return [];
    }
    const results = _.orderBy(response.results, (ef) => [ef.year], "desc");
    return results.map(makeOption);
  };

  const debouncedLoadOptions = debounce(loadOptions, 500, { leading: true });

  return (
    <AsyncSelect<EmissionFactorOption>
      placeholder="Search Climatiq ..."
      value={selectedOption}
      onChange={
        onChange ? (option) => onChange(option?.emissionFactor) : undefined
      }
      defaultOptions
      loadOptions={debouncedLoadOptions}
      cacheOptions={true}
      noOptionsMessage={({ inputValue }) =>
        inputValue.length >= minSearchLength
          ? `No results for "${inputValue}"`
          : "Search for an emission factor"
      }
      formatOptionLabel={(
        { emissionFactor: ef }: EmissionFactorOption,
        {
          context,
          inputValue,
          selectValue,
        }: FormatOptionLabelMeta<EmissionFactorOption>,
      ) => {
        return (
          <div className="d-flex align-items-center gap-2">
            <RegionIcon region={ef.region} size={20} />
            <span>{ef.name}</span>
            <span
              className="ms-auto text-secondary font-monospace"
              style={{
                fontSize: ".8em",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              ({ef.id})
            </span>
            <div className="">
              <WithTooltip tooltip={`Unit type: ${ef.unitType}`}>
                <UnitTypeIcon
                  climatiqName={ef.unitType}
                  className="text-secondary small"
                />
              </WithTooltip>
            </div>
          </div>
        );
      }}
      styles={buildSelectStyles(styles)}
    />
  );
};

export default ClimatiqFactorInput;

type ClimatiqUnitTypeFilterBadgeProps = {
  unitType: string;
  onRemove: () => void;
} & BadgeProps;

export const ClimatiqUnitTypeFilterBadge = styled(
  ({ unitType, onRemove, ...props }: ClimatiqUnitTypeFilterBadgeProps) => {
    return (
      <WithTooltip tooltip={`Unit type: ${unitType}`}>
        <Badge bg="light" text="dark" {...props}>
          <UnitTypeIcon climatiqName={unitType} />
          <FaXmark className="remove-icon" onClick={onRemove} />
        </Badge>
      </WithTooltip>
    );
  },
)`

  &.badge {
    padding: 6px;
    font-size: 1em;
    display: flex;
    align-items: center;
    .remove-icon {
      margin-left: 2px;
      cursor: pointer;
      opacity: .5;
      &:hover {
        opacity: 1;
        color: var(--bs-danger);
      }
    }
  }

`;
