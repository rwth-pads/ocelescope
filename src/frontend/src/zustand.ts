import { initialPageState, PageState } from "@/components/layout/Layout";
import {
  ObjectAllocationConfig,
  OCPN,
  ProcessEmissions,
} from "@/src/api/generated/types.gen";
import { create } from "zustand";
import { ApiF, BackendTask } from "./api.types";
import { AppState, initialAppState } from "./app-state.types";
import { ClimatiqConfig, ClimatiqUnitType } from "./climatiq.types";
import { OCEL } from "./ocel.types";
import {
  createSelectors,
  createStateSelectors,
  DispatchSetStateActionStateSetters,
  withSetters,
} from "./zustand.util";

export type State = PageState &
  AppState & {
    // General
    session: string | undefined;
    ocel: OCEL | undefined;
    apiState: string | undefined;
    tasks: BackendTask<ApiF>[];
    climatiqUnits: ClimatiqUnitType[] | null;
    climatiqConfig: ClimatiqConfig;
    isClimatiqSettingsOpen: boolean;
    isEmissionAttributeSelectionOpen: boolean;

    // Results
    ocpn: OCPN | undefined;
    emissions: ProcessEmissions | undefined;
    objectEmissionResults:
      | {
          objectEmissions: { [oid: string]: number };
          objectAllocationConfig: ObjectAllocationConfig;
        }
      | undefined;
  };

export type Action = DispatchSetStateActionStateSetters<State>;
export type OceanStore = State & Action;

const useOceanStoreBase = create<OceanStore>((set) =>
  withSetters<State, Action>(set, {
    // General
    session: undefined,
    ocel: undefined,
    apiState: undefined,
    tasks: [],
    climatiqUnits: null,
    climatiqConfig: {
      apiKey: process.env.NEXT_PUBLIC_CLIMATIQ_API_KEY,
      dataVersion: process.env.NEXT_PUBLIC_CLIMATIQ_DATA_VERSION,
    },
    isClimatiqSettingsOpen: false,
    isEmissionAttributeSelectionOpen: false,

    // Global page state
    ...initialPageState,

    // AppState
    ...initialAppState,

    // Results
    ocpn: undefined,
    emissions: undefined,
    objectEmissionResults: undefined,
  }),
);

export const useOceanStore = createStateSelectors(
  createSelectors(useOceanStoreBase),
);

export const selectAppState: (store: OceanStore) => AppState = ({
  objectTypeColors,
  objectTypeClasses,
  attributeUnits,
  emissionAttributes,
  emissionRules,
  objectAllocationConfig,
}) => ({
  objectTypeColors,
  objectTypeClasses,
  attributeUnits,
  emissionAttributes,
  emissionRules,
  objectAllocationConfig,
});

export const useHandlingUnits: (
  store: Pick<OceanStore, "ocel" | "objectTypeClasses">,
) => string[] | undefined = ({ ocel, objectTypeClasses }) => {
  if (!ocel) return undefined;
  return ocel.objectTypes.filter((ot) => {
    if (!objectTypeClasses) return true;
    if (!(ot in objectTypeClasses)) return true;
    return objectTypeClasses[ot] == "handling_unit";
  });
};

export const useResources: (
  store: Pick<OceanStore, "ocel" | "objectTypeClasses">,
) => string[] | undefined = ({ ocel, objectTypeClasses }) => {
  const handlingUnits = useHandlingUnits({ ocel, objectTypeClasses });
  if (!ocel) return undefined;
  if (handlingUnits === undefined) throw Error();
  return ocel.objectTypes.filter((ot) => !handlingUnits.includes(ot));
};

export const useHandlingUnitsAndResources: (
  store: Pick<OceanStore, "ocel" | "objectTypeClasses">,
) => {
  handlingUnits?: string[];
  resources?: string[];
} = ({ ocel, objectTypeClasses }) => {
  const handlingUnits = useHandlingUnits({ ocel, objectTypeClasses });
  const resources = useResources({ ocel, objectTypeClasses });
  return { handlingUnits, resources };
};

// const \[(.*), set.*\: (.*) \| undefined>\(\)
// const \[(.*), set.*\: (.*[])>\(\)
