import type { JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { HostProps, StyleDesc } from "../host/types.js"
import type { NativeClassList } from "../native-style.js"

export type NativeComponentProps = Omit<HostProps, "children" | "testId"> & {
  children?: JSX.Element
  class?: string | undefined
  className?: string | undefined
  classList?: NativeClassList | undefined
  disabled?: boolean
  testId?: string | undefined
}

export type FloatingSide = "top" | "right" | "bottom" | "left"
export type FloatingAlign = "start" | "center" | "end"

export function mergeStyle(base: StyleDesc, override: StyleDesc | undefined): StyleDesc {
  if (!override) return base
  return { ...base, ...override }
}

export function hasNativeClassStyle(
  props: Pick<NativeComponentProps, "class" | "className" | "classList">,
): boolean {
  if (props.class?.trim() || props.className?.trim()) return true
  return Boolean(props.classList && Object.values(props.classList).some(Boolean))
}

export function mergeComponentStyle(
  structural: StyleDesc,
  fallbackVisual: StyleDesc,
  props: Pick<NativeComponentProps, "class" | "className" | "classList" | "style">,
): StyleDesc {
  const base = hasNativeClassStyle(props)
    ? structural
    : mergeStyle(structural, fallbackVisual)
  return mergeStyle(base, props.style)
}

export function composeHandlers(
  first: ((event: EventPayload) => void) | undefined,
  second: ((event: EventPayload) => void) | undefined,
): ((event: EventPayload) => void) | undefined {
  if (!first) return second
  if (!second) return first
  return (event) => {
    first(event)
    second(event)
  }
}

export interface FloatingContentProps extends NativeComponentProps {
  side?: FloatingSide
  sideOffset?: number
  align?: FloatingAlign
  alignOffset?: number
  collisionPadding?: number
}

export function FloatingLayer(props: FloatingContentProps): JSX.Element {
  const side = () => props.side ?? "bottom"
  const align = () => props.align ?? "start"
  const offset = () => side() === "top" || side() === "bottom"
    ? { x: props.alignOffset ?? 0, y: 0 }
    : { x: 0, y: props.alignOffset ?? 0 }

  return (
    <anchored
      side={side()}
      align={align()}
      gap={props.sideOffset ?? 0}
      offset={offset()}
      fit="snap"
      snapMargin={props.collisionPadding ?? 8}
      deferred
      priority={1}
      occlude
    >
      <div
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        tabIndex={props.tabIndex}
        onClick={props.onClick}
        onMouseDown={props.onMouseDown}
        onMouseUp={props.onMouseUp}
        onMouseEnter={props.onMouseEnter}
        onMouseLeave={props.onMouseLeave}
        onMouseMove={props.onMouseMove}
        onMouseDownOutside={props.onMouseDownOutside}
        onKeyDown={props.onKeyDown}
        onKeyUp={props.onKeyUp}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        style={mergeComponentStyle(
          { pointerEvents: "auto" },
          { backgroundColor: "#151518" },
          props,
        )}
      >
        {props.children}
      </div>
    </anchored>
  )
}

export function Portal(props: { children?: JSX.Element }): JSX.Element {
  return <>{props.children}</>
}

export const triggerBaseStyle: StyleDesc = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  cursor: "pointer",
}

export const popupBaseStyle: StyleDesc = {
  minWidth: 160,
  padding: 6,
  backgroundColor: "#151518",
  color: "#fafafa",
  borderWidth: 1,
  borderColor: "#34343a",
  borderRadius: 6,
}
