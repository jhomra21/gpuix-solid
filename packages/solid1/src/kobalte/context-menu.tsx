import { createContext, createSignal, onCleanup, Show, useContext, type JSX } from "solid-js"
import type { EventPayload, PublicInstance, StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import {
  FloatingLayer,
  Portal,
  createFocusRegistry,
  mergeComponentStyle,
  mergeStyle,
  popupBaseStyle,
  type FloatingPosition,
  type FocusKey,
  type FocusRegistry,
  type FocusableInstance,
  type NativeComponentProps,
} from "./shared.jsx"

export interface ContextMenuRootProps { children?: JSX.Element; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; gutter?: number }
export interface ContextMenuTriggerProps<T = "div"> extends NativeComponentProps { as?: T }
export interface ContextMenuContentProps<T = "div"> extends NativeComponentProps { as?: T }
export interface ContextMenuItemProps<T = "div"> extends NativeComponentProps { as?: T; onSelect?: () => void }
export interface ContextMenuSeparatorProps<T = "hr"> extends NativeComponentProps { as?: T }
export interface ContextMenuGroupProps { children?: JSX.Element }
export interface ContextMenuGroupLabelProps<T = "span"> extends NativeComponentProps { as?: T }
export interface ContextMenuSubProps { children?: JSX.Element; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; gutter?: number }
export interface ContextMenuSubTriggerProps<T = "div"> extends NativeComponentProps { as?: T }
export interface ContextMenuSubContentProps<T = "div"> extends NativeComponentProps { as?: T }

interface ContextPoint { x: number; y: number }
type PositionedInstance = FocusableInstance & {
  getBoundingClientRect: () => { left: number; top: number; right: number; bottom: number }
}
type ContextMenuContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  position: () => ContextPoint
  gutter: () => number
  openAt: (event: EventPayload) => void
  openAtPoint: (point: ContextPoint) => void
  items: FocusRegistry
  setTrigger: (instance: PublicInstance) => void
  focusTrigger: () => void
}
const ContextMenuContext = createContext<ContextMenuContextValue>()
type SubContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  gutter: () => number
  setTrigger: (instance: PublicInstance) => void
  focusTrigger: () => void
  position: () => FloatingPosition | undefined
}
const SubContext = createContext<SubContextValue>()

function requireContext(name: string): ContextMenuContextValue {
  const context = useContext(ContextMenuContext)
  if (!context) throw new Error(`${name} must be used inside ContextMenu.Root`)
  return context
}

function isContextClick(event: EventPayload): boolean {
  return event.isRightClick === true || event.button === 2
}

function isActivationKey(key: string | undefined): boolean {
  return key === "enter" || key === "space"
}

function focusable(instance: PublicInstance): FocusableInstance {
  // SAFETY: Solid host refs are HostElementNode instances, and HostElementNode implements focus().
  return instance as FocusableInstance
}

function positioned(instance: PublicInstance): PositionedInstance {
  // SAFETY: Solid host refs are HostElementNode instances, whose DOM-compat contract implements focus() and getBoundingClientRect().
  return instance as PositionedInstance
}

function focusAfterMount(action: () => void): void {
  queueMicrotask(action)
}

export function Root(props: ContextMenuRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const [position, setPosition] = createSignal<ContextPoint>({ x: 0, y: 0 })
  const items = createFocusRegistry()
  let trigger: FocusableInstance | undefined
  const open = () => props.open ?? internalOpen()
  const gutter = () => props.gutter ?? 0
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next)
  }
  const openAtPoint = (point: ContextPoint) => {
    setPosition(point)
    setOpen(true)
  }
  const openAt = (event: EventPayload) => {
    if (!isContextClick(event)) return
    openAtPoint({ x: event.x ?? 0, y: event.y ?? 0 })
  }
  return (
    <ContextMenuContext.Provider value={{
      open,
      setOpen,
      position,
      gutter,
      openAt,
      openAtPoint,
      items,
      setTrigger(instance) { trigger = focusable(instance) },
      focusTrigger() { trigger?.focus() },
    }}>
      {props.children}
    </ContextMenuContext.Provider>
  )
}

export function Trigger<T = "div">(props: PolymorphicProps<T, ContextMenuTriggerProps<T>>): JSX.Element {
  const context = requireContext("ContextMenu.Trigger")
  return (
    <div
      ref={(instance: PublicInstance) => { context.setTrigger(instance); props.ref?.(instance) }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={props.tabIndex ?? 0}
      onMouseDown={(event: EventPayload) => {
        props.onMouseDown?.(event)
        context.openAt(event)
      }}
      onClick={(event: EventPayload) => {
        props.onClick?.(event)
        context.openAt(event)
      }}
      onKeyDown={(event: EventPayload) => {
        props.onKeyDown?.(event)
        if ((event.key === "f10" && event.shiftKey) || event.key === "contextmenu") {
          const bounds = event.currentTarget?.getBoundingClientRect()
          context.openAtPoint({ x: bounds?.left ?? 0, y: bounds?.bottom ?? 0 })
          focusAfterMount(context.items.focusFirst)
        } else if (event.key === "escape") context.setOpen(false)
      }}
      style={mergeStyle({ userSelect: "none" }, props.style)}
    >{props.children}</div>
  )
}

export function Content<T = "div">(props: PolymorphicProps<T, ContextMenuContentProps<T>>): JSX.Element {
  const context = requireContext("ContextMenu.Content")
  return (
    <Show when={context.open()}>
      <anchored
        testId={props.testId ? `${props.testId}-positioner` : undefined}
        position={context.position()}
        side="bottom"
        align="start"
        gap={context.gutter()}
        fit="snap"
        snapMargin={8}
        deferred
        priority={2}
        occlude
        style={{ backgroundColor: "#00000001" }}
      >
        <div
          class={props.class}
          className={props.className}
          classList={props.classList}
          testId={props.testId}
          tabIndex={props.tabIndex ?? 0}
          onMouseDownOutside={(event: EventPayload) => { props.onMouseDownOutside?.(event); context.setOpen(false) }}
          onKeyDown={(event: EventPayload) => {
            props.onKeyDown?.(event)
            if (event.key === "escape") {
              context.setOpen(false)
              focusAfterMount(context.focusTrigger)
            }
          }}
          style={mergeComponentStyle({ pointerEvents: "auto" }, popupBaseStyle, props)}
        >{props.children}</div>
      </anchored>
    </Show>
  )
}

export function Item<T = "div">(props: PolymorphicProps<T, ContextMenuItemProps<T>>): JSX.Element {
  const context = requireContext("ContextMenu.Item")
  const sub = useContext(SubContext)
  const focusKey: FocusKey = Symbol("context-item")
  onCleanup(() => context.items.unregister(focusKey))
  const activate = () => {
    if (props.disabled) return
    props.onSelect?.()
    context.setOpen(false)
    focusAfterMount(context.focusTrigger)
  }
  const style = (): StyleDesc => mergeComponentStyle(
    {
      cursor: "pointer",
      opacity: props.disabled ? 0.5 : 1,
      pointerEvents: props.disabled ? "none" : "auto",
    },
    {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      minHeight: 26,
      paddingLeft: 8,
      paddingRight: 8,
      gap: 6,
      hover: { backgroundColor: "#2a2a30" },
    },
    props,
  )
  return (
    <div
      ref={(instance: PublicInstance) => {
        if (!props.disabled) context.items.register(focusKey, instance)
        props.ref?.(instance)
      }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={props.disabled ? undefined : (props.tabIndex ?? -1)}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      onClick={(event: EventPayload) => {
        if (props.disabled) return
        props.onClick?.(event)
        activate()
      }}
      onKeyDown={(event: EventPayload) => {
        if (props.disabled) return
        props.onKeyDown?.(event)
        if (isActivationKey(event.key)) activate()
        else if (event.key === "down") context.items.focusNext(focusKey)
        else if (event.key === "up") context.items.focusPrevious(focusKey)
        else if (event.key === "home") context.items.focusFirst()
        else if (event.key === "end") context.items.focusLast()
        else if (event.key === "left" && sub) {
          sub.setOpen(false)
          focusAfterMount(sub.focusTrigger)
        } else if (event.key === "escape") {
          context.setOpen(false)
          focusAfterMount(context.focusTrigger)
        }
      }}
      style={style()}
    >{props.children}</div>
  )
}

export function Separator<T = "hr">(props: PolymorphicProps<T, ContextMenuSeparatorProps<T>>): JSX.Element {
  return <div class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={mergeComponentStyle({}, { height: 1, marginTop: 4, marginBottom: 4, backgroundColor: "#34343a" }, props)} />
}

export function Group(props: ContextMenuGroupProps): JSX.Element { return <>{props.children}</> }
export function GroupLabel<T = "span">(props: PolymorphicProps<T, ContextMenuGroupLabelProps<T>>): JSX.Element {
  return <text class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={mergeComponentStyle({}, { fontSize: 11, lineHeight: 16, fontWeight: 700, color: "#a1a1aa", paddingLeft: 8, paddingRight: 8 }, props)}>{props.children}</text>
}

export function Sub(props: ContextMenuSubProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  let trigger: PositionedInstance | undefined
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => { if (props.open === undefined) setInternalOpen(next); props.onOpenChange?.(next) }
  return (
    <SubContext.Provider value={{
      open,
      setOpen,
      gutter: () => props.gutter ?? 4,
      setTrigger(instance) { trigger = positioned(instance) },
      focusTrigger() { trigger?.focus() },
      position() {
        if (!trigger) return undefined
        const bounds = trigger.getBoundingClientRect()
        return { x: bounds.right, y: bounds.top }
      },
    }}>
      {props.children}
    </SubContext.Provider>
  )
}

export function SubTrigger<T = "div">(props: PolymorphicProps<T, ContextMenuSubTriggerProps<T>>): JSX.Element {
  const menu = requireContext("ContextMenu.SubTrigger")
  const context = useContext(SubContext)
  if (!context) throw new Error("ContextMenu.SubTrigger must be used inside ContextMenu.Sub")
  const focusKey: FocusKey = Symbol("context-sub-trigger")
  onCleanup(() => menu.items.unregister(focusKey))
  const style = (): StyleDesc => mergeComponentStyle(
    {
      cursor: "pointer",
      opacity: props.disabled ? 0.5 : 1,
      pointerEvents: props.disabled ? "none" : "auto",
    },
    {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      minHeight: 26,
      paddingLeft: 8,
      paddingRight: 8,
      hover: { backgroundColor: "#2a2a30" },
    },
    props,
  )
  return (
    <div
      ref={(instance: PublicInstance) => {
        context.setTrigger(instance)
        if (!props.disabled) menu.items.register(focusKey, instance)
        props.ref?.(instance)
      }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={props.disabled ? undefined : (props.tabIndex ?? -1)}
      onMouseEnter={(event: EventPayload) => {
        props.onMouseEnter?.(event)
        if (props.disabled) return
        context.setOpen(true)
      }}
      onMouseLeave={props.onMouseLeave}
      onClick={(event: EventPayload) => { if (props.disabled) return; props.onClick?.(event); context.setOpen(!context.open()) }}
      onKeyDown={(event: EventPayload) => {
        if (props.disabled) return
        props.onKeyDown?.(event)
        if (isActivationKey(event.key) || event.key === "right") {
          context.setOpen(true)
          focusAfterMount(() => menu.items.focusNext(focusKey))
        } else if (event.key === "down") menu.items.focusNext(focusKey)
        else if (event.key === "up") menu.items.focusPrevious(focusKey)
        else if (event.key === "home") menu.items.focusFirst()
        else if (event.key === "end") menu.items.focusLast()
        else if (event.key === "left") context.setOpen(false)
        else if (event.key === "escape") {
          menu.setOpen(false)
          focusAfterMount(menu.focusTrigger)
        }
      }}
      style={style()}
    >{props.children}</div>
  )
}

export function SubContent<T = "div">(props: PolymorphicProps<T, ContextMenuSubContentProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("ContextMenu.SubContent must be used inside ContextMenu.Sub")
  return (
    <Show when={context.open()}>
      <FloatingLayer
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        position={context.position()}
        side="right"
        align="start"
        sideOffset={context.gutter()}
        style={props.style}
      >{props.children}</FloatingLayer>
    </Show>
  )
}

export const ContextMenu = Object.assign(Root, { Root, Trigger, Portal, Content, Item, Separator, Group, GroupLabel, Sub, SubTrigger, SubContent })
export { Portal }
