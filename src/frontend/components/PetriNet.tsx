/* eslint-disable react-hooks/exhaustive-deps */
import { OCPN, ProcessEmissions } from "@/src/api/generated";
import { OCEL } from "@/src/ocel.types";
import { getEmissionColorScale, renderOcpn as ocpnToDot } from "@/src/ocpn.ts-graphviz";
import { useOceanStore } from "@/src/zustand";
import { IGraphvizProps } from "graphviz-react";
import $ from "jquery";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Root } from "react-dom/client";
import GraphvizContainer from "./GraphvizContainer";
import { quantityString } from "./Quantity";
import { useDimensions } from "./util";

let nextId = 1

const ActivityEmissionLabel: React.FC<React.SVGProps<SVGPolygonElement> & {
  activity: string
  activityTransition?: JQuery<SVGElement>
  emissions: ProcessEmissions
  ocel: OCEL
  activityEmissionColorScale: chroma.Scale
}> = ({ activity, activityTransition, emissions, ocel, activityEmissionColorScale }) => {
  const thisActivityEmissions = emissions.activityEmissions[activity]
  const thisActivityCount = ocel.activityCounts[activity]

  if (!activityTransition?.length) {
    return false
  }
  // const activityEmissionColor = activityEmissionColorScale(thisActivityEmissions)

  // points="677.0512,-712.8938 586.016,-712.8938 586.016,-676.8938 677.0512,-676.8938 677.0512,-712.8938"
  const bbox = getBoundingBox(activityTransition.children("polygon"))
  // console.log(bbox)
  if (!bbox) {
    return false
  }


  const w = 40, h = 30
  const { x, y } = alignAtBBox(bbox, "S", w, h, .25, true)
  const textOffset = 4

  return (<>
    <rect fill="white" stroke="black" x={x} y={y} width={w} height={h} rx={5} />
    <text fill="black" style={{ fontSize: "60%" }} textAnchor="middle" x={x + w / 2} y={y + h / 2 + textOffset}>Ø {quantityString({ value: thisActivityEmissions.mean, unit: emissions.unit })}</text>
  </>)

}

const AdditionalComponents: React.FC<{
  graph: JQuery<SVGGElement>
  ocel: OCEL
  ocpn: OCPN
  emissions: ProcessEmissions | undefined
  activityEmissionColorScale: chroma.Scale | undefined
}> = ({ graph, ocel, ocpn, emissions, activityEmissionColorScale }) => {

  return (<>

    {/* Activity emission labels */}
    {(emissions && activityEmissionColorScale) && ocel.activities.map((activity, i) => {
      const thisActivityEmissions = emissions.activityEmissions[activity]
      if (thisActivityEmissions.nonzero == 0) return false
      const activityTransition = graph.children("g").filter(`[id='activity-transition-${activity}']`)
      if (!activityTransition.length) return false
      return (<ActivityEmissionLabel key={i} activity={activity} activityTransition={activityTransition} emissions={emissions} ocel={ocel} activityEmissionColorScale={activityEmissionColorScale} />)
    })}

  </>)


}

export type ToDotProps = Partial<{
  rankdir: "LR" | "TB"
  fontsize: number
  fontname: string
}>

export type PetriNetProps = Omit<IGraphvizProps, "options" | "dot"> & {
  ocpn: OCPN
  emissions: ProcessEmissions | undefined
  options: Omit<IGraphvizProps["options"], "width"> & ToDotProps
}

const PetriNet: React.FC<PetriNetProps> = ({ ocpn, emissions, options, ...graphvizProps }) => {
  const ocel = useOceanStore.use.ocel()
  const objectTypeColors = useOceanStore.use.objectTypeColors()

  console.log({ ocel, ocpn, emissions, objectTypeColors, options, ...graphvizProps })

  const [dot, setDot] = useState<string>()
  useEffect(() => {
    if (!ocel) return
    setDot(ocpnToDot(ocpn, ocel, objectTypeColors, emissions, {
      rankdir: options.rankdir ?? "LR",
      fontsize: options.fontsize ?? 12,
      fontname: options.fontname ?? "system-ui"
    }))
  }, [ocel, ocpn, objectTypeColors])  // TODO also change when emissions change?

  // TODO force GraphvizContainer rerender when emissions change

  const containerRef = useRef<HTMLDivElement>(null)
  const containerDimensions = useDimensions(containerRef)

  const id = useMemo(() => `petri-net-${nextId++}`, [])
  const containerId = useMemo(() => `${id}-container`, [id])
  // const getContainer = useCallback((graph: JQuery<HTMLElement>) => graph.children("#" + containerId), [containerId])
  const [containerRoot, setContainerRoot] = useState<Root>()

  const activityEmissionColorScale = useMemo(() => emissions ? getEmissionColorScale(Object.values(emissions?.activityEmissions).map(stats => stats.mean), { log: true }) : undefined, [emissions])
  const svg = useMemo(() => $(`#${id}`).find("svg"), [id, emissions])  // IMPORTANT Might add more external props here
  const graph = useMemo(() => svg.find("g").filter(".graph"), [svg])

  const manipulateGraph = useCallback(() => {
    if (svg.length != 1 || graph.length != 1) {
      console.log("No svg/.graph")
      return
    }
    console.log("manipulateGraph()!")

    // Remove tooltips
    svg.find("title").remove()

    // Remove node font-family attr
    // svg.find("text").removeAttr("font-family").removeAttr("font-size")
    // svg.attr("font-family", "system-ui,Arial,Helvetica").attr("font-size", 14)

  }, [id, containerId, containerRoot, ocel, svg, graph, emissions, activityEmissionColorScale])

  useEffect(() => {
    manipulateGraph()
  }, [emissions, graph])

  if (!ocel) {
    return
  }
  return (
    <div id={id} ref={containerRef}>
      {!!dot && (<>
        <GraphvizContainer dot={dot} options={{ ...options, width: containerDimensions.width }} {...graphvizProps} />

        {!!(svg && svg.length && graph && graph.length) && createPortal(
          <AdditionalComponents
            graph={graph}
            ocel={ocel}
            ocpn={ocpn}
            emissions={emissions}
            activityEmissionColorScale={activityEmissionColorScale}
          />,
          graph[0]
        )}

      </>)}

    </div>
  )


}

export default PetriNet;


export type BBox = {
  x: [number, number],
  y: [number, number],
  width: number,
  height: number
}

/**
 * Computes the bounding box of an SVG Element, given its JQuery handle.
 * Currently only supports the following elements:
 * - <polygon> element, with the points attribute containing a space-separated list of comma-separated absolute coordinates.
 * - <ellipse> element, with geometry given by the cx, cy, rx, ry attributes.
 * @param el 
 * @returns A bounding box of the form { x: [min, max], y: [min, max], width: w, height: h }
 */
export function getBoundingBox(el: JQuery<SVGElement>): BBox | undefined {
  if (el.length != 1) {
    return undefined
  }
  const tagName = el.prop("tagName")
  if (tagName == "polygon") {

    const points = el.attr("points")?.split(" ").map(t => t.split(",").map(s => Number.parseFloat(s)))
    if (!points || !points.length || !points.every(p => p.length == 2 && p.every(x => !isNaN(x)))) {
      return undefined
    }
    const xs = points.map(p => p[0])
    const ys = points.map(p => p[1])
    const x0 = Math.min(...xs), x1 = Math.max(...xs)
    const y0 = Math.min(...ys), y1 = Math.max(...ys)

    return {
      x: [x0, x1],
      y: [y0, y1],
      width: x1 - x0,
      height: y1 - y0
    }

  }
  if (tagName == "ellipse") {

    const cx = Number.parseFloat(el.attr("cx") ?? "")
    const cy = Number.parseFloat(el.attr("cy") ?? "")
    const rx = Number.parseFloat(el.attr("rx") ?? "")
    const ry = Number.parseFloat(el.attr("ry") ?? "")
    if (!(!isNaN(cx) && !isNaN(cy) && !isNaN(rx) && !isNaN(ry))) {
      return undefined
    }
    return {
      x: [cx - rx, cx + rx],
      y: [cy - ry, cy + ry],
      width: 2 * rx,
      height: 2 * ry
    }

  }
  if (tagName == "g") {
    return undefined
    // <g> element, with all direct children recursively matching one of these conditions.
    // const childBboxes = el.children().map(child => {

    // })

  }
  return undefined

}

type Anchor = "N" | "S" | "E" | "W" | "SW" | "SE" | "NE" | "NW" | "C"
export function alignAtBBox(bbox: BBox, anchor: Anchor, width: number, height: number, overlap: number = 0, relativeOverlap: boolean = false): { x: number, y: number } {
  if (relativeOverlap) {
    if (anchor == "W" || anchor == "E") {
      overlap = overlap * bbox.width
    } else if (anchor == "N" || anchor == "S") {
      overlap = overlap * bbox.height
    } else {
      overlap = overlap * Math.min(bbox.width, bbox.height)
    }
  }

  if (anchor == "SE") {
    return { x: bbox.x[1] - overlap, y: bbox.y[1] - overlap }
  }
  if (anchor == "SW") {
    return { x: bbox.x[0] + overlap - width, y: bbox.y[1] - overlap }
  }
  if (anchor == "S") {
    return { x: (bbox.x[0] + bbox.x[1] - width) / 2, y: bbox.y[1] - overlap }
  }
  if (anchor == "NE") {
    return { x: bbox.x[1] - overlap, y: bbox.y[0] + overlap - height }
  }
  if (anchor == "NW") {
    return { x: bbox.x[0] + overlap - width, y: bbox.y[0] + overlap - height }
  }
  if (anchor == "N") {
    return { x: (bbox.x[0] + bbox.x[1] - width) / 2, y: bbox.y[0] + overlap - height }
  }
  if (anchor == "E") {
    return { x: bbox.x[1] - overlap, y: (bbox.y[0] + bbox.y[1] - height) / 2 }
  }
  if (anchor == "W") {
    return { x: bbox.x[0] + overlap - width, y: (bbox.y[0] + bbox.y[1] - height) / 2 }
  }
  if (anchor == "C") {
    return { x: (bbox.x[0] + bbox.x[1] - width) / 2, y: (bbox.y[0] + bbox.y[1] - height) / 2 }
  }
  return { x: NaN, y: NaN }
}
