import { createRenderEffect } from "solid-js"
import {
  createHostElement,
  setHostProperty,
  type HostElementNode,
} from "../host/nodes.js"
import type {
  HostProps,
  HostRef,
  MotionProps,
  StyleDesc,
} from "../host/types.js"
import { insert, spread } from "../host/universal.js"

export interface MotionDivProps extends MotionProps {
  children?: unknown
  style?: StyleDesc
  ref?: HostRef
  onClick?: HostProps["onClick"]
  onMouseDown?: HostProps["onMouseDown"]
  onMouseUp?: HostProps["onMouseUp"]
  onMouseEnter?: HostProps["onMouseEnter"]
  onMouseLeave?: HostProps["onMouseLeave"]
  onMouseMove?: HostProps["onMouseMove"]
  onMouseDownOutside?: HostProps["onMouseDownOutside"]
  onKeyDown?: HostProps["onKeyDown"]
  onKeyUp?: HostProps["onKeyUp"]
  onFocus?: HostProps["onFocus"]
  onBlur?: HostProps["onBlur"]
  onScroll?: HostProps["onScroll"]
  autoFocus?: boolean
}

interface MotionHostSnapshot {
  style: StyleDesc | undefined
  onClick: HostProps["onClick"]
  onMouseDown: HostProps["onMouseDown"]
  onMouseUp: HostProps["onMouseUp"]
  onMouseEnter: HostProps["onMouseEnter"]
  onMouseLeave: HostProps["onMouseLeave"]
  onMouseMove: HostProps["onMouseMove"]
  onMouseDownOutside: HostProps["onMouseDownOutside"]
  onKeyDown: HostProps["onKeyDown"]
  onKeyUp: HostProps["onKeyUp"]
  onFocus: HostProps["onFocus"]
  onBlur: HostProps["onBlur"]
  onScroll: HostProps["onScroll"]
  autoFocus: boolean | undefined
  motion: MotionProps
}

function readMotionProps(props: MotionDivProps): MotionHostSnapshot {
  const motion: MotionProps = { animate: props.animate }
  if (props.initial !== undefined) motion.initial = props.initial
  if (props.transition !== undefined) motion.transition = props.transition

  return {
    style: props.style,
    onClick: props.onClick,
    onMouseDown: props.onMouseDown,
    onMouseUp: props.onMouseUp,
    onMouseEnter: props.onMouseEnter,
    onMouseLeave: props.onMouseLeave,
    onMouseMove: props.onMouseMove,
    onMouseDownOutside: props.onMouseDownOutside,
    onKeyDown: props.onKeyDown,
    onKeyUp: props.onKeyUp,
    onFocus: props.onFocus,
    onBlur: props.onBlur,
    onScroll: props.onScroll,
    autoFocus: props.autoFocus,
    motion,
  }
}

function applyMotionProps(
  node: HostElementNode,
  next: MotionHostSnapshot,
  previous: MotionHostSnapshot | undefined,
): void {
  setHostProperty(node, "style", next.style, previous?.style)
  setHostProperty(node, "onClick", next.onClick, previous?.onClick)
  setHostProperty(node, "onMouseDown", next.onMouseDown, previous?.onMouseDown)
  setHostProperty(node, "onMouseUp", next.onMouseUp, previous?.onMouseUp)
  setHostProperty(node, "onMouseEnter", next.onMouseEnter, previous?.onMouseEnter)
  setHostProperty(node, "onMouseLeave", next.onMouseLeave, previous?.onMouseLeave)
  setHostProperty(node, "onMouseMove", next.onMouseMove, previous?.onMouseMove)
  setHostProperty(
    node,
    "onMouseDownOutside",
    next.onMouseDownOutside,
    previous?.onMouseDownOutside,
  )
  setHostProperty(node, "onKeyDown", next.onKeyDown, previous?.onKeyDown)
  setHostProperty(node, "onKeyUp", next.onKeyUp, previous?.onKeyUp)
  setHostProperty(node, "onFocus", next.onFocus, previous?.onFocus)
  setHostProperty(node, "onBlur", next.onBlur, previous?.onBlur)
  setHostProperty(node, "onScroll", next.onScroll, previous?.onScroll)
  setHostProperty(node, "autoFocus", next.autoFocus, previous?.autoFocus)
  setHostProperty(node, "motion", next.motion, previous?.motion)
}

function MotionDiv(props: MotionDivProps): HostElementNode {
  const node = createHostElement("div")
  let previous: MotionHostSnapshot | undefined

  createRenderEffect(
    () => readMotionProps(props),
    (next) => {
      applyMotionProps(node, next, previous)
      previous = next
    },
  )

  if (props.ref) spread(node, { ref: props.ref }, true)
  insert(node, () => props.children)
  return node
}

/** Native GPUI animations driven by declarative Solid props. */
export const motion = {
  div: MotionDiv,
} as const
