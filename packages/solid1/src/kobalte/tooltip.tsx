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
  type FloatingPosition,
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

interface TriggerBounds {
  left: number
  top: number
  right: number
  bottom: number
}

type PositionedInstance = PublicInstance & { getBoundingClientRect: () => TriggerBounds }

type TooltipContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  scheduleOpen: () => void
  scheduleClose: () => void
  scheduleTransitClose: () => void
  cancelClose: () => void
  placement: () => TooltipPlacement
  gutter: () => number
  setTrigger: (instance: PublicInstance) => void
  triggerBounds: () => TriggerBounds | undefined
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

function positioned(instance: PublicInstance): PositionedInstance {
  // SAFETY: Solid host refs are HostElementNode instances, whose DOM-compat contract implements getBoundingClientRect().
  return instance as PositionedInstance
}

function TooltipRoot(props: TooltipRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  let trigger: PositionedInstance | undefined
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
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
  const scheduleCloseAfter = (delay: number) => {
    clearOpen()
    clearClose()
    if (delay <= 0) setOpen(false)
    else closeTimer = setTimeout(() => setOpen(false), delay)
  }
  const scheduleClose = () => scheduleCloseAfter(props.closeDelay ?? 300)
  const scheduleTransitClose = () => {
    const delay = props.closeDelay ?? 300
    scheduleCloseAfter(delay > 0 ? delay : 75)
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
    scheduleTransitClose,
    cancelClose: clearClose,
    placement: () => props.placement ?? "top",
    gutter: () => props.gutter ?? 6,
    setTrigger(instance) { trigger = positioned(instance) },
    triggerBounds: () => trigger?.getBoundingClientRect(),
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
      onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); context.scheduleTransitClose() }}
      onFocus={(event: EventPayload) => { props.onFocus?.(event); context.setOpen(true) }}
      onBlur={(event: EventPayload) => { props.onBlur?.(event); context.setOpen(false) }}
      onMouseDown={(event: EventPayload) => { props.onMouseDown?.(event); context.setOpen(false) }}
      onClick={(event: EventPayload) => { props.onClick?.(event); context.setOpen(false) }}
      onKeyDown={(event: EventPayload) => {
        props.onKeyDown?.(event)
        if (event.key === "escape" || event.key === "space" || event.key === "enter") context.setOpen(false)
        else context.setOpen(true)
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
  const position = (): FloatingPosition | undefined => {
    const bounds = context.triggerBounds()
    if (!bounds) return undefined
    switch (placement().side) {
      case "top": return { x: (bounds.left + bounds.right) / 2, y: bounds.top }
      case "bottom": return { x: (bounds.left + bounds.right) / 2, y: bounds.bottom }
      case "left": return { x: bounds.left, y: (bounds.top + bounds.bottom) / 2 }
      case "right": return { x: bounds.right, y: (bounds.top + bounds.bottom) / 2 }
    }
  }
  const fallbackStyle = { padding: 6, borderWidth: 1, borderColor: "#34343a", borderRadius: 4 }
  const style = () => hasNativeClassStyle(props)
    ? (props.style ?? {})
    : mergeStyle(fallbackStyle, props.style)

  return (
    <Show when={context.open()}>
      <FloatingLayer
        ref={props.ref}
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        position={position()}
        side={placement().side}
        align={placement().align}
        sideOffset={props.gutter ?? context.gutter()}
        onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); context.cancelClose() }}
        onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); context.scheduleClose() }}
        style={style()}
      >
        {props.children}
      </FloatingLayer>
    </Show>
  )
}

export const Tooltip = Object.assign(TooltipRoot, { Trigger, Content, Portal })
export { TooltipRoot as Root, Portal }
