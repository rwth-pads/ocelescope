/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useDimensions } from "./util";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import styled from "styled-components";
import { Unit, Quantity } from "@/src/units.types";
import Qty, { QtyRange } from "./Quantity";
import _ from "lodash";
import { useComputedStyle } from "@/src/util";

// from https://www.react-graph-gallery.com/histogram

const MARGIN = { top: 20, right: 30, bottom: 45, left: 60 }
const DEFAULT_NUM_BINS = 30
const BAR_GAP = 2

export type HistogramProps = {
  width?: number;
  height?: number;
  aspectRatio?: number;
  minHeight?: number;
  maxHeight?: number;
  numBins?: number;  // number of bins
  log?: "x" | "y" | "both" | false;
  xLabel?: string;
  yLabel?: string;
} & {
  data: number[];
  unit?: Unit;
  min?: number;  // x limit to cut off outliers
  max?: number;  // x limit to cut off outliers
  itemCountName: {
    singular: string;
    plural: string;
  };
  color?: string;
}
// } | {
//   data: Quantity[];
//   unit: undefined;
//   min?: Quantity;  // x limit to cut off outliers
//   max?: Quantity;  // x limit to cut off outliers
// })

const Histogram: React.FC<HistogramProps> = ({
  width,
  height,
  aspectRatio,
  minHeight,
  maxHeight,
  data,
  unit,
  min,
  max,
  numBins,
  log = false,
  xLabel,
  yLabel,
  itemCountName,
  color = "#69b3a2"
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const containerDimensions = useDimensions(containerRef)
  const axesRef = useRef<SVGGElement>(null)

  width = width ?? containerDimensions.width
  height = height ?? containerDimensions.height

  if (aspectRatio !== undefined && aspectRatio !== 0) {
    // set height to match desired aspect ratio
    height = width / aspectRatio
    // limit height to min/max if specified
    if (minHeight !== undefined) {
      height = Math.max(height, minHeight)
    }
    if (maxHeight !== undefined) {
      height = Math.min(height, maxHeight)
    }
  }

  const boundsWidth = width - MARGIN.right - MARGIN.left
  const boundsHeight = height - MARGIN.top - MARGIN.bottom

  const getItemCountName = (y: number) => {
    if (y == 1) {
      return itemCountName.singular
    }
    return itemCountName.plural
  }

  min = min ?? Math.min(...data) as number
  max = max ?? Math.max(...data) as number
  numBins = numBins ?? DEFAULT_NUM_BINS
  const logScale = {
    x: log == "x" || log == "both",
    y: log == "y" || log == "both"
  }

  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([min as number, max as number]) // note: limiting to 1000 instead of max here because of extreme values in the dataset
      .range([0, boundsWidth])
      .nice()
  }, [data, width, boundsWidth])

  const buckets = useMemo(() => {
    const bucketGenerator = d3.bin().value(d => d)
      .domain(xScale.domain() as [number, number])
      .thresholds(xScale.ticks(numBins))
    return bucketGenerator(data)
  }, [data, xScale, numBins])

  const yScale = useMemo(() => {
    const maxSize = Math.max(...buckets.map((bucket) => bucket?.length))
    const preMap: ((x: number) => number) = logScale.y ? (x => x + 1) : (x => x)
    const scale = logScale.y ? d3.scaleLog() : d3.scaleLinear()
    return scale.range([boundsHeight, 0]).domain([preMap(0), preMap(maxSize)]).nice()
  }, [data, buckets, logScale, height, boundsHeight])

  const maxBinSize = useMemo(() => {
    return Math.max(...buckets.map(bucket => bucket.length))
  }, [buckets, yScale])

  // Render the axes using d3.js, not react
  useEffect(() => {
    const ticksFontSize = 14
    const axes = d3.select(axesRef.current)
    axes.selectAll("*").remove()
    const { numXTicks, numYTicks } = getNumberOfTicks(boundsWidth, boundsHeight, xScale.domain()[0], xScale.domain()[1], ticksFontSize)
    console.log(numXTicks, numYTicks)
    const xAxisTicks = xScale.ticks(numXTicks)
    const yAxisTicks = yScale.ticks(numYTicks).filter(tick => Number.isInteger(tick))
    const xAxisGenerator = d3.axisBottom(xScale).tickValues(xAxisTicks)
    const yAxisGenerator = d3.axisLeft(yScale).tickValues(yAxisTicks).tickFormat(d3.format(".0f"))

    axes.append("g").call(xAxisGenerator).attr("font-family", null).attr("font-size", `${ticksFontSize}px`).attr("transform", `translate(0, ${boundsHeight})`)
    axes.append("g").call(yAxisGenerator).attr("font-family", null).attr("font-size", `${ticksFontSize}px`)

  }, [xScale, yScale, boundsWidth, boundsHeight])

  const [highlightedBin, setHighlightedBin] = useState<number | null>(null)

  const allRects = buckets.map((bucket, i) => {
    if (bucket.x0 === undefined || bucket.x1 === undefined)
      return false

    const binCenter = xScale((bucket.x1 + bucket.x0) / 2)
    const binWidth = bucket.x1 != bucket.x0 ? (xScale(bucket.x1) - xScale(bucket.x0) - BAR_GAP) : 50

    return (

      <OverlayTrigger
        key={i}
        onEntering={() => setHighlightedBin(i)}
        onExiting={() => setHighlightedBin(x => x == i ? null : x)}
        overlay={(
          <Tooltip id={`bin-tooltip-${i}`}>
            <span className="me-1">
              {/* {_.unique(bucket.values) == bucket.x1 && <Qty value={bucket.x0} unit={unit} />} */}
              {bucket.x0 == bucket.x1 && <Qty value={bucket.x0} unit={unit} />}
              {bucket.x0 != bucket.x1 && (<>
                <QtyRange value1={bucket.x0} value2={bucket.x1} unit={unit} options={{ showZero: true }} />
              </>)}
            </span>
            <span>({bucket.length}&nbsp;{getItemCountName(bucket.length)})</span>
          </Tooltip>
        )}
      >
        <rect
          id={`bin-${i}`}
          fill={color}
          x={binCenter - binWidth / 2}
          width={binWidth}
          y={yScale(bucket.length + (logScale.y ? 1 : 0))}
          height={yScale(logScale.y ? 1 : 0) - yScale(bucket.length + (logScale.y ? 1 : 0))}
          opacity={highlightedBin == i || highlightedBin === null ? 1 : .5}
        />
      </OverlayTrigger>
    )
  })

  return (
    <div className="d-flex justify-content-center" ref={containerRef}>
      <svg width={width} height={height}>
        <g
          width={boundsWidth}
          height={boundsHeight}
          transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
        >
          {allRects}
        </g>
        <g
          width={boundsWidth}
          height={boundsHeight}
          ref={axesRef}
          transform={`translate(${[MARGIN.left, MARGIN.top].join(",")})`}
        />
        {xLabel && <text fontSize="12" x={MARGIN.left + boundsWidth / 2} y={height - 12} textAnchor="middle">{xLabel}{unit && ` [${unit.symbol}]`}</text>}
        {yLabel && <text fontSize="12" x={0} y={0} textAnchor="middle" transform={`translate(12,${MARGIN.top + boundsHeight / 2}),rotate(-90)`}>{yLabel}</text>}
      </svg>
    </div>
  )
}

export default Histogram

export function getNumberOfTicks(
  boundsWidth: number,
  boundsHeight: number,
  xMin: number,
  xMax: number,
  fontSize: number = 14
) {
  // Estimate label length for x-axis (approximate number of digits + sign + decimal point)
  const maxNumDigits = Math.max(
    Math.floor(Math.log10(Math.abs(xMin))),
    Math.floor(Math.log10(Math.abs(xMax))),
    1
  ) + 1
  const labelWidth = fontSize * maxNumDigits // Add 1 for sign/decimal

  let numXTicks = Math.floor(boundsWidth / (labelWidth * 1.5)) // Multiplied by 1.5 for spacing
  let numYTicks = Math.floor(boundsHeight / (fontSize * 2)) // Multiplied by 2 for spacing
  numXTicks = Math.min(8, Math.max(2, numXTicks))
  numYTicks = Math.min(8, Math.max(2, numYTicks))

  return { numXTicks, numYTicks };
}