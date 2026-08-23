import type { EventPayload } from "@gpuix/native"
import {
  createRenderEffect,
  createSignal,
  type Accessor,
  type Element as SolidElement,
} from "solid-js"
import {
  createHostElement,
  setHostProperty,
  type HostElementNode,
} from "../host/nodes.js"
import type {
  HostEventHandler,
  HostProps,
  HostRef,
  InputProps,
  StyleDesc,
} from "../host/types.js"
import { insert, spread } from "../host/universal.js"

export type FloatingSide = "top" | "right" | "bottom" | "left"
export type FloatingAlign = "start" | "center" | "end"
export type StateStyle<State> = StyleDesc | ((state: State) => StyleDesc)
export type SlotRenderer = (props: HostProps) => SolidElement

export interface FloatingContentProps extends Omit<HostProps, "children"> {
  children?: SolidElement
  side?: FloatingSide
  sideOffset?: number
  align?: FloatingAlign
  alignOffset?: number
  collisionPadding?: number
}

export interface HostBindingSource extends Omit<HostProps, "style" | "children"> {
  style?: unknown
  children?: unknown
}

export interface HostBindingOverrides {
  style?: Accessor<StyleDesc | undefined>
  children?: Accessor<unknown>
}

const BOUND_HOST_PROPS = [
  "style",
  "onClick",
  "onMouseDown",
  "onMouseUp",
  "onMouseEnter",
  "onMouseLeave",
  "onMouseMove",
  "onMouseDownOutside",
  "onKeyDown",
  "onKeyUp",
  "onFocus",
  "onBlur",
  "onScroll",
  "onChange",
  "onSubmit",
  "onToggleFile",
  "onShowMore",
  "onLineClick",
  "onLinkClick",
  "autoFocus",
  "tabIndex",
  "testId",
  "motion",
] as const satisfies ReadonlyArray<Exclude<keyof HostProps, "children" | "ref">>

const INPUT_CUSTOM_PROPS = ["value", "placeholder", "readOnly", "theme"] as const

type BoundHostProp = (typeof BOUND_HOST_PROPS)[number]
type BoundHostValue = HostProps[BoundHostProp]
type HostSnapshot = Map<BoundHostProp, BoundHostValue>
type InputCustomProp = (typeof INPUT_CUSTOM_PROPS)[number]
type InputSnapshot = Map<InputCustomProp, InputProps[InputCustomProp]>

export function isRenderFunction<Argument>(
  value: SolidElement | ((argument: Argument) => SolidElement),
): value is (argument: Argument) => SolidElement {
  return value instanceof Function
}

export function resolveStyle<State>(
  style: StateStyle<State> | undefined,
  state: State,
): StyleDesc | undefined {
  return style instanceof Function ? style(state) : style
}

export function mergeStyles(
  base: StyleDesc | undefined,
  override: StyleDesc | undefined,
): StyleDesc | undefined {
  if (!base) return override
  if (!override) return base
  return { ...base, ...override }
}

export function floatingRootStyle(style: StyleDesc | undefined): StyleDesc {
  return {
    display: "flex",
    position: "relative",
    alignItems: "start",
    ...style,
  }
}

export function composeHandlers(
  first: HostEventHandler | undefined,
  second: HostEventHandler | undefined,
): HostEventHandler | undefined {
  if (!first) return second
  if (!second) return first
  return (event) => {
    first(event)
    second(event)
  }
}

export function composeRefs(...refs: Array<HostRef | undefined>): HostRef | undefined {
  const active = refs.filter((ref): ref is HostRef => ref !== undefined)
  if (active.length === 0) return undefined
  return (instance) => {
    for (const ref of active) ref(instance)
  }
}

export function createControllableState<Value>(
  controlled: Accessor<Value | undefined>,
  defaultValue: Value,
  onChange: Accessor<((value: Value) => void) | undefined>,
): readonly [Accessor<Value>, (value: Value) => void] {
  const [internal, setInternal] = createSignal(defaultValue)
  const value = (): Value => {
    const external = controlled()
    return external === undefined ? internal() : external
  }
  const setValue = (next: Value): void => {
    const current = value()
    if (Object.is(current, next)) return
    if (controlled() === undefined) setInternal(() => next)
    onChange()?.(next)
  }
  return [value, setValue] as const
}

export function createHostProps(
  source: HostBindingSource,
  overrides: HostBindingOverrides = {},
): HostProps {
  return {
    get style() {
      return overrides.style?.()
    },
    get children() {
      return overrides.children ? overrides.children() : source.children
    },
    get ref() {
      return source.ref
    },
    get onClick() {
      return source.onClick
    },
    get onMouseDown() {
      return source.onMouseDown
    },
    get onMouseUp() {
      return source.onMouseUp
    },
    get onMouseEnter() {
      return source.onMouseEnter
    },
    get onMouseLeave() {
      return source.onMouseLeave
    },
    get onMouseMove() {
      return source.onMouseMove
    },
    get onMouseDownOutside() {
      return source.onMouseDownOutside
    },
    get onKeyDown() {
      return source.onKeyDown
    },
    get onKeyUp() {
      return source.onKeyUp
    },
    get onFocus() {
      return source.onFocus
    },
    get onBlur() {
      return source.onBlur
    },
    get onScroll() {
      return source.onScroll
    },
    get onChange() {
      return source.onChange
    },
    get onSubmit() {
      return source.onSubmit
    },
    get onToggleFile() {
      return source.onToggleFile
    },
    get onShowMore() {
      return source.onShowMore
    },
    get onLineClick() {
      return source.onLineClick
    },
    get onLinkClick() {
      return source.onLinkClick
    },
    get autoFocus() {
      return source.autoFocus
    },
    get tabIndex() {
      return source.tabIndex
    },
    get testId() {
      return source.testId
    },
    get motion() {
      return source.motion
    },
  }
}

function snapshotHostProps(
  props: HostProps,
  styleOverride: Accessor<StyleDesc | undefined> | undefined,
): HostSnapshot {
  const snapshot = new Map<BoundHostProp, BoundHostValue>()
  for (const name of BOUND_HOST_PROPS) {
    snapshot.set(name, name === "style" && styleOverride ? styleOverride() : props[name])
  }
  return snapshot
}

function bindHostProps(
  node: HostElementNode,
  props: HostProps,
  styleOverride: Accessor<StyleDesc | undefined> | undefined,
): void {
  let previous: HostSnapshot | undefined
  createRenderEffect(
    () => snapshotHostProps(props, styleOverride),
    (next) => {
      for (const name of BOUND_HOST_PROPS) {
        const value = next.get(name)
        const prior = previous?.get(name)
        if (previous && Object.is(value, prior)) continue
        setHostProperty(node, name, value, prior)
      }
      previous = next
    },
  )
  if (props.ref) spread(node, { ref: props.ref }, true)
}

function snapshotInputProps(props: InputProps): InputSnapshot {
  const snapshot = new Map<InputCustomProp, InputProps[InputCustomProp]>()
  for (const name of INPUT_CUSTOM_PROPS) snapshot.set(name, props[name])
  return snapshot
}

function bindInputProps(node: HostElementNode, props: InputProps): void {
  let previous: InputSnapshot | undefined
  createRenderEffect(
    () => snapshotInputProps(props),
    (next) => {
      for (const name of INPUT_CUSTOM_PROPS) {
        const value = next.get(name)
        const prior = previous?.get(name)
        if (previous && Object.is(value, prior)) continue
        setHostProperty(node, name, value, prior)
      }
      previous = next
    },
  )
}

export function renderDiv(
  props: HostProps,
  styleOverride?: Accessor<StyleDesc | undefined>,
): HostElementNode {
  const node = createHostElement("div")
  bindHostProps(node, props, styleOverride)
  insert(node, () => props.children)
  return node
}

export function renderInput(props: InputProps): HostElementNode {
  const node = createHostElement("input")
  bindHostProps(node, props, undefined)
  bindInputProps(node, props)
  insert(node, () => props.children)
  return node
}

export function renderSlot(as: SlotRenderer | undefined, props: HostProps): SolidElement {
  return as ? as(props) : renderDiv(props)
}

function bindAnchoredProps(
  node: HostElementNode,
  side: Accessor<FloatingSide>,
  align: Accessor<FloatingAlign>,
  sideOffset: Accessor<number>,
  alignOffset: Accessor<number>,
  collisionPadding: Accessor<number>,
): void {
  createRenderEffect(
    () => ({
      side: side(),
      align: align(),
      sideOffset: sideOffset(),
      alignOffset: alignOffset(),
      collisionPadding: collisionPadding(),
    }),
    (next, previous) => {
      if (!previous || next.side !== previous.side) {
        setHostProperty(node, "side", next.side, previous?.side)
      }
      if (!previous || next.align !== previous.align) {
        setHostProperty(node, "align", next.align, previous?.align)
      }
      if (!previous || next.sideOffset !== previous.sideOffset) {
        setHostProperty(node, "gap", next.sideOffset, previous?.sideOffset)
      }
      const offset = next.side === "top" || next.side === "bottom"
        ? { x: next.alignOffset, y: 0 }
        : { x: 0, y: next.alignOffset }
      const previousOffset = previous
        ? previous.side === "top" || previous.side === "bottom"
          ? { x: previous.alignOffset, y: 0 }
          : { x: 0, y: previous.alignOffset }
        : undefined
      if (
        !previousOffset ||
        offset.x !== previousOffset.x ||
        offset.y !== previousOffset.y
      ) {
        setHostProperty(node, "offset", offset, previousOffset)
      }
      if (!previous || next.collisionPadding !== previous.collisionPadding) {
        setHostProperty(
          node,
          "snapMargin",
          next.collisionPadding,
          previous?.collisionPadding,
        )
      }
      if (!previous) {
        setHostProperty(node, "fit", "snap", undefined)
        setHostProperty(node, "deferred", true, undefined)
        setHostProperty(node, "priority", 1, undefined)
        setHostProperty(node, "occlude", true, undefined)
      }
    },
  )
}

export function FloatingLayer(props: FloatingContentProps): HostElementNode {
  const anchored = createHostElement("anchored")
  bindAnchoredProps(
    anchored,
    () => props.side ?? "bottom",
    () => props.align ?? "start",
    () => props.sideOffset ?? 0,
    () => props.alignOffset ?? 0,
    () => props.collisionPadding ?? 8,
  )

  const content = renderDiv(
    props,
    () => mergeStyles({ backgroundColor: "#1A1A1A" }, props.style),
  )
  insert(anchored, content)
  return anchored
}

export function escapePressed(event: EventPayload): boolean {
  return event.key === "escape"
}
