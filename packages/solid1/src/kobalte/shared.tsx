import { createSignal, type Accessor, type JSX, type Setter } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { HostProps, StyleDesc } from "../host/types.js"

export type NativeComponentProps = Omit<HostProps, "children"> & {
  children?: JSX.Element
  class?: string
  disabled?: boolean
}

export type FloatingSide = "top" | "right" | "bottom" | "left"
export type FloatingAlign = "start" | "center" | "end"

export function mergeStyle(base: StyleDesc | undefined, override: StyleDesc | undefined): StyleDesc | undefined {
  if (!base) return override
  if (!override) return base
  return { ...base, ...override }
}

export function createControllableSignal<T>(options: {
  value?: Accessor<T | undefined>
  defaultValue: T
  onChange?: (value: T) => void
}): [Accessor<T>, Setter<T>] {
  const [internal, setInternal] = createSignal(options.defaultValue)
  const value = () => options.value?.() ?? internal()
  const setValue: Setter<T> = (next) => {
    const current = value()
    const resolved = typeof next === "function" ? (next as (previous: T) => T)(current) : next
    if (options.value?.() === undefined) setInternal(() => resolved)
    if (!Object.is(current, resolved)) options.onChange?.(resolved)
    return resolved
  }
  return [value, setValue]
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
        style={mergeStyle({ backgroundColor: "#151518" }, props.style)}
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
  boxShadow: undefined,
}
