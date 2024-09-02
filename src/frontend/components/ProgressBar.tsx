/* eslint-disable react-hooks/exhaustive-deps */
import { BackendTask, taskPollDuration } from "@/src/api.types";
import { Unit } from "@/src/units.types";
import { usePrevious } from "@/src/util";
import chroma from "chroma-js";
import React, { useEffect, useMemo, useState } from "react";
import BsProgressBar, { ProgressBarProps as BsProgressBarProps } from 'react-bootstrap/ProgressBar';
import styled from "styled-components";
import Qty from "./Quantity";


const getTaskPercentage = (task: BackendTask<any>) => {
  if (task.taskState == "SUCCESS") {
    return 1
  }
  return task.percentage ?? 0
}

const catchUpDuration = 200

export const TaskProgressBar: React.FC<ProgressBarStyleProps & {
  task: BackendTask<any>
  enableEstimation?: boolean
}> = ({
  task,
  enableEstimation = false,
  locales,
  ...props
}) => {

  const [percentage, setPercentage] = useState<number>(getTaskPercentage(task))
  const [estimate, setEstimate] = useState<number | undefined>()
  const [estimateDuration, setEstimateDuration] = useState<number>(0)

  const prevTask = usePrevious(task)
  const prevPercentage = usePrevious(percentage)
  const prevEstimate = usePrevious(estimate)
  const prevAnimationDuration = usePrevious(estimateDuration)

  const [intervalHandle, setIntervalHandle] = useState<NodeJS.Timeout>()

  const percentageNumberFormat = useMemo(() => Intl.NumberFormat(locales, { style: "percent", maximumFractionDigits: 0 }), [locales])

  useEffect(() => {
    if (percentage < 1 && prevTask && task.id != prevTask.id) {
      console.warn(`TaskProgressBar cannot change to a different task before completion!`)
      return
    }

    // Update percentage, estimate and animation speed
    if (intervalHandle) {
      clearInterval(intervalHandle)
      setIntervalHandle(undefined)
    }

    const p = getTaskPercentage(task)
    if (task.taskState == "SUCCESS" || p == 1) {
      setPercentage(1)
      setEstimate(1)
      setEstimateDuration(catchUpDuration)  // keep animated to fill up to 100%
      return
    }
    if (!task.percentage) {
      setPercentage(0)
      setEstimate(undefined)
      setEstimateDuration(0)
      return
    }

    const diff = task.percentage - (task.lastPercentage ?? 0)
    let est = Math.min(p + .75 * diff, 1)
    let t = ((task.unchangedPercentageCounter ?? 0) + 1) * taskPollDuration

    // Limit the estimate
    est = Math.min(est, p + .25)  // est <= p + 25%
    est = Math.min(est, .9)  // est <= 90%

    // TODO Increase speed shortly to catch up if task is faster than estimated
    if (prevEstimate && p > prevEstimate) {
      // catch up
      // console.log(`Catch up (${prevEstimate} -> ${p})`)
      setEstimate(p)
      setEstimateDuration(catchUpDuration)
      // next estimate
      setIntervalHandle(setTimeout(() => {
        setPercentage(p)
        setEstimate(est)
        setEstimateDuration(Math.max(0, t - catchUpDuration))
      }, catchUpDuration))
      return
    }

    // Stop animation if new p is less than previous estimate
    if (prevEstimate && p < prevEstimate) {
      // console.log(`Stop animation at (${p} < ${prevEstimate})`)
      setPercentage(p)
      setEstimateDuration(0)
      // Estimate remains unchanged
      return
    }

    setEstimate(est)
    setEstimateDuration(t)
    setPercentage(p)

  }, [task])

  const label = useMemo(() => percentage >= .05 ? percentageNumberFormat.format(Math.floor(percentage * 100) / 100) : "", [percentage])
  const now = useMemo(() => (enableEstimation ? estimate : undefined) ?? percentage, [enableEstimation, estimate, percentage])
  const animationDuration = useMemo(() => {
    if (enableEstimation) {
      return estimateDuration
    }
    return catchUpDuration
    // const diff = percentage - (task.lastPercentage ?? 0)
    // return Math.max(catchUpDuration, diff / )
  }, [enableEstimation, estimateDuration, task])

  return (
    <ProgressBar now={now} min={0} max={1} label={label} animationDuration={animationDuration} locales={locales} {...props} />
  )

}

export type ProgressBarStyleProps = Omit<BsProgressBarProps, "color" | "now" | "min" | "max"> & {
  log?: boolean
  unit?: Unit
  locales?: Intl.LocalesArgument
  percent?: boolean
  rounded?: boolean
  color?: chroma.Color
  animationDuration?: number
}

export type ProgressBarProps = ProgressBarStyleProps & {
  min: number
  max: number
  now: number
}

function toLog(x: number) {
  return Math.log(x + 1)
}

export const ProgressBar = styled(({
  now,
  min,
  max,
  unit,
  log = false,
  label,
  locales,
  percent = false,
  rounded = true,
  color,
  animationDuration = 200,
  style,
  ...props
}: ProgressBarProps) => {

  // if (color && (typeof color === "string" || color instanceof String)) {
  //   color = chroma(color)
  // }

  // Log scale?
  const nowArg = log ? toLog(now) : now
  const minArg = log ? toLog(min) : min
  const maxArg = log ? toLog(max) : max

  // Generate label
  if (label === undefined) {
    // No auto label for small bars
    if (nowArg / maxArg >= .15) {
      if (percent) {
        min = 0
        max = 1
        label = now.toLocaleString(locales, { style: "percent", maximumFractionDigits: 1 })
      } else if (unit) {
        label = (<Qty value={now} unit={unit} options={{ locales }} />)
      } else {
        label = now.toLocaleString(locales)
      }
    }
  }

  // Complete styles
  style = {
    fontSize: "60%",
    width: "100%",
    ...style
  }

  return (
    <BsProgressBar
      now={nowArg}
      min={minArg}
      max={maxArg}
      label={label}
      style={style}
      {...props}
    />
  )
})`
  background: #ffffff80;
  border: 1px solid var(--bs-border-color);
  ${({ rounded }) => !(rounded ?? true) ? "border-radius: 0;" : ""}
  & > .progress-bar {
    ${({ color }) => color ? `background-color: ${color.hex()} !important;` : ""}
    ${({ animationDuration }) => animationDuration ? `transition: width ${animationDuration}ms ease-out` : ""}
  }
`
