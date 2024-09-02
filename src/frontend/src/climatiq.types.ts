
import { Mutex } from "async-mutex";
import { IconType } from "react-icons";
import { FaEarthAfrica, FaEarthAmericas, FaEarthAsia, FaEarthEurope, FaEarthOceania } from "react-icons/fa6";
import { Api } from "./openapi";
import { Unit } from "./units.types";
import { objectKeysToCamelCase, objectKeysToSnakeCase, objectToUrl, removeEmptyProperties } from "./util";

export type ClimatiqConfig = {
  apiKey?: string
  dataVersion?: number
}

// https://www.climatiq.io/docs/guides/understanding/data-quality#data-quality-flags
export type DataQualityFlag = "notable_methodological_variance" | "partial_factor" | "self_reported" | "suspicious_homogeneity" | "erroneous_calculation"
export const defaultAllowedDataQualityFlags: DataQualityFlag[] = ["notable_methodological_variance", "partial_factor"]

export type AccessType = "private" | "public" | "premium"
export type CalculationMethod = "ar4" | "ar5" | "ar6"

// apparently some fields got changed: https://www.climatiq.io/docs/api-reference/search#response
// TODO use generated backend model!
export type ClimatiqEmissionFactor = {
  activityId: string
  id: string
  name: string
  category: string
  sector: string
  // TODO use Source type here
  source: string
  sourceLink: string
  sourceDataset: string
  uncertainty: number | null
  year: number
  yearReleased: number
  region: Region
  // region: string
  // regionName: string
  description: string
  unitType: string  // TODO docu suggests this is an array, API returns single string
  unit: string
  sourceLcaActivity: string
  dataQualityFlags: DataQualityFlag[]
  accessType: AccessType
  supportedCalculationMethods: CalculationMethod[]
  factor?: number
  factorCalculationMethod: CalculationMethod | null
  factorCalculationOrigin: "climatiq" | "source" | null
  constituentGases: { [gas: string]: number }
}

export type ClimatiqSearchRequest = {
  page: number
  resultsPerPage: number

  query?: string
  activityId?: string
  id?: string

  category?: string[]
  sector?: string[]
  source?: string[]
  sourceDataset?: string[]
  year?: number[]
  region?: string[]
  unitType?: string[]
  sourceLcaActivity?: string[]
  calculationMethod?: CalculationMethod[]
  allowedDataQualityFlags?: DataQualityFlag[]
  accessType?: AccessType[]

}

export type ClimatiqSearchResponse = {
  currentPage: number
  lastPage: number
  totalResults: number
  results: ClimatiqEmissionFactor[]
  possibleFilters: ClimatiqPossibleFiltersList
}

export type ClimatiqDataVersionsResponse = {
  latestRelease: string
  latest?: string
  latestMajor?: number
  latestMinor?: number
}

export type ClimatiqErrorResponse = {
  error: string
  errorCode: string | null
  message: string
}

export type Region = { id: string, name: string, countryCode?: string, hasCountry: boolean, Icon?: IconType }
export type Source = { source: string, datasets: string[] }
// https://www.climatiq.io/docs/api-reference/search#possible_filters
// export type ClimatiqPossibleFiltersList = Pick<ClimatiqSearchRequest, "category" | "sector" | "year" | "unitType" | "sourceLcaActivity" | "accessType"> & {
//   region: Region[]
//   source: Source[]
//   dataQualityFlags: DataQualityFlag[]
// }
export type ClimatiqPossibleFiltersList = {
  year: number[]
  source: Source[]
  region: Region[]
  category: string[]
  sector: string[]
  unitType: string[]
  sourceLcaActivity: string[]
  accessType: AccessType[]
  dataQualityFlags: DataQualityFlag[]
}

const ALLOWED_SINGLE_FILTERS = ["activity_id", "id"]
const ALLOWED_LIST_FILTERS = ["category", "sector", "source", "source_dataset", "year", "region", "unit_type", "source_lca_activity", "calculation_method", "allowed_data_quality_flags", "access_type"]

const climatiqApiUrl = "https://api.climatiq.io/data/v1"

let requestCount = 0
const climatiqApiMutex = new Mutex()

export function validateClimatiqApiKey(config: ClimatiqConfig) {
  const apiKey = config.apiKey ?? process.env.NEXT_PUBLIC_CLIMATIQ_API_KEY
  if (!apiKey || !apiKey.match("^[A-Z0-9]+$")) {
    throw Error(`No valid climatiq API key supplied.`)
  }
  return apiKey
}

export async function climatiqDataVersionRequest(
  config: ClimatiqConfig
): Promise<number | false> {
  const apiKey = validateClimatiqApiKey(config)
  const responseData = (await runClimatiqRequest("data-versions", {}, apiKey)) as ClimatiqDataVersionsResponse | false
  if (responseData === false) return false
  return Number.parseInt(responseData.latestRelease)
}

export async function climatiqSearchRequest(
  request: ClimatiqSearchRequest,
  config: ClimatiqConfig
): Promise<ClimatiqSearchResponse | false> {

  const apiKey = validateClimatiqApiKey(config)
  const dataVersion = config.dataVersion ?? process.env.NEXT_PUBLIC_CLIMATIQ_DATA_VERSION

  const { page, resultsPerPage, query, ...rest } = request
  const formData: any = { dataVersion, page, resultsPerPage }
  if (query) {
    formData.query = query
  }
  const filters = objectKeysToSnakeCase(rest)

  // Check for valid filter keys
  const unknownFilters = Object.keys(filters).filter(k => !ALLOWED_SINGLE_FILTERS.includes(k) && !ALLOWED_LIST_FILTERS.includes(k))
  if (unknownFilters.length) {
    console.error(`The following parameters are not defined in the climatiq "search" API: ` + unknownFilters.join(", "))
    return false
  }

  // Convert lists of values to comma-separated strings to pass to the API
  Object.assign(formData, Object.fromEntries(Object.entries(filters).map(([key, value]) => {
    if (value === undefined || value === null) {
      return [key, undefined]
    }
    if (typeof value === "string") {
      return [key, value]
    }
    if (Array.isArray(value)) {
      if (!value.length) {
        return [undefined, undefined]
      }
      if (value.length == 1) {
        return [key, value[0]]
      }
      if (!ALLOWED_LIST_FILTERS.includes(key)) {
        console.error(`The parameter "${key}" only accepts a single value in the climatiq "search" API, received list-like ${JSON.stringify(value)}`)
        return [undefined, undefined]
      }
      return [key, value.join(",")]
    }
    console.error(`The parameter "${key}" has a wrong type to be passed to the climatiq "search" API: "${typeof value}"`)
    return [undefined, undefined]
  }).filter(([k, v]) => k !== undefined && v !== undefined)))

  const responseData = await runClimatiqRequest("search", formData, apiKey) as ClimatiqSearchResponse | false
  if (responseData === false) return false

  responseData.results = responseData.results.map(objectKeysToCamelCase).map(res => {
    const { unitType, region, regionName, constituentGases, ...rest } = res
    return {
      ...removeEmptyProperties(rest),
      region: initRegion(region, regionName),
      unitType: unitType,  // TODO docu suggests this is an array, API returns single string
      constituentGases: removeEmptyProperties(constituentGases, { removeZero: true })
    }
  }) as ClimatiqEmissionFactor[]
  responseData.possibleFilters = objectKeysToCamelCase(responseData.possibleFilters) as ClimatiqPossibleFiltersList

  if (!("possibleFilters" in responseData)) throw Error()
  responseData.possibleFilters.region = responseData.possibleFilters.region.map(({ id, name }) => initRegion(id, name))

  return responseData

}

async function runClimatiqRequest(
  route: string,
  formData: object,
  apiKey: string
): Promise<ClimatiqSearchResponse | ClimatiqDataVersionsResponse | false> {

  return await climatiqApiMutex.runExclusive(async () => {

    // TODO replace console.error by setErrorMessage?
    console.log(`climatiq request ${++requestCount}`, formData)

    const encodedFormData = objectToUrl(objectKeysToSnakeCase(formData))
    // Send API request with event log attached
    let response
    try {
      response = await fetch(`${climatiqApiUrl}/${route}?${encodedFormData}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          // "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        }
      })
    } catch (e) {
    }
    // setLoadingText(null)

    if (!response) {
      console.error(`Climatiq API call to "${route}" failed.`)
      return false
    }
    if (!response.ok) {
      const responseText = await response.text()
      console.error(`Climatiq API call to "${route}" failed (Error ${response.status} ${response.statusText}: ${responseText}).`)
      // setErrorMessage(`Server error: ${responseText}`)
      return false
    }

    // Handle response
    const responseData = objectKeysToCamelCase(await response.json())
    if ("error" in responseData) {
      console.error(`Climatiq API call to "${route}" failed (${[responseData.error, responseData.errorCode].filter(x => x).join(" / ")}: ${responseData.message}`)
      return false
    }
    console.log(`response ${requestCount}`, responseData)
    return responseData as ClimatiqSearchResponse | ClimatiqDataVersionsResponse

  })

}

export function initRegion(id: string, name: string): Region {
  const region: Region = { id, name, hasCountry: true }
  const match = region.id.match(/^(?<countryCode>[A-Z]{2})(?:\-.*)?$/)
  if (match?.groups) {
    region.countryCode = match.groups.countryCode.toLowerCase()
  }
  const macroRegion = climatiqMacroRegions.find(mr => mr.id == id)
  if (macroRegion) {
    region.Icon = macroRegion.Icon
  }
  region.hasCountry = !(macroRegion || region.id == "EU")
  return region
}


export type ClimatiqUnitType = {
  unitType: string
  unitTypeLabel: string
  units?: (string | null)[]
  composedUnitTypes?: [string, string]
  composedUnits?: { [unitType: string]: (string | null)[] }
}

/**
 * @deprecated not needed any more since UnitEditor replaced UnitSelection
 */
export function createAllUnits(unitTypes: ClimatiqUnitType[] | undefined): (Unit | null)[] {
  if (!unitTypes) return []

  return unitTypes.map(ut => {

    if (ut.units) {
      return ut.units.map(u => u ? {
        unitType: ut.unitType,
        unitTypeLabel: ut.unitTypeLabel,
        unit: u
      } : null)  // TODO null is only returned for ut "Number". Might still change to Unit obj with unit = undefined.
    }
    if (ut.composedUnits && ut.composedUnitTypes) {
      const uts = ut.composedUnitTypes
      const utUnits = ut.composedUnits
      if (ut.composedUnitTypes.length != 2 || Object.values(ut.composedUnits).length != 2) {
        console.error(`Only supporting product unit types of up to two factors (encountered ${uts.join(", ")})`)
        return undefined
      }
      return (utUnits[uts[0]] ?? [null]).map(u1 => {
        return (utUnits[uts[1]] ?? [null]).map(u2 => {
          if (!u1 && !u2) {
            console.error(`Composed unit types should have at least one physical (continuous) unit type (encountered ${uts.join(", ")})`)
            return undefined
          }
          u1 = u1 ?? uts[0].toLowerCase()
          u2 = u2 ?? uts[1].toLowerCase()
          return {
            unitType: ut.unitType,
            unitTypeLabel: ut.unitTypeLabel,
            unit: `${u1}-${u2}`
          }
        })
      }).flat(1)
    }
    return undefined

  }).flat(1).filter(u => u !== undefined) as (Unit | null)[]

}

export async function loadClimatiqUnitTypes(): Promise<ClimatiqUnitType[]> {

  const unitTypesData = await Api.getClimatiqUnitsClimatiqUnitsListGet()

  const unitTypes: (ClimatiqUnitType | undefined)[] = unitTypesData.map(({ unitType, units }) => {
    const divParts = unitType.split("Per")
    if (divParts.length != 1) {
      console.error(`Quotient unit types not supported yet.`)
      return undefined
    }
    const multParts = unitType.split("Over")

    const ut: ClimatiqUnitType = {
      unitType: unitType,
      unitTypeLabel: multParts.join(" over ")
    }

    if (multParts.length == 1) {
      // Atomic unit
      const ut1 = ut.unitType.toLowerCase()
      ut.units = units[`${ut1}_unit`] ?? [null]
    } else if (multParts.length == 2) {
      // Composed unit (product of two atomic units)
      const [ut1, ut2] = multParts.map(p => p.toLowerCase())
      ut.composedUnitTypes = [ut1, ut2]
      ut.composedUnits = {
        [ut1]: units[`${ut1}_unit`] ?? [null],
        [ut2]: units[`${ut2}_unit`] ?? [null]
      }
    } else {
      console.error(`Only supporting product unit types of up to two factors (encountered ${multParts.join(", ")})`)
      return undefined
    }
    return ut

  })

  return unitTypes.filter(ut => ut) as ClimatiqUnitType[]

}

const importantUnitTypes = ["weight", "energy", "distance", "time"]

export function sortUnits(unit: Unit | null) {
  return [
    !unit ? 0 : 1,
    // ...sortClimatiqUnitTypes(unit?.unitType),
    unit?.dim.length,
    JSON.stringify(unit?.dim),
    unit?.symbol,
    unit?.name,
  ]
}

export function sortClimatiqUnitTypes(climatiqName: string | null | undefined) {
  if (!climatiqName) {
    return [0, 0, 0, 0, 0]
  }
  const importance = importantUnitTypes.indexOf(climatiqName.toLowerCase())
  const partImportance = importantUnitTypes.findIndex(u => climatiqName.toLowerCase().includes(u))
  const isComposed = !!climatiqName.match(/^[A-Z]\w+Over[A-Z]\w+$/)
  return [
    1,
    importance != -1 ? importance : importantUnitTypes.length,
    partImportance != -1 ? partImportance : importantUnitTypes.length,
    isComposed ? 1 : 0,
    climatiqName,
  ]
}

export type MacroRegion = { id: string, name: string, Icon: IconType | undefined }

export const climatiqMacroRegions = [
  { "id": "AFRICA", "name": "Africa", "Icon": FaEarthAfrica },
  { "id": "ROW_WF", "name": "Africa except Egypt and South Africa", "Icon": FaEarthAfrica },
  { "id": "ASIA_AFRICA", "name": "Asia and Africa", "Icon": FaEarthAsia },
  { "id": "ROW_WA", "name": "Central Asia and Pacific Asia, Oceania, Antarctica", "Icon": FaEarthAsia },
  { "id": "ROW_WE", "name": "East Europe and Iceland", "Icon": FaEarthEurope },
  { "id": "EURASIA", "name": "Europe and Eurasia", "Icon": FaEarthAsia },
  { "id": "EU_S_AMERICA", "name": "Europe and South America", "Icon": FaEarthAmericas },
  { "id": "GLOBAL", "name": "Global", "Icon": FaEarthAsia },
  { "id": "LATAM", "name": "Latin America", "Icon": FaEarthAmericas },
  { "id": "ROW_WL", "name": "Latin America except Brazil", "Icon": FaEarthAmericas },
  { "id": "MIDDLE_EAST", "name": "Middle East", "Icon": FaEarthAsia },
  { "id": "ROW_WM", "name": "Middle East, Asia and Egypt", "Icon": FaEarthAsia },
  { "id": "N_AMERICA", "name": "North America", "Icon": FaEarthAmericas },
  { "id": "OCEANIA", "name": "Oceania", "Icon": FaEarthOceania },
  { "id": "OTHER_ASIA", "name": "Other Asia", "Icon": FaEarthAsia },
  { "id": "ROW", "name": "Rest-of-World", "Icon": FaEarthAfrica },
  { "id": "WEU", "name": "Western Europe", "Icon": FaEarthEurope }
]
