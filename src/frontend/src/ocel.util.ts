import { AppStateExport } from "@/src/app-state.types";
import { OCEL } from "@/src/ocel.types";
import JSZip from "jszip";
import _ from "lodash";

export function getObjectTypeActivities(
  ocel: OCEL,
  objectType: string | undefined,
) {
  return objectType
    ? ocel.activities.filter((act) => objectType in ocel.e2oCounts[act])
    : [];
}
export function getActivityObjectTypes(
  ocel: OCEL,
  activity: string | undefined,
) {
  return activity ? Object.keys(ocel.e2oCounts[activity] ?? {}) : [];
}
export function getQualifiers(
  ocel: OCEL,
  { activity, objectType }: { activity?: string; objectType?: string } = {},
) {
  // const objectTypeQualifiers = activity ? (ocel.e2oQualifierCounts[activity] ?? {}) : Object.values(ocel.e2oQualifierCounts).flat(1)
  if (activity) {
    const actQs = ocel.e2oQualifierCounts[activity] ?? {};
    if (objectType) {
      return Object.keys(actQs[objectType] ?? {});
    }
    return _.uniq(Object.values(actQs).map(Object.keys).flat(1));
  }
  const actQs = Object.values(ocel.e2oQualifierCounts);
  if (objectType) {
    return _.uniq(
      actQs.map((actQs) => Object.keys(actQs[objectType] ?? {})).flat(1),
    );
  }
  return _.uniq(actQs.flatMap(Object.values).flatMap(Object.keys));
}

export async function processOcelUpload(file: File) {
  const ext = file.name.split(".").at(-1);
  if (ext == "sqlite") {
    return {
      ocelBlob: file as Blob,
      ocelFileName: file.name,
    };
  } else if (ext == "zip") {
    // A zip file should contain the OCEL and a JSON preferences file, named like
    // "<x>.sqlite" and "<x>.sqlite.meta.json".

    const zip = await JSZip.loadAsync(file);
    const fileNames = Object.keys(zip.files);
    const ocelFileNames = fileNames.filter(
      (f) => f.split(".").at(-1) == "sqlite",
    );
    if (!ocelFileNames.length) {
      return {
        error:
          "The selected zip file does not contain a .sqlite object-centric event log.",
      };
    }
    if (ocelFileNames.length > 1) {
      return {
        error:
          "The selected zip file does not contain a unique .sqlite object-centric event log.",
      };
    }
    const ocelFileName = ocelFileNames[0];
    const jsonFileName = `${ocelFileNames}.meta.json`;
    if (!zip.files[jsonFileName]) {
      return {
        error: "The selected zip file does not contain JSON preferences.",
      };
    }
    let appState;
    try {
      appState = JSON.parse(
        await zip.files[jsonFileName].async("text"),
      ) as unknown as AppStateExport;
    } catch (err) {
      return { error: "The JSON preferences file is malformatted." };
    }

    const ocelBlob = await zip.files[ocelFileName].async("blob");
    return {
      ocelBlob,
      ocelFileName: ocelFileName,
      appState,
    };
  }

  return { error: "Please select a .sqlite or .zip file." };
}

// export function copyAttributeUnits(ocel: OCEL, appState?: AppStateExport) {

//   if (!appState || !appState?.attributeUnits) {
//     return
//   }
//   // TODO
//   appState.attributeUnits.forEach(appStateAttr => {
//     const attr = ocel.attributes.find(ocelAttr => ocelAttr.target == "object" && ocelAttr.objectType == appStateAttr.objectType && ocelAttr.name == appStateAttr.name)
//     if (attr && attr.numeric && appStateAttr.unit) {
//       console.log(`Set attribute unit of "${attr.name}" := [${appStateAttr.unit.symbol}]`)
//       attr.unit = appStateAttr.unit
//     }
//   })

// }
