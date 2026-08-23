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

type BoundHostProp = (typeof BOUND_HOST_PROPS)[number]
type BoundHostValue = HostProps[BoundHostProp]
type HostSnapshot = Map<BoundHostProp, BoundHostValue>

export function resolveStyle<State>(
  style: StateStyle<State> | undefined,
  state: State,
): StyleDesc | undefined {
  return typeof style === "function" ? style(state) : style
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

export function createControllableState<Value>(
  controlled: Accessor<Value | undefined>,
  defaultValue: Value,
  onChange: Accessor<((value: Value) => void) | undefined>,
): readonly [Accessor<Value>, (value: Value) => void] {
  const [internal, setInternal] = createSignal(defaultValue)
  const value = (): Value => controlled() === undefined ? internal() : controlled() as Value
  const setValue = (next: Value): void => {
    const current = value()
    if (Object.is(current, next)) return
    if (controlled() === undefined) setInternal(() => next)
    onChange()?.(next)
  }
  return [value, setValue] as const
}

function snapshotHostProps(props: HostProps): HostSnapshot {
  const snapshot = new Map<BoundHostProp, BoundHostValue>()
  for (const name of BOUND_HOST_PROPS) snapshot.set(name, props[name])
  return snapshot
}

function bindHostProps(node: HostElementNode, props: HostProps): void {
  let previous: HostSnapshot | undefined
  createRenderEffect(
    () => snapshotHostProps(props),
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

export function renderDiv(props: HostProps): HostElementNode {
  const node = createHostElement("div")
  bindHostProps(node, props)
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

  const content = renderDiv({
    get children() {
      return props.children
    },
    get style() {
      return mergeStyles({ backgroundColor: "#1A1A1A" }, props.style)
    },
    get ref() {
      return props.ref
    },
    get onClick() {
      return props.onClick
    },
    get onMouseDown() {
      return props.onMouseDown
    },
    get onMouseUp() {
      return props.onMouseUp
    },
    get onMouseEnter() {
      return props.onMouseEnter
    },
    get onMouseLeave() {
      return props.onMouseLeave
    },
    get onMouseMove() {
      return props.onMouseMove
    },
    get onMouseDownOutside() {
      return props.onMouseDownOutside
    },
    get onKeyDown() {
      return props.onKeyDown
    },
    get onKeyUp() {
      return props.onKeyUp
    },
    get onFocus() {
      return props.onFocus
    },
    get onBlur() {
      return props.onBlur
    },
    get onScroll() {
      return props.onScroll
    },
    get autoFocus() {
      return props.autoFocus
    },
    get tabIndex() {
      return props.tabIndex
    },
    get testId() {
      return props.testId
    },
    get motion() {
      return props.motion
    },
  })
  insert(anchored, content)
  return anchored
}

export function escapePressed(event: EventPayload): boolean {
  return event.key === "escape"
}
