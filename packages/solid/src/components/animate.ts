import { createRenderEffect } from "solid-js"
import { renderDiv } from "./floating.js"
import { setHostProperty, type HostElementNode } from "../host/nodes.js"
import type {
  HostProps,
  MotionEase,
  MotionProps,
  MotionStyle,
  MotionTransition,
} from "../host/types.js"

/** Style values currently supported by GPUIX native interpolation. */
export type AnimationStyle = MotionStyle

/** Easing values currently supported by GPUIX native interpolation. */
export type AnimationEase = MotionEase

/** Timing options currently supported by GPUIX native interpolation. */
export type AnimationTransition = MotionTransition

export interface AnimateDivProps extends HostProps {
  /** Native style used for the first mounted frame. `false` starts at `to`. */
  initial?: AnimationStyle | false
  /** Reactive native animation target. */
  to: AnimationStyle
  transition?: AnimationTransition
}

function readNativeMotion(props: AnimateDivProps): MotionProps {
  const motion: MotionProps = { animate: props.to }
  if (props.initial !== undefined) motion.initial = props.initial
  if (props.transition !== undefined) motion.transition = props.transition
  return motion
}

function AnimateDiv(props: AnimateDivProps): HostElementNode {
  const node = renderDiv(props)

  createRenderEffect(
    () => readNativeMotion(props),
    (next, previous) => {
      setHostProperty(node, "motion", next, previous)
    },
  )

  return node
}

/**
 * Native GPUI animation components.
 *
 * `motion` is deliberately kept as an internal wire-format detail; callers
 * use this namespace for every declarative animation.
 */
export const animate = {
  div: AnimateDiv,
} as const
