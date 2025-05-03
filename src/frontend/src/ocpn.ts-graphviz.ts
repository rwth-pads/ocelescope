import { quantityString } from "@/components/Quantity";
import { OCPN, ProcessEmissions } from "@/src/api/generated";
import { ObjectTypeColors } from "@/src/app-state.types";
import { OCEL } from "@/src/ocel.types";
import chroma from "chroma-js";
import _ from "lodash";
import {
  Digraph,
  Edge,
  EdgeAttributes,
  Node,
  NodeAttributes,
  toDot,
} from "ts-graphviz";

export function getEmissionColorScale(
  values: number[],
  {
    log = true,
  }: {
    log?: boolean;
  },
) {
  if (!values.length) {
    values = [0];
  }
  if (log) {
    values = values.map((x) => Math.log(1 + x));
  }
  const min = Math.min(...values),
    max = Math.max(...values);

  // Color scales from https://colorbrewer2.org
  if (min >= 0) {
    // sequential color scale
    return chroma.scale("PuRd").domain([min, max]);
  } else {
    // diverging color scale, if there are negative emissions
    return chroma.scale("PiYG").domain([min, max]);
  }
}

export const fontColors = [chroma("white"), chroma("black")];
export function maximizeContrast(
  colors: chroma.Color[],
  ref: chroma.Color,
): chroma.Color {
  return _.maxBy(colors, (c) => chroma.contrast(ref, c)) ?? chroma("#cccccc");
}

export type OcpnRenderOptions = {
  rankdir?: "TB" | "LR";
  fontsize?: number;
  showActivityEmissions?: boolean;
  fontname?: string;
};

function withClass(
  className: string,
  attributes: NodeAttributes,
): NodeAttributes;
function withClass(
  className: string,
  attributes: EdgeAttributes,
): EdgeAttributes;
function withClass(className: string, attributes: any) {
  return {
    ...attributes,
    class: className,
  };
}
function withAttrs(
  moreAttributes: { [k: string]: string },
  attributes: NodeAttributes,
): NodeAttributes;
function withAttrs(
  moreAttributes: { [k: string]: string },
  attributes: EdgeAttributes,
): EdgeAttributes;
function withAttrs(moreAttributes: { [k: string]: string }, attributes: any) {
  return {
    ...attributes,
    ...moreAttributes,
  };
}

export function renderOcpn(
  ocpn: OCPN,
  ocel: OCEL,
  objectTypeColors: ObjectTypeColors | null,
  emissions: ProcessEmissions | undefined,
  {
    rankdir = "TB",
    fontsize = 11,
    showActivityEmissions = true,
    fontname = "Times New Roman",
  }: OcpnRenderOptions,
): string {
  if (!objectTypeColors) {
    objectTypeColors = Object.fromEntries(
      ocel.objectTypes.map((ot) => [ot, chroma("white")]),
    );
  }

  // Find best font colors for object types
  const objectTypeFontColors = Object.fromEntries(
    Object.entries(objectTypeColors).map(([ot, color]) => {
      return [
        ot,
        maximizeContrast(
          fontColors,
          (objectTypeColors as ObjectTypeColors)[ot],
        ),
      ];
    }),
  );
  const objectTypeColor = (
    objectType: string | undefined,
    spec:
      | "background"
      | "font"
      | "border"
      | "bg-subtle"
      | "border-subtle" = "background",
  ) => {
    if (spec == "font") {
      return (
        (objectType ? objectTypeFontColors[objectType]?.hex() : undefined) ??
        "white"
      );
    }
    if (spec == "border-subtle") {
      return (
        (objectType
          ? (objectTypeColors as ObjectTypeColors)[objectType]
              ?.brighten(0)
              .hex()
          : undefined) ?? "--bs-gray-600"
      );
    }
    if (spec == "bg-subtle") {
      return (
        (objectType
          ? (objectTypeColors as ObjectTypeColors)[objectType]
              ?.brighten(2)
              .hex()
          : undefined) ?? "--bs-gray-400"
      );
    }
    if (spec == "border") {
      return (
        (objectType
          ? (objectTypeColors as ObjectTypeColors)[objectType]?.darken(1).hex()
          : undefined) ?? "var(--bs-gray-800)"
      );
    }
    return (
      (objectType
        ? (objectTypeColors as ObjectTypeColors)[objectType]?.hex()
        : undefined) ?? "var(--bs-gray-600)"
    );
  };

  const nodeMap: { [key: string]: string } = {};
  const newNode = (key: string) => {
    const id = (Object.keys(nodeMap).length + 1).toString();
    nodeMap[key] = id;
    return id;
  };
  const places = new Set([
    ...Object.values(ocpn.structure.sourcePlaces),
    ...Object.values(ocpn.structure.places).flat(1),
    ...Object.values(ocpn.structure.targetPlaces),
  ]);
  const transitions = new Set([
    ...Object.values(ocpn.structure.activityTransitions),
    ...Object.values(ocpn.structure.silentTransitions).flat(1),
  ]);
  const getObjectType = (place: string) => {
    return ocpn.objectTypes.find((objectType) => {
      if (ocpn.structure.sourcePlaces[objectType] == place) return true;
      if (ocpn.structure.targetPlaces[objectType] == place) return true;
      if (ocpn.structure.places[objectType].includes(place)) return true;
      return false;
    });
  };
  const getActivity = (transition: string) => {
    return ocel.activities.find((activity) =>
      _.get(ocpn.structure.activityTransitions, activity)?.includes(transition),
    );
  };

  const G = new Digraph(undefined, {
    rankdir: rankdir,
    fontsize: fontsize.toString(),
    fontname: fontname,
  });

  // inner sep = margin. default: 0.11,0.055

  ocpn.objectTypes.forEach((objectType) => {
    G.addNode(
      new Node(
        newNode(ocpn.structure.sourcePlaces[objectType]),
        withClass("source-place", {
          label: objectType,
          fontsize: fontsize,
          fontname: fontname,
          shape: "rect",
          style: "rounded, filled",
          fillcolor: objectTypeColor(objectType),
          color: objectTypeColor(objectType, "border"),
          fontcolor: objectTypeColor(objectType, "font"),
        }),
      ),
    );

    G.addNode(
      new Node(
        newNode(ocpn.structure.targetPlaces[objectType]),
        withClass("target-place", {
          label: objectType,
          fontsize: fontsize,
          fontname: fontname,
          shape: "underline",
          fillcolor: "transparent",
          color: objectTypeColor(objectType),
          fontcolor: objectTypeColor(objectType),
        }),
      ),
    );

    ocpn.structure.places[objectType]
      .filter(
        (node) =>
          node != ocpn.structure.sourcePlaces[objectType] &&
          node != ocpn.structure.targetPlaces[objectType],
      )
      .forEach((node) => {
        G.addNode(
          new Node(
            newNode(node),
            withClass("place", {
              label: " ",
              shape: "circle",
              style: "filled",
              fillcolor: objectTypeColor(objectType, "bg-subtle"),
              color: objectTypeColor(objectType, "border-subtle"),
              fontcolor: "black",
            }),
          ),
        );
      });

    ocpn.structure.silentTransitions[objectType].forEach((node, i) => {
      G.addNode(
        new Node(
          newNode(node),
          withClass("silent-transition", {
            label: "",
            shape: "rect",
            margin: "0,0",
            width: "0.4",
            height: "0.4",
            style: "filled",
            fillcolor: objectTypeColor(objectType, "bg-subtle"),
            color: objectTypeColor(objectType, "border-subtle"),
          }),
        ),
      );
    });
  });

  const activityEmissionColorScale =
    showActivityEmissions && emissions
      ? getEmissionColorScale(
          Object.values(emissions?.activityEmissions).map(
            (stats) => stats.mean,
          ),
          { log: true },
        )
      : undefined;

  Object.entries(ocpn.structure.activityTransitions).forEach(
    ([activity, node]) => {
      const activityObjectTypes = Object.keys(ocel.e2oCounts[activity] ?? {});
      const visibleActivityObjectTypes = activityObjectTypes.filter(
        (objectType) => ocpn.objectTypes.includes(objectType),
      );
      const uniqueObjectType =
        visibleActivityObjectTypes.length == 1
          ? visibleActivityObjectTypes[0]
          : undefined;

      const [transitionAttrs, emissionLabelAttrs] = ((): [
        NodeAttributes,
        NodeAttributes | undefined,
      ] => {
        if (emissions && activityEmissionColorScale) {
          // Show activity emission as background
          const thisActivityEmissions = emissions.activityEmissions[activity];
          const thisActivityCount = ocel.activityCounts[activity];

          // TODO better way to specify if using logarithmic scale
          const logScale = true;
          const activityEmissionColor = activityEmissionColorScale(
            logScale
              ? Math.log(1 + thisActivityEmissions.mean)
              : thisActivityEmissions.mean,
          );

          return [
            {
              style: "filled",
              color: objectTypeColor(uniqueObjectType),
              fillcolor: activityEmissionColor.hex(),
              fontcolor: maximizeContrast(
                fontColors,
                activityEmissionColor,
              ).hex(),
            },
            thisActivityEmissions.nonzero != 0
              ? {
                  shape: "rect",
                  style: "filled",
                  label:
                    "Ø " +
                    quantityString({
                      value: thisActivityEmissions.mean,
                      unit: emissions.unit,
                    }),
                  color: activityEmissionColor.hex(),
                  fillcolor: "white",
                  fontcolor: "black",
                }
              : undefined,
          ];
        } else {
          return [
            {
              // Don't show activity emissions
              color: objectTypeColor(uniqueObjectType),
              fontcolor: objectTypeColor(uniqueObjectType),
            },
            undefined,
          ];
        }
      })();

      // TODO "Object literal may only specify known properties, and 'class' does not exist in type 'NodeAttributes'."
      G.addNode(
        new Node(
          newNode(node),
          withAttrs(
            {
              class: "activity-transition",
              id: `activity-transition-${activity}`,
            },
            {
              shape: "rect",
              label: activity,
              fontsize: fontsize,
              fontname: fontname,
              ...transitionAttrs,
            },
          ),
        ),
      );

      // if (emissionLabelAttrs) {
      //   G.addNode(new Node(newNode(`activity_emission_label_${activity}`), withAttrs({
      //     class: "activity-emission-label",
      //     id: `activity-emission-label-${activity}`
      //   }, emissionLabelAttrs)))
      // }
    },
  );

  ocpn.structure.arcs.forEach(({ source, target, double }) => {
    const placeToTransition = places.has(source) && transitions.has(target);
    const transitionToPlace = transitions.has(source) && places.has(target);
    const sourceNode = G.getNode(nodeMap[source]);
    const targetNode = G.getNode(nodeMap[target]);
    if (
      (!placeToTransition && !transitionToPlace) ||
      !sourceNode ||
      !targetNode
    ) {
      console.warn(`OCPN contains irregular arc (${source} -> ${target})`);
      return;
    }
    const place = placeToTransition ? source : target;
    const transition = placeToTransition ? target : source;
    const objectType = getObjectType(place);
    const activity = getActivity(transition);
    const isTransitionSilent = activity === undefined;
    if (!objectType) {
      console.warn(`OCPN contains irregular arc (${source} -> ${target})`);
      return;
    }
    const color = objectTypeColor(objectType, "border");
    G.addEdge(
      new Edge([sourceNode, targetNode], {
        class: "arc",
        color: double ? `${color}:${color}` : color,
        penwidth: double ? 1.25 : 1.75,
      } as unknown as EdgeAttributes),
    );
  });

  return toDot(G);
}
