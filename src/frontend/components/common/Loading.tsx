import React from "react";
import _ from "lodash";
import styled, { keyframes } from "styled-components";

export type SpinnerVariant = "spinner" | "ripple" | "heart";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: SpinnerVariant;
  size?: number;
  duration?: number;
  color?: string;
}
type SpinnerVariantProps = Omit<SpinnerProps, "variant">;
type SpinnerComponentProps = {
  $size: number;
  $duration: number;
  $color: string;
};

const defaultSize = 80;
const defaultColor = "#fff";
const defaultDuration = 1;

const rippleAnimation = (props: SpinnerComponentProps) => keyframes`
  0% {
    top: ${props.$size * (0.5 - 0.5 * 0.05)}px;
    left: ${props.$size * (0.5 - 0.5 * 0.05)}px;
    width: 0;
    height: 0;
    opacity: 0;
  }
  4.9% {
    top: ${props.$size * (0.5 - 0.5 * 0.05)}px;
    left: ${props.$size * (0.5 - 0.5 * 0.05)}px;
    width: 0;
    height: 0;
    opacity: 0;
  }
  5% {
    top: ${props.$size * (0.5 - 0.5 * 0.05)}px;
    left: ${props.$size * (0.5 - 0.5 * 0.05)}px;
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    top: 0px;
    left: 0px;
    width: ${props.$size}px;
    height: ${props.$size}px;
    opacity: 0;
  }
`;
const spinnerAnimation = (props: SpinnerComponentProps) => keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

const convertProps = (props: SpinnerVariantProps): SpinnerComponentProps => ({
  $size: props.size ?? defaultSize,
  $color: props.color ?? defaultColor,
  $duration: props.duration ?? defaultDuration,
});

const generateComponent = (
  numNodes: number,
  Comp: React.FC<SpinnerComponentProps>,
): React.FC<SpinnerVariantProps> => {
  const LoadingComponent = (props: SpinnerVariantProps) => (
    <Comp {...convertProps(props)}>
      {_.range(numNodes).map((i) => (
        <div key={i}></div>
      ))}
    </Comp>
  );
  return LoadingComponent;
};

export const Ripple = generateComponent(
  2,
  styled.div<SpinnerComponentProps>`
  display: inline-block;
  position: relative;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  div {
    position: absolute;
    border: ${(props) => 0.05 * props.$size}px solid ${(props) => props.$color};
    opacity: 1;
    border-radius: 50%;
    animation: ${(props) => rippleAnimation(props)} ${(props) => 2 * props.$duration}s cubic-bezier(0, 0.2, 0.8, 1) infinite;
    &:nth-child(2) {
      animation-delay: ${(props) => -1 * props.$duration}s;
    }
  }
`,
);

export const Spinner = generateComponent(
  12,
  styled.div<SpinnerComponentProps>`
  color: official;
  display: inline-block;
  position: relative;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  div {
    transform-origin: ${(props) => 0.5 * props.$size}px ${(props) => 0.5 * props.$size}px;
    animation: ${(props) => spinnerAnimation(props)} ${(props) => props.$duration}s linear infinite;
    &:after {
      content: " ";
      display: block;
      position: absolute;
      top: ${(props) => (3 / 80) * props.$size}px;
      left: ${(props) => (37 / 80) * props.$size}px;
      width: ${(props) => (6 / 80) * props.$size}px;
      height: ${(props) => (18 / 80) * props.$size}px;
      border-radius: 20%;
      background: ${(props) => props.$color};
    }
    &:nth-child(1) {
      transform: rotate(0deg);
      animation-delay: ${(props) => (-11 / 12) * props.$duration}s;
    }
    &:nth-child(2) {
      transform: rotate(30deg);
      animation-delay: ${(props) => (-10 / 12) * props.$duration}s;
    }
    &:nth-child(3) {
      transform: rotate(60deg);
      animation-delay: ${(props) => (-9 / 12) * props.$duration}s;
    }
    &:nth-child(4) {
      transform: rotate(90deg);
      animation-delay: ${(props) => (-8 / 12) * props.$duration}s;
    }
    &:nth-child(5) {
      transform: rotate(120deg);
      animation-delay: ${(props) => (-7 / 12) * props.$duration}s;
    }
    &:nth-child(6) {
      transform: rotate(150deg);
      animation-delay: ${(props) => (-6 / 12) * props.$duration}s;
    }
    &:nth-child(7) {
      transform: rotate(180deg);
      animation-delay: ${(props) => (-5 / 12) * props.$duration}s;
    }
    &:nth-child(8) {
      transform: rotate(210deg);
      animation-delay: ${(props) => (-4 / 12) * props.$duration}s;
    }
    &:nth-child(9) {
      transform: rotate(240deg);
      animation-delay: ${(props) => (-3 / 12) * props.$duration}s;
    }
    &:nth-child(10) {
      transform: rotate(270deg);
      animation-delay: ${(props) => (-2 / 12) * props.$duration}s;
    }
    &:nth-child(11) {
      transform: rotate(300deg);
      animation-delay: ${(props) => (-1 / 12) * props.$duration}s;
    }
    &:nth-child(12) {
      transform: rotate(330deg);
      animation-delay: 0s;
    }
  }
`,
);
