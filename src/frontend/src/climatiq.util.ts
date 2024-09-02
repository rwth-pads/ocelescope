import { Region, sortClimatiqUnitTypes } from "@/src/climatiq.types"

const priorityRegions = (process.env.NEXT_PUBLIC_PRIORITY_REGIONS ?? "").split(",")

export function getFilterValue(filterKey: string, value: any) {
  if (filterKey == "source") {
    return value.source
  }
  if (filterKey == "region") {
    return value.id
  }
  return value
}

export function filterValueOrder(filterKey: string, value: any) {
  if (filterKey == "source") {
    return value.source
  }
  if (filterKey == "region") {
    const region = value as Region
    if (!region.id) {
      console.log(value)
    }
    return [
      priorityRegions.includes(region.id) ? 0 : 1,  // priority regions to specify in .env
      region.hasCountry ? 1 : 0,  // ROW, EU, AFR ... < AE, ...
      region.countryCode,
      region.id.includes("-") ? 1 : 0,  // GB < GB-LDN
      region.name
    ]
  }
  if (filterKey == "year") {
    return -Number(value)
  }
  if (filterKey == "unitType") {
    return sortClimatiqUnitTypes(value)
  }
  return value
}
