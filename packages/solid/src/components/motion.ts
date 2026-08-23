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
  if (!previous || next.style !== previous.style) {
    setHostProperty(node, "style", next.style, previous?.style)
  }
  if (!previous || next.onClick !== previous.onClick) {
    setHostProperty(node, "onClick", next.onClick, previous?.onClick)
  }
  if (!previous || next.onMouseDown !== previous.onMouseDown) {
    setHostProperty(node, "onMouseDown", next.onMouseDown, previous?.onMouseDown)
  }
  if (!previous || next.onMouseUp !== previous.onMouseUp) {
    setHostProperty(node, "onMouseUp", next.onMouseUp, previous?.onMouseUp)
  }
  if (!previous || next.onMouseEnter !== previous.onMouseEnter) {
    setHostProperty(node, "onMouseEnter", next.onMouseEnter, previous?.onMouseEnter)
  }
  if (!previous || next.onMouseLeave !== previous.onMouseLeave) {
    setHostProperty(node, "onMouseLeave", next.onMouseLeave, previous?.onMouseLeave)
  }
  if (!previous || next.onMouseMove !== previous.onMouseMove) {
    setHostProperty(node, "onMouseMove", next.onMouseMove, previous?.onMouseMove)
  }
  if (!previous || next.onMouseDownOutside !== previous.onMouseDownOutside) {
    setHostProperty(
      node,
      "onMouseDownOutside",
      next.onMouseDownOutside,
      previous?.onMouseDownOutside,
    )
  }
  if (!previous || next.onKeyDown !== previous.onKeyDown) {
    setHostProperty(node, "onKeyDown", next.onKeyDown, previous?.onKeyDown)
  }
  if (!previous || next.onKeyUp !== previous.onKeyUp) {
    setHostProperty(node, "onKeyUp", next.onKeyUp, previous?.onKeyUp)
  }
  if (!previous || next.onFocus !== previous.onFocus) {
    setHostProperty(node, "onFocus", next.onFocus, previous?.onFocus)
  }
  if (!previous || next.onBlur !== previous.onBlur) {
    setHostProperty(node, "onBlur", next.onBlur, previous?.onBlur)
  }
  if (!previous || next.onScroll !== previous.onScroll) {
    setHostProperty(node, "onScroll", next.onScroll, previous?.onScroll)
  }
  if (!previous || next.autoFocus !== previous.autoFocus) {
    setHostProperty(node, "autoFocus", next.autoFocus, previous?.autoFocus)
  }
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
