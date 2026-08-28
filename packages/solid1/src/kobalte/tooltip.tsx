import { createContext, createSignal, onCleanup, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { PublicInstance } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import {
  FloatingLayer,
  Portal,
  hasNativeClassStyle,
  mergeStyle,
  triggerBaseStyle,
  type FloatingAlign,
  type FloatingSide,
  type NativeComponentProps,
} from "./shared.jsx"

export type TooltipPlacement = `${FloatingSide}` | `${FloatingSide}-${FloatingAlign}`

export interface TooltipRootProps {
  children?: JSX.Element
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  openDelay?: number
  closeDelay?: number
  placement?: TooltipPlacement
  gutter?: number
}

export interface TooltipTriggerProps<T = "button"> extends NativeComponentProps { as?: T }
export interface TooltipContentProps<T = "div"> extends NativeComponentProps {
  as?: T
  placement?: TooltipPlacement
  gutter?: number
}
export interface TooltipPortalProps { children?: JSX.Element }

interface ParsedTooltipPlacement {
  side: FloatingSide
  align: FloatingAlign
}

interface TooltipBounds {
  left: number
  top: number
  right: number
  bottom: number
}

type TooltipElementInstance = PublicInstance & {
  getBoundingClientRect: () => TooltipBounds
}

type TooltipContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  scheduleOpen: () => void
  scheduleClose: (event: EventPayload) => void
  cancelClose: () => void
  setTrigger: (instance: PublicInstance) => void
  setContent: (instance: PublicInstance) => void
  placement: () => TooltipPlacement
  gutter: () => number
}

const TooltipContext = createContext<TooltipContextValue>()

function parsePlacement(value: TooltipPlacement): ParsedTooltipPlacement {
  const side: FloatingSide = value.startsWith("right")
    ? "right"
    : value.startsWith("bottom")
      ? "bottom"
      : value.startsWith("left")
        ? "left"
        : "top"
  const align: FloatingAlign = value.endsWith("-start")
    ? "start"
    : value.endsWith("-end")
      ? "end"
      : "center"
  return { side, align }
}

function requireContext(name: string): TooltipContextValue {
  const context = useContext(TooltipContext)
  if (!context) throw new Error(`${name} must be used inside Tooltip`)
  return context
}

function tooltipElement(instance: PublicInstance): TooltipElementInstance {
  // SAFETY: Solid host refs are HostElementNode instances, whose DOM-compat contract implements getBoundingClientRect().
  return instance as TooltipElementInstance
}

function containsPoint(bounds: TooltipBounds, x: number, y: number): boolean {
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
}

function pointInPolygon(x: number, y: number, points: ReadonlyArray<readonly [number, number]>): boolean {
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const a = points[index]
    const b = points[previous]
    if (!a || !b) continue
    const [ax, ay] = a
    const [bx, by] = b
    const crosses = (ay > y) !== (by > y)
    if (!crosses) continue
    const edgeX = ((bx - ax) * (y - ay)) / (by - ay) + ax
    if (x < edgeX) inside = !inside
  }
  return inside
}

function transitPolygon(
  side: FloatingSide,
  trigger: TooltipBounds,
  content: TooltipBounds,
): ReadonlyArray<readonly [number, number]> {
  const margin = 4
  if (side === "top") {
    return [
      [content.left - margin, content.bottom + margin],
      [content.right + margin, content.bottom + margin],
      [trigger.right + margin, trigger.top - margin],
      [trigger.left - margin, trigger.top - margin],
    ]
  }
  if (side === "bottom") {
    return [
      [trigger.left - margin, trigger.bottom + margin],
      [trigger.right + margin, trigger.bottom + margin],
      [content.right + margin, content.top - margin],
      [content.left - margin, content.top - margin],
    ]
  }
  if (side === "left") {
    return [
      [content.right + margin, content.top - margin],
      [trigger.left - margin, trigger.top - margin],
      [trigger.left - margin, trigger.bottom + margin],
      [content.right + margin, content.bottom + margin],
    ]
  }
  return [
    [trigger.right + margin, trigger.top - margin],
    [content.left - margin, content.top - margin],
    [content.left - margin, content.bottom + margin],
    [trigger.right + margin, trigger.bottom + margin],
  ]
}

function TooltipRoot(props: TooltipRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let trigger: TooltipElementInstance | undefined
  let content: TooltipElementInstance | undefined
  const open = () => props.open ?? internalOpen()
  const clearOpen = () => { if (openTimer) clearTimeout(openTimer); openTimer = undefined }
  const clearClose = () => { if (closeTimer) clearTimeout(closeTimer); closeTimer = undefined }
  const setOpen = (next: boolean) => {
    const previous = open()
    clearOpen()
    clearClose()
    if (props.open === undefined) setInternalOpen(next)
    if (previous !== next) props.onOpenChange?.(next)
  }
  const scheduleOpen = () => {
    clearClose()
    clearOpen()
    const delay = props.openDelay ?? 700
    if (delay <= 0) setOpen(true)
    else openTimer = setTimeout(() => setOpen(true), delay)
  }
  const isSafeTransit = (event: EventPayload): boolean => {
    const x = event.x
    const y = event.y
    if (x === undefined || y === undefined || !trigger || !content) return false
    const triggerBounds = trigger.getBoundingClientRect()
    const contentBounds = content.getBoundingClientRect()
    if (containsPoint(triggerBounds, x, y) || containsPoint(contentBounds, x, y)) return true
    const { side } = parsePlacement(props.placement ?? "top")
    return pointInPolygon(x, y, transitPolygon(side, triggerBounds, contentBounds))
  }
  const scheduleClose = (event: EventPayload) => {
    clearOpen()
    clearClose()
    const delay = props.closeDelay ?? 300
    if (delay > 0) {
      closeTimer = setTimeout(() => setOpen(false), delay)
      return
    }
    if (isSafeTransit(event)) {
      closeTimer = setTimeout(() => setOpen(false), 75)
      return
    }
    setOpen(false)
  }
  onCleanup(() => {
    clearOpen()
    clearClose()
  })
  const context: TooltipContextValue = {
    open,
    setOpen,
    scheduleOpen,
    scheduleClose,
    cancelClose: clearClose,
    setTrigger(instance) { trigger = tooltipElement(instance) },
    setContent(instance) { content = tooltipElement(instance) },
    placement: () => props.placement ?? "top",
    gutter: () => props.gutter ?? 6,
  }
  return (
    <TooltipContext.Provider value={context}>
      <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "row", position: "relative", alignItems: "center" }}>
          {props.children}
        </div>
      </div>
    </TooltipContext.Provider>
  )
}

export function Trigger<T = "button">(props: PolymorphicProps<T, TooltipTriggerProps<T>>): JSX.Element {
  const context = requireContext("Tooltip.Trigger")
  return (
    <div
      ref={(instance: PublicInstance) => { context.setTrigger(instance); props.ref?.(instance) }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId ?? props["aria-label"]}
      tabIndex={props.tabIndex ?? 0}
      onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); context.scheduleOpen() }}
      onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); context.scheduleClose(event) }}
      onFocus={(event: EventPayload) => { props.onFocus?.(event); context.setOpen(true) }}
      onBlur={(event: EventPayload) => { props.onBlur?.(event); context.setOpen(false) }}
      onMouseDown={(event: EventPayload) => { props.onMouseDown?.(event); context.setOpen(false) }}
      onClick={(event: EventPayload) => { props.onClick?.(event); context.setOpen(false) }}
      onKeyDown={(event: EventPayload) => {
        props.onKeyDown?.(event)
        if (event.key === "escape" || event.key === "space" || event.key === "enter") context.setOpen(false)
      }}
      style={mergeStyle(triggerBaseStyle, props.style)}
    >
      {props.children}
    </div>
  )
}

export function Content<T = "div">(props: PolymorphicProps<T, TooltipContentProps<T>>): JSX.Element {
  const context = requireContext("Tooltip.Content")
  const placement = () => parsePlacement(props.placement ?? context.placement())
  const fallbackStyle = { padding: 6, borderWidth: 1, borderColor: "#34343a", borderRadius: 4 }
  const style = () => hasNativeClassStyle(props)
    ? (props.style ?? {})
    : mergeStyle(fallbackStyle, props.style)

  return (
    <Show when={context.open()}>
      <FloatingLayer
        ref={(instance: PublicInstance) => { context.setContent(instance); props.ref?.(instance) }}
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        side={placement().side}
        align={placement().align}
        sideOffset={props.gutter ?? context.gutter()}
        onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); context.cancelClose() }}
        onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); context.scheduleClose(event) }}
        style={style()}
      >
        {props.children}
      </FloatingLayer>
    </Show>
  )
}

export const Tooltip = Object.assign(TooltipRoot, { Trigger, Content, Portal })
export { TooltipRoot as Root, Portal }
