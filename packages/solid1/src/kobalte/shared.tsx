import type { JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { HostProps, PublicInstance, StyleDesc } from "../host/types.js"
import type { NativeClassList } from "../native-style.js"

type OptionalUndefined<T> = {
  [K in keyof T]: {} extends Pick<T, K> ? T[K] | undefined : T[K]
}

export type NativeComponentProps = Omit<OptionalUndefined<HostProps>, "children" | "testId"> & {
  children?: JSX.Element
  class?: string | undefined
  className?: string | undefined
  classList?: NativeClassList | undefined
  disabled?: boolean | undefined
  testId?: string | undefined
  variant?: string | undefined
  size?: string | undefined
  "aria-label"?: string | undefined
  "aria-pressed"?: boolean | undefined
}

export type FloatingSide = "top" | "right" | "bottom" | "left"
export type FloatingAlign = "start" | "center" | "end"
export type FloatingPosition = { x: number; y: number }
export type FocusKey = symbol
export type FocusableInstance = PublicInstance & { focus: () => void }

export interface FocusRegistry {
  register: (key: FocusKey, instance: PublicInstance) => void
  unregister: (key: FocusKey) => void
  focusFirst: () => void
  focusLast: () => void
  focusNext: (key: FocusKey) => void
  focusPrevious: (key: FocusKey) => void
}

export function asFocusableInstance(instance: PublicInstance): FocusableInstance {
  // SAFETY: Solid host refs are assigned HostElementNode instances, whose public DOM-compat contract implements focus().
  return instance as FocusableInstance
}

export function createFocusRegistry(): FocusRegistry {
  const order: FocusKey[] = []
  const instances = new Map<FocusKey, FocusableInstance>()

  const focusAt = (index: number): void => {
    if (order.length === 0) return
    const normalized = ((index % order.length) + order.length) % order.length
    const key = order[normalized]
    if (key) instances.get(key)?.focus()
  }

  return {
    register(key, instance) {
      if (!order.includes(key)) order.push(key)
      instances.set(key, asFocusableInstance(instance))
    },
    unregister(key) {
      instances.delete(key)
      const index = order.indexOf(key)
      if (index >= 0) order.splice(index, 1)
    },
    focusFirst() { focusAt(0) },
    focusLast() { focusAt(order.length - 1) },
    focusNext(key) {
      const index = order.indexOf(key)
      focusAt(index < 0 ? 0 : index + 1)
    },
    focusPrevious(key) {
      const index = order.indexOf(key)
      focusAt(index < 0 ? order.length - 1 : index - 1)
    },
  }
}

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
  position?: FloatingPosition
}

export function FloatingLayer(props: FloatingContentProps): JSX.Element {
  const side = () => props.side ?? "bottom"
  const align = () => props.align ?? "start"
  const offset = () => side() === "top" || side() === "bottom"
    ? { x: props.alignOffset ?? 0, y: 0 }
    : { x: 0, y: props.alignOffset ?? 0 }

  return (
    <anchored
      position={props.position}
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
        ref={props.ref}
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
