import { createMemo } from "solid-js"
import { createHostElement } from "../host/nodes.js"
import type {
  HostProps,
  HostRef,
  MotionProps,
  PublicInstance,
  StyleDesc,
} from "../host/types.js"
import { spread } from "../host/universal.js"

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

function MotionDiv(props: MotionDivProps): PublicInstance & { readonly kind: "element" } {
  const node = createHostElement("div")
  const nativeMotion = createMemo<MotionProps>(() => {
    const value: MotionProps = { animate: props.animate }
    if (props.initial !== undefined) value.initial = props.initial
    if (props.transition !== undefined) value.transition = props.transition
    return value
  })

  spread(node, () => ({
    children: props.children,
    style: props.style,
    ref: props.ref,
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
    motion: nativeMotion(),
  }))

  return node
}

/** Native GPUI animations driven by declarative Solid props. */
export const motion = {
  div: MotionDiv,
} as const
