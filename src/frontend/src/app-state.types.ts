import {
  ApiF,
  ApiRequestOptions,
  ApiResponseType,
  ApiWrapper,
} from "@/src/api.types";
import {
  AppState_Output,
  E2OEmissionRule_Output,
  EventAttributeDefinition,
  EventEmissionRule_Output,
  ObjectAllocationConfig,
  ObjectAttributeDefinition,
} from "@/src/api/generated";
import {
  OCEL,
  OCELAttribute,
  isEventAttribute,
  isObjectAttribute,
} from "@/src/ocel.types";
import chroma from "chroma-js";
import { isEmissionRuleEmpty } from "./emissions.types";
import { Unit } from "./units.types";
import { useOceanStore } from "./zustand";

export type ObjectTypeColors = Record<string, chroma.Color>;
export type ObjectTypeClasses = AppState_Output["objectTypeClasses"];
export type AttributeDefinition =
  | EventAttributeDefinition
  | ObjectAttributeDefinition;
export type EmissionRule = EventEmissionRule_Output | E2OEmissionRule_Output;

export type AppState = {
  objectTypeColors: ObjectTypeColors | null;
  objectTypeClasses: ObjectTypeClasses | null;
  attributeUnits: AttributeDefinition[];
  emissionAttributes: AttributeDefinition[];
  emissionRules: EmissionRule[];
  objectAllocationConfig: ObjectAllocationConfig | null;
};

export const initialAppState: AppState = {
  objectTypeColors: null,
  objectTypeClasses: null,
  attributeUnits: [],
  emissionAttributes: [],
  emissionRules: [],
  objectAllocationConfig: null,
};

export type ReplaceTypeRecursively<T, S, R> = T extends S
  ? R
  : T extends object
    ? {
        [P in keyof T]: ReplaceTypeRecursively<T[P], S, R>;
      }
    : T;

export type AppStateExport = ReplaceTypeRecursively<
  AppState,
  chroma.Color,
  string
>;

/**
 * For a list of attribute data, inits empty attribute unit definitions
 * @param attributes
 * @returns
 */
export function buildOcelAttributeUnitDefinitions(
  attributes: OCELAttribute[],
): AttributeDefinition[] {
  return attributes
    .map((attr) => {
      if (!attr.numeric) {
        return undefined;
      }
      if (isObjectAttribute(attr)) {
        return {
          target: "object",
          objectType: attr.objectType,
          dynamic: attr.dynamic,
          name: attr.name,
        };
      }
      if (isEventAttribute(attr)) {
        return {
          target: "event",
          activity: attr.activity,
          name: attr.name,
        };
      }
    })
    .filter((x) => x !== undefined) as AttributeDefinition[];
}

export function findOcelAttributeUnitDefinitionIndex(
  attr: OCELAttribute,
  attributeUnits: AttributeDefinition[],
) {
  return attributeUnits.findIndex((au) => {
    if (au.name != attr.name) return false;
    if (
      au.target == "object" &&
      isObjectAttribute(attr) &&
      au.objectType == attr.objectType &&
      au.dynamic == attr.dynamic
    )
      return true;
    if (
      au.target == "event" &&
      isEventAttribute(attr) &&
      au.activity == attr.activity
    )
      return true;
    return false;
  });
}

export function findOcelAttributeUnitDefinition(
  attr: OCELAttribute,
  attributeUnits: AttributeDefinition[],
) {
  const index = findOcelAttributeUnitDefinitionIndex(attr, attributeUnits);
  return index != -1 ? attributeUnits[index] : undefined;
}

export function findOcelAttribute(ocel: OCEL, def: AttributeDefinition) {
  return ocel.attributes.find((attr) => {
    if (attr.target != def.target) return false;
    if (attr.name != def.name) return false;
    if (
      attr.target == "event" &&
      def.target == "event" &&
      attr.activity == def.activity
    )
      return true;
    if (
      attr.target == "object" &&
      def.target == "object" &&
      attr.objectType == def.objectType
    ) {
      if (attr.dynamic != def.dynamic) throw Error();
      return true;
    }
    return false;
  });
}

export function useAttributeUnit(
  attr: OCELAttribute | undefined,
  // attributeUnits: AttributeDefinition[],
): Unit | null | undefined {
  // BEFORE: attributeUnits, setAttributeUnits needs to be passed to make this accessible outside of components.
  const attributeUnits = useOceanStore.use.attributeUnits();

  if (!attr || !attr.numeric) {
    return undefined;
  }
  const index = findOcelAttributeUnitDefinitionIndex(attr, attributeUnits);
  const attributeUnitDefinition =
    index !== -1 ? attributeUnits[index] : undefined;
  return attributeUnitDefinition?.unit;
}

export function useAttributeUnitState(
  attr: OCELAttribute | undefined,
  // attributeUnits: AttributeDefinition[],
  // setAttributeUnits: Dispatch<SetStateAction<AttributeDefinition[]>>
): {
  unit: Unit | null | undefined;
  setUnit: ((unit: Unit | null | undefined) => void) | undefined;
} {
  // BEFORE: attributeUnits, setAttributeUnits needs to be passed to make this accessible outside of components.

  const { attributeUnits, setAttributeUnits } =
    useOceanStore.useState.attributeUnits();

  if (!attr || !attr.numeric) {
    return { unit: undefined, setUnit: undefined };
  }

  const index = findOcelAttributeUnitDefinitionIndex(attr, attributeUnits);
  const attributeUnitDefinition =
    index !== -1 ? attributeUnits[index] : undefined;
  const unit = attributeUnitDefinition?.unit;
  if (index === -1 || !attributeUnitDefinition) {
    return { unit: undefined, setUnit: undefined };
  }

  const setUnit = (unit: Unit | null | undefined) =>
    setAttributeUnits((aus) => {
      // Change the unit inside an already existing attributeUnits entry
      // attr.unit = unit
      attributeUnitDefinition.unit = unit ?? undefined;
      return [
        ...aus.slice(0, index),
        {
          ...attributeUnitDefinition,
          unit: unit ?? undefined,
        },
        ...aus.slice(index + 1),
      ];
    });

  return { unit, setUnit };
}

/**
 * Converts the client-side appState into a JSON serializable format.
 * @param appState
 * @returns AppStateExport
 */
export function exportAppState(appState: AppState): AppStateExport {
  const attributeUnits =
    appState.attributeUnits?.filter((au) => !!au.unit) ?? [];
  return {
    objectTypeColors: appState.objectTypeColors
      ? Object.fromEntries(
          Object.entries(appState.objectTypeColors).map(
            ([objectType, color]) => [objectType, color.hex()],
          ),
        )
      : null,
    objectTypeClasses: appState.objectTypeClasses,
    attributeUnits: attributeUnits.length ? attributeUnits : [],
    emissionAttributes: appState.emissionAttributes.length
      ? appState.emissionAttributes
      : [],
    emissionRules: appState.emissionRules.length ? appState.emissionRules : [],
    objectAllocationConfig: appState.objectAllocationConfig,
  };
}

// TODO only called from apiRequest - move there?
export async function applyImportedAppState(
  appState: AppStateExport,
  session: string,
  ocel: OCEL,
  apiWrapper: ApiWrapper<any>,
) {
  // ocel and session might not be set yet - need parameter

  console.log("applyImportedAppState");
  // console.log(appState)

  const updates: Partial<AppState> = {};

  // ----- states loaded after setting OCEL ----------------------------------------------------

  if (appState.objectTypeColors) {
    updates.objectTypeColors = Object.fromEntries(
      Object.entries(appState.objectTypeColors).map(([objectType, hex]) => [
        objectType,
        chroma(hex),
      ]),
    );
  }
  if (appState.objectTypeClasses) {
    updates.objectTypeClasses = appState.objectTypeClasses;
    // Set object type classes
    // useOceanStore.setState(s => ({
    //   objectTypeClasses: appState.objectTypeClasses
    // }))
  }

  // Init attribute unit definitions
  const aus: AttributeDefinition[] = appState.attributeUnits ?? [];
  const ocelAttributeUnitDefinitions = ocel.attributes.map((attr) =>
    findOcelAttributeUnitDefinition(attr, aus),
  );
  const attributesWithoutUnitDefinition = ocel.attributes.filter(
    (attr, i) => ocelAttributeUnitDefinitions[i] === undefined,
  );
  const existingImportedUnitDefinitions = ocelAttributeUnitDefinitions.filter(
    (au) => au,
  ) as AttributeDefinition[];
  const emptyAttributeUnitDefinitions = buildOcelAttributeUnitDefinitions(
    attributesWithoutUnitDefinition,
  );
  // console.log("existing", existingUnitDefinitions)
  // console.log("new empty", emptyAttributeUnitDefinitions)
  // Update state to contain all imported attr definitions, and an empty unit definition for attributes missing
  updates.attributeUnits = [
    ...existingImportedUnitDefinitions,
    ...emptyAttributeUnitDefinitions,
  ];

  if (appState.emissionAttributes) {
    updates.emissionAttributes = appState.emissionAttributes;
  }
  if (appState.emissionRules) {
    updates.emissionRules = appState.emissionRules.filter(
      (ec) => !isEmissionRuleEmpty(ec),
    );
  }
  if (appState.objectAllocationConfig) {
    updates.objectAllocationConfig = appState.objectAllocationConfig;
  }

  // combined all state updates in one object and set jointly
  useOceanStore.setState((s) => updates);

  // ----- states that require an API call ----------------------------------------------------
  // const requests: (() => Promise<ApiResponse<any>>)[] = []
  // const requests: (() => Promise<ApiResponseType<ApiF>>)[] = []
  // const optionsList: ApiRequestOptions<any>[] = []
  // const commonOptions: ApiRequestOptions<any> = {
  //   skipMutex: true
  // }

  // TODO fix emission route
  // if (appState.emissionRules) {
  //   const emissionRules = appState.emissionRules.filter(ec => !isEmissionRuleEmpty(ec))
  //   useOceanStore.setState(s => ({
  //     emissionRules: appState.emissionRules  TODO not use the above?!
  //   }))

  //   requests.push(() => Api.computeEmissionsComputeEmissionsPost({
  //     oceanSessionId: session,
  //     requestBody: {
  //       rules: emissionRules.filter(ec => !isEmissionRuleEmpty(ec)) as unknown as (EventEmissionRule_Input | E2OEmissionRule_Input)[]
  //     }
  //   }))
  //   optionsList.push({
  //     loadingText: "Computing emissions",
  //     isComputeEmissions: true
  //   })
  // }

  // Execute API requests
  // if (apiWrapper !== undefined && requests.length) {
  //   const responses = await apiRequestSequence(apiWrapper, requests, optionsList, commonOptions)

  //   // TODO toast?

  // }

  console.log(`applyImportedAppState finished.`);
}

/**
 * Execute a sequence of api requests, compatible with celery tasks.
 * @param apiWrapper
 * @param requests List of request arguments
 * @param options List of options to pass to the single requests, overriding commonOptions
 * @param commonOptions Options to pass to all requests
 * @returns List of response objects
 */
export async function apiRequestSequence<F extends ApiF>(
  apiWrapper: ApiWrapper<F>,
  requests: (() => Promise<ApiResponseType<F>>)[],
  optionsList: ApiRequestOptions<F>[],
  commonOptions: ApiRequestOptions<F>,
): Promise<ApiResponseType<F>[]> {
  if (!requests.length) {
    return [];
  }

  return new Promise(async (resolve, reject) => {
    if (requests.length != optionsList.length) {
      reject("apiRequestSequence: requests/options length mismatch");
    }
    const [request, ...restRequests] = requests;
    const [options, ...restOptions] = optionsList;
    console.log(
      `apiRequestSequence: execute request (${restRequests.length} remaining after this)`,
    );

    apiWrapper(request, {
      ...commonOptions,
      ...options,
      onCompletion: async (response) => {
        if (!response) {
          return reject("Request failed");
        }

        // call the next request (recursively)
        const restResponses = await apiRequestSequence(
          apiWrapper,
          restRequests,
          restOptions,
          commonOptions,
        );
        return resolve([response, ...restResponses]);
      },
      // onFailure: async msg => {
      //   reject(msg)
      // }
    });
  });
}
