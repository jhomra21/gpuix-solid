import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import type { PolymorphicProps } from "./polymorphic.js"
import { FloatingLayer, Portal, mergeStyle, popupBaseStyle, triggerBaseStyle, type NativeComponentProps } from "./shared.js"

export interface MenubarRootProps { children?: JSX.Element; value?: string | null; defaultValue?: string | null; onValueChange?: (value: string | null) => void }
export interface MenubarMenuProps { children?: JSX.Element; value?: string; gutter?: number; shift?: number }
export interface MenubarTriggerProps<T = "button"> extends NativeComponentProps { as?: T }
export interface MenubarContentProps<T = "div"> extends NativeComponentProps { as?: T }
export interface MenubarItemProps<T = "div"> extends NativeComponentProps { as?: T; onSelect?: () => void }
export interface MenubarSeparatorProps<T = "hr"> extends NativeComponentProps { as?: T }
export interface MenubarSubProps { children?: JSX.Element; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; gutter?: number }
export interface MenubarSubTriggerProps<T = "div"> extends NativeComponentProps { as?: T }
export interface MenubarSubContentProps<T = "div"> extends NativeComponentProps { as?: T }

type MenubarContextValue = { value: () => string | null | undefined; setValue: (value: string | null) => void }
const MenubarContext = createContext<MenubarContextValue>()
type MenuContextValue = { value: () => string; gutter: () => number; shift: () => number }
const MenuContext = createContext<MenuContextValue>()
type SubContextValue = { open: () => boolean; setOpen: (open: boolean) => void; gutter: () => number }
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

export function Root(props: MenubarRootProps): JSX.Element {
  const [internalValue, setInternalValue] = createSignal<string | null | undefined>(props.defaultValue)
  const value = () => props.value ?? internalValue()
  const setValue = (next: string | null) => { if (props.value === undefined) setInternalValue(next); props.onValueChange?.(next) }
  return <MenubarContext.Provider value={{ value, setValue }}><div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }}>{props.children}</div></MenubarContext.Provider>
}

export function Menu(props: MenubarMenuProps): JSX.Element {
  const generated = `menu-${Math.random().toString(36).slice(2)}`
  const value = () => props.value ?? generated
  return <MenuContext.Provider value={{ value, gutter: () => props.gutter ?? 8, shift: () => props.shift ?? -4 }}>{props.children}</MenuContext.Provider>
}

export function Trigger<T = "button">(props: PolymorphicProps<T, MenubarTriggerProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.Trigger")
  const menu = requireMenu("Menubar.Trigger")
  const expanded = () => root.value() === menu.value()
  return <div testId={props.testId} tabIndex={props.tabIndex ?? 0} onClick={(event) => { props.onClick?.(event); if (!props.disabled) root.setValue(expanded() ? null : menu.value()) }} onMouseEnter={(event) => { props.onMouseEnter?.(event); if (root.value() != null) root.setValue(menu.value()) }} style={mergeStyle({ ...triggerBaseStyle, minHeight: 28, paddingLeft: 8, paddingRight: 8, backgroundColor: expanded() ? "#2a2a30" : undefined }, props.style)}>{props.children}</div>
}

export function Content<T = "div">(props: PolymorphicProps<T, MenubarContentProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.Content")
  const menu = requireMenu("Menubar.Content")
  const expanded = () => root.value() === menu.value()
  return <Show when={expanded()}><FloatingLayer testId={props.testId} side="bottom" align="start" sideOffset={menu.gutter()} alignOffset={menu.shift()} onMouseDownOutside={(event) => { props.onMouseDownOutside?.(event); root.setValue(null) }} onKeyDown={(event) => { props.onKeyDown?.(event); if (event.key === "escape") root.setValue(null) }} style={mergeStyle(popupBaseStyle, props.style)}>{props.children}</FloatingLayer></Show>
}

export function Item<T = "div">(props: PolymorphicProps<T, MenubarItemProps<T>>): JSX.Element {
  const root = requireRoot("Menubar.Item")
  return <div testId={props.testId} tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)} onClick={(event) => { if (props.disabled) return; props.onClick?.(event); props.onSelect?.(); root.setValue(null) }} style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, gap: 6, cursor: "pointer", opacity: props.disabled ? 0.5 : 1, hover: { backgroundColor: "#2a2a30" } }, props.style)}>{props.children}</div>
}

export function Separator<T = "hr">(props: PolymorphicProps<T, MenubarSeparatorProps<T>>): JSX.Element { return <div testId={props.testId} style={mergeStyle({ height: 1, marginTop: 4, marginBottom: 4, backgroundColor: "#34343a" }, props.style)} /> }

export function Sub(props: MenubarSubProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => { if (props.open === undefined) setInternalOpen(next); props.onOpenChange?.(next) }
  return <SubContext.Provider value={{ open, setOpen, gutter: () => props.gutter ?? 8 }}>{props.children}</SubContext.Provider>
}

export function SubTrigger<T = "div">(props: PolymorphicProps<T, MenubarSubTriggerProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("Menubar.SubTrigger must be used inside Menubar.Sub")
  return <div testId={props.testId} tabIndex={props.tabIndex ?? 0} onMouseEnter={(event) => { props.onMouseEnter?.(event); context.setOpen(true) }} onClick={(event) => { props.onClick?.(event); context.setOpen(!context.open()) }} style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, cursor: "pointer", hover: { backgroundColor: "#2a2a30" } }, props.style)}>{props.children}</div>
}

export function SubContent<T = "div">(props: PolymorphicProps<T, MenubarSubContentProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("Menubar.SubContent must be used inside Menubar.Sub")
  return <Show when={context.open()}><FloatingLayer testId={props.testId} side="right" align="start" sideOffset={context.gutter()} style={mergeStyle(popupBaseStyle, props.style)}>{props.children}</FloatingLayer></Show>
}

export const Menubar = Object.assign(Root, { Root, Menu, Trigger, Portal, Content, Item, Separator, Sub, SubTrigger, SubContent })
