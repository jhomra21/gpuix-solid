import { createContext, createSignal, onCleanup, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { PublicInstance, StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import {
  FloatingLayer,
  Portal,
  createFocusRegistry,
  mergeStyle,
  popupBaseStyle,
  triggerBaseStyle,
  type FloatingPosition,
  type FocusKey,
  type FocusRegistry,
  type FocusableInstance,
  type NativeComponentProps,
} from "./shared.jsx"

export interface MenubarRootProps extends NativeComponentProps { value?: string | null; defaultValue?: string | null; onValueChange?: (value: string | null) => void }
export interface MenubarMenuProps { children?: JSX.Element; value?: string; gutter?: number; shift?: number }
export interface MenubarTriggerProps<T = "button"> extends NativeComponentProps { as?: T }
export interface MenubarContentProps<T = "div"> extends NativeComponentProps { as?: T }
export interface MenubarItemProps<T = "div"> extends NativeComponentProps { as?: T; onSelect?: () => void }
export interface MenubarSeparatorProps<T = "hr"> extends NativeComponentProps { as?: T }
export interface MenubarSubProps { children?: JSX.Element; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; gutter?: number }
export interface MenubarSubTriggerProps<T = "div"> extends NativeComponentProps { as?: T }
export interface MenubarSubContentProps<T = "div"> extends NativeComponentProps { as?: T }

type PositionedInstance = FocusableInstance & {
  getBoundingClientRect: () => { left: number; top: number; right: number; bottom: number }
}
type TriggerEntry = { key: FocusKey; value: string; instance: FocusableInstance }
type MenubarContextValue = {
  value: () => string | null | undefined
  setValue: (value: string | null) => void
  registerTrigger: (entry: TriggerEntry) => void
  unregisterTrigger: (key: FocusKey) => void
  focusNextTrigger: (key: FocusKey) => void
  focusPreviousTrigger: (key: FocusKey) => void
}
const MenubarContext = createContext<MenubarContextValue>()
type MenuContextValue = {
  key: FocusKey
  value: () => string
  gutter: () => number
  shift: () => number
  items: FocusRegistry
  setTrigger: (instance: PublicInstance) => void
  focusTrigger: () => void
  position: () => FloatingPosition | undefined
}
const MenuContext = createContext<MenuContextValue>()
type SubContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  gutter: () => number
  setTrigger: (instance: PublicInstance) => void
  focusTrigger: () => void
  position: () => FloatingPosition | undefined
}
const SubContext = createContext<SubContextValue>()

function requireRoot(name: string): MenubarContextValue {
  const context = useContext(MenubarContext)
  if (!context) throw new Error(`${name} must be used inside Menubar.Root`)
  return context
}
function requireMenu(name: string): MenuContextValue {
  const context = useContext(MenuContext)
  if (!context) throw new Error(`${name} must be used inside Menubar.Menu`)
  return context
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

export function Root(props: MenubarRootProps): JSX.Element {
  const [internalValue, setInternalValue] = createSignal<string | null | undefined>(props.defaultValue)
  const triggers: TriggerEntry[] = []
  const value = () => props.value ?? internalValue()
  const setValue = (next: string | null) => { if (props.value === undefined) setInternalValue(next); props.onValueChange?.(next) }
  const focusRelative = (key: FocusKey, delta: number) => {
    if (triggers.length === 0) return
    const index = triggers.findIndex((entry) => entry.key === key)
    const next = ((index < 0 ? 0 : index + delta) % triggers.length + triggers.length) % triggers.length
    const target = triggers[next]
    if (!target) return
    target.instance.focus()
    if (value() != null) setValue(target.value)
  }
  return (
    <MenubarContext.Provider value={{
      value,
      setValue,
      registerTrigger(entry) {
        const index = triggers.findIndex((candidate) => candidate.key === entry.key)
        if (index >= 0) triggers[index] = entry
        else triggers.push(entry)
      },
      unregisterTrigger(key) {
        const index = triggers.findIndex((entry) => entry.key === key)
        if (index >= 0) triggers.splice(index, 1)
      },
      focusNextTrigger(key) { focusRelative(key, 1) },
      focusPreviousTrigger(key) { focusRelative(key, -1) },
    }}>
      <div
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }, props.style)}
      >{props.children}</div>
    </MenubarContext.Provider>
  )
}

export function Menu(props: MenubarMenuProps): JSX.Element {
  const generated = `menu-${Math.random().toString(36).slice(2)}`
  const key: FocusKey = Symbol("menubar-menu")
  const items = createFocusRegistry()
  let trigger: PositionedInstance | undefined
  const value = () => props.value ?? generated
  return (
    <MenuContext.Provider value={{
      key,
      value,
      gutter: () => props.gutter ?? 8,
      shift: () => props.shift ?? -4,
      items,
      setTrigger(instance) { trigger = positioned(instance) },
      focusTrigger() { trigger?.focus() },
      position() {
        if (!trigger) return undefined
        const bounds = trigger.getBoundingClientRect()
        return { x: bounds.left, y: bounds.bottom }
      },
    }}>
      {props.children}
    </MenuContext.Provider>
  )
}

export function Trigger<T = "button">(props: PolymorphicProps<T, MenubarTriggerProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.Trigger")
  const menu = requireMenu("Menubar.Trigger")
  const expanded = () => root.value() === menu.value()
  const style = (): StyleDesc => {
    const base: StyleDesc = { ...triggerBaseStyle, minHeight: 28, paddingLeft: 8, paddingRight: 8 }
    return expanded() ? { ...base, backgroundColor: "#2a2a30" } : base
  }
  onCleanup(() => root.unregisterTrigger(menu.key))
  const openAndFocus = (edge: "first" | "last") => {
    root.setValue(menu.value())
    focusAfterMount(edge === "first" ? menu.items.focusFirst : menu.items.focusLast)
  }
  return (
    <div
      ref={(instance: PublicInstance) => {
        menu.setTrigger(instance)
        if (!props.disabled) root.registerTrigger({ key: menu.key, value: menu.value(), instance: focusable(instance) })
        props.ref?.(instance)
      }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)}
      onClick={(event: EventPayload) => { props.onClick?.(event); if (!props.disabled) root.setValue(expanded() ? null : menu.value()) }}
      onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); if (!props.disabled && root.value() != null) root.setValue(menu.value()) }}
      onKeyDown={(event: EventPayload) => {
        props.onKeyDown?.(event)
        if (props.disabled) return
        if (event.key === "up") openAndFocus("last")
        else if (isActivationKey(event.key) || event.key === "down") openAndFocus("first")
        else if (event.key === "right") root.focusNextTrigger(menu.key)
        else if (event.key === "left") root.focusPreviousTrigger(menu.key)
        else if (event.key === "escape") root.setValue(null)
      }}
      style={mergeStyle(style(), props.style)}
    >{props.children}</div>
  )
}

export function Content<T = "div">(props: PolymorphicProps<T, MenubarContentProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.Content")
  const menu = requireMenu("Menubar.Content")
  const expanded = () => root.value() === menu.value()
  return (
    <Show when={expanded()}>
      <FloatingLayer
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        position={menu.position()}
        side="bottom"
        align="start"
        sideOffset={menu.gutter()}
        alignOffset={menu.shift()}
        onMouseDownOutside={(event: EventPayload) => { props.onMouseDownOutside?.(event); root.setValue(null) }}
        onKeyDown={(event: EventPayload) => {
          props.onKeyDown?.(event)
          if (event.key === "escape") {
            root.setValue(null)
            focusAfterMount(menu.focusTrigger)
          }
        }}
        style={mergeStyle(popupBaseStyle, props.style)}
      >{props.children}</FloatingLayer>
    </Show>
  )
}

export function Item<T = "div">(props: PolymorphicProps<T, MenubarItemProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.Item")
  const menu = requireMenu("Menubar.Item")
  const sub = useContext(SubContext)
  const focusKey: FocusKey = Symbol("menubar-item")
  onCleanup(() => menu.items.unregister(focusKey))
  const activate = () => {
    if (props.disabled) return
    props.onSelect?.()
    root.setValue(null)
    focusAfterMount(menu.focusTrigger)
  }
  return (
    <div
      ref={(instance: PublicInstance) => {
        if (!props.disabled) menu.items.register(focusKey, instance)
        props.ref?.(instance)
      }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={props.disabled ? undefined : (props.tabIndex ?? -1)}
      onClick={(event: EventPayload) => { if (props.disabled) return; props.onClick?.(event); activate() }}
      onKeyDown={(event: EventPayload) => {
        if (props.disabled) return
        props.onKeyDown?.(event)
        if (isActivationKey(event.key)) activate()
        else if (event.key === "down") menu.items.focusNext(focusKey)
        else if (event.key === "up") menu.items.focusPrevious(focusKey)
        else if (event.key === "home") menu.items.focusFirst()
        else if (event.key === "end") menu.items.focusLast()
        else if (event.key === "right" && !sub) root.focusNextTrigger(menu.key)
        else if (event.key === "left") {
          if (sub) {
            sub.setOpen(false)
            focusAfterMount(sub.focusTrigger)
          } else root.focusPreviousTrigger(menu.key)
        } else if (event.key === "escape") {
          root.setValue(null)
          focusAfterMount(menu.focusTrigger)
        }
      }}
      style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, gap: 6, cursor: "pointer", opacity: props.disabled ? 0.5 : 1, pointerEvents: props.disabled ? "none" : "auto", hover: { backgroundColor: "#2a2a30" } }, props.style)}
    >{props.children}</div>
  )
}

export function Separator<T = "hr">(props: PolymorphicProps<T, MenubarSeparatorProps<T>>): JSX.Element {
  return <div class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={mergeStyle({ height: 1, marginTop: 4, marginBottom: 4, backgroundColor: "#34343a" }, props.style)} />
}

export function Sub(props: MenubarSubProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  let trigger: PositionedInstance | undefined
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => { if (props.open === undefined) setInternalOpen(next); props.onOpenChange?.(next) }
  return (
    <SubContext.Provider value={{
      open,
      setOpen,
      gutter: () => props.gutter ?? 8,
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

export function SubTrigger<T = "div">(props: PolymorphicProps<T, MenubarSubTriggerProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.SubTrigger")
  const menu = requireMenu("Menubar.SubTrigger")
  const context = useContext(SubContext)
  if (!context) throw new Error("Menubar.SubTrigger must be used inside Menubar.Sub")
  const focusKey: FocusKey = Symbol("menubar-sub-trigger")
  onCleanup(() => menu.items.unregister(focusKey))
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
      onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); if (!props.disabled) context.setOpen(true) }}
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
          root.setValue(null)
          focusAfterMount(menu.focusTrigger)
        }
      }}
      style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, cursor: "pointer", opacity: props.disabled ? 0.5 : 1, pointerEvents: props.disabled ? "none" : "auto", hover: { backgroundColor: "#2a2a30" } }, props.style)}
    >{props.children}</div>
  )
}

export function SubContent<T = "div">(props: PolymorphicProps<T, MenubarSubContentProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("Menubar.SubContent must be used inside Menubar.Sub")
  return <Show when={context.open()}><FloatingLayer class={props.class} className={props.className} classList={props.classList} testId={props.testId} position={context.position()} side="right" align="start" sideOffset={context.gutter()} style={mergeStyle(popupBaseStyle, props.style)}>{props.children}</FloatingLayer></Show>
}

export const Menubar = Object.assign(Root, { Root, Menu, Trigger, Portal, Content, Item, Separator, Sub, SubTrigger, SubContent })
export { Portal }
