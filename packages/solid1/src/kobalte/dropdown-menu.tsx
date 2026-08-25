import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { PolymorphicProps } from "./polymorphic.js"
import { FloatingLayer, Portal, mergeStyle, popupBaseStyle, triggerBaseStyle, type NativeComponentProps } from "./shared.js"

export interface DropdownMenuRootProps { children?: JSX.Element; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; gutter?: number }
export interface DropdownMenuTriggerProps<T = "button"> extends NativeComponentProps { as?: T }
export interface DropdownMenuContentProps<T = "div"> extends NativeComponentProps { as?: T; gutter?: number }
export interface DropdownMenuItemProps<T = "div"> extends NativeComponentProps { as?: T; onSelect?: () => void; closeOnSelect?: boolean }
export interface DropdownMenuSeparatorProps<T = "hr"> extends NativeComponentProps { as?: T }
export interface DropdownMenuSubProps { children?: JSX.Element; open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }
export interface DropdownMenuSubTriggerProps<T = "div"> extends NativeComponentProps { as?: T }
export interface DropdownMenuSubContentProps<T = "div"> extends NativeComponentProps { as?: T }
export type DropdownMenuCheckboxItemProps<T = "div"> = Omit<DropdownMenuItemProps<T>, "onChange"> & { checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void }
export interface DropdownMenuGroupProps { children?: JSX.Element }
export interface DropdownMenuGroupLabelProps<T = "span"> extends NativeComponentProps { as?: T }
export interface DropdownMenuRadioGroupProps { children?: JSX.Element; value?: string; defaultValue?: string; onChange?: (value: string) => void }
export interface DropdownMenuRadioItemProps<T = "div"> extends DropdownMenuItemProps<T> { value: string }
export interface DropdownMenuItemIndicatorProps extends NativeComponentProps {}

type MenuContextValue = { open: () => boolean; setOpen: (open: boolean) => void; gutter: () => number }
const MenuContext = createContext<MenuContextValue>()
type SubContextValue = { open: () => boolean; setOpen: (open: boolean) => void }
const SubContext = createContext<SubContextValue>()
type RadioContextValue = { value: () => string | undefined; setValue: (value: string) => void }
const RadioContext = createContext<RadioContextValue>()
type IndicatorContextValue = { selected: () => boolean }
const IndicatorContext = createContext<IndicatorContextValue>()

function requireMenu(name: string): MenuContextValue {
  const context = useContext(MenuContext)
  if (!context) throw new Error(`${name} must be used inside DropdownMenu.Root`)
  return context
}

export function Root(props: DropdownMenuRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => { if (props.open === undefined) setInternalOpen(next); props.onOpenChange?.(next) }
  return <MenuContext.Provider value={{ open, setOpen, gutter: () => props.gutter ?? 4 }}>{props.children}</MenuContext.Provider>
}

export function Trigger<T = "button">(props: PolymorphicProps<T, DropdownMenuTriggerProps<T>>): JSX.Element {
  const context = requireMenu("DropdownMenu.Trigger")
  return <div testId={props.testId} tabIndex={props.tabIndex ?? 0} onClick={(event: EventPayload) => { props.onClick?.(event); if (!props.disabled) context.setOpen(!context.open()) }} style={mergeStyle(triggerBaseStyle, props.style)}>{props.children}</div>
}

export function Content<T = "div">(props: PolymorphicProps<T, DropdownMenuContentProps<T>>): JSX.Element {
  const context = requireMenu("DropdownMenu.Content")
  return <Show when={context.open()}><FloatingLayer testId={props.testId} side="bottom" align="start" sideOffset={props.gutter ?? context.gutter()} onMouseDownOutside={(event: EventPayload) => { props.onMouseDownOutside?.(event); context.setOpen(false) }} onKeyDown={(event: EventPayload) => { props.onKeyDown?.(event); if (event.key === "escape") context.setOpen(false) }} style={mergeStyle(popupBaseStyle, props.style)}>{props.children}</FloatingLayer></Show>
}

export function Item<T = "div">(props: PolymorphicProps<T, DropdownMenuItemProps<T>>): JSX.Element {
  const context = requireMenu("DropdownMenu.Item")
  return <div testId={props.testId} tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)} onClick={(event: EventPayload) => { if (props.disabled) return; props.onClick?.(event); props.onSelect?.(); if (props.closeOnSelect !== false) context.setOpen(false) }} style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, gap: 6, cursor: "pointer", opacity: props.disabled ? 0.5 : 1, hover: { backgroundColor: "#2a2a30" } }, props.style)}>{props.children}</div>
}

export function Separator<T = "hr">(props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>): JSX.Element {
  return <div testId={props.testId} style={mergeStyle({ height: 1, marginTop: 4, marginBottom: 4, backgroundColor: "#34343a" }, props.style)} />
}

export function Group(props: DropdownMenuGroupProps): JSX.Element { return <>{props.children}</> }
export function GroupLabel<T = "span">(props: PolymorphicProps<T, DropdownMenuGroupLabelProps<T>>): JSX.Element { return <text testId={props.testId} style={mergeStyle({ fontSize: 11, lineHeight: 16, fontWeight: 700, color: "#a1a1aa", paddingLeft: 8, paddingRight: 8 }, props.style)}>{props.children}</text> }

export function Sub(props: DropdownMenuSubProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => { if (props.open === undefined) setInternalOpen(next); props.onOpenChange?.(next) }
  return <SubContext.Provider value={{ open, setOpen }}>{props.children}</SubContext.Provider>
}

export function SubTrigger<T = "div">(props: PolymorphicProps<T, DropdownMenuSubTriggerProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("DropdownMenu.SubTrigger must be used inside DropdownMenu.Sub")
  return <div testId={props.testId} tabIndex={props.tabIndex ?? 0} onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); context.setOpen(true) }} onClick={(event: EventPayload) => { props.onClick?.(event); context.setOpen(!context.open()) }} style={mergeStyle({ display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, cursor: "pointer", hover: { backgroundColor: "#2a2a30" } }, props.style)}>{props.children}</div>
}

export function SubContent<T = "div">(props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("DropdownMenu.SubContent must be used inside DropdownMenu.Sub")
  return <Show when={context.open()}><FloatingLayer testId={props.testId} side="right" align="start" sideOffset={4} style={mergeStyle(popupBaseStyle, props.style)}>{props.children}</FloatingLayer></Show>
}

export function CheckboxItem<T = "div">(props: PolymorphicProps<T, DropdownMenuCheckboxItemProps<T>>): JSX.Element {
  const [internalChecked, setInternalChecked] = createSignal(props.defaultChecked ?? false)
  const checked = () => props.checked ?? internalChecked()
  const setChecked = (next: boolean) => { if (props.checked === undefined) setInternalChecked(next); props.onChange?.(next) }
  const { checked: _checked, defaultChecked: _defaultChecked, onChange: _onChange, ...itemProps } = props
  return <IndicatorContext.Provider value={{ selected: checked }}><Item {...itemProps} closeOnSelect={false} onSelect={() => { setChecked(!checked()); props.onSelect?.() }}>{props.children}</Item></IndicatorContext.Provider>
}

export function ItemIndicator(props: DropdownMenuItemIndicatorProps): JSX.Element {
  const context = useContext(IndicatorContext)
  return <Show when={context?.selected()}><div testId={props.testId} style={props.style}>{props.children}</div></Show>
}

export function RadioGroup(props: DropdownMenuRadioGroupProps): JSX.Element {
  const [internalValue, setInternalValue] = createSignal(props.defaultValue)
  const value = () => props.value ?? internalValue()
  const setValue = (next: string) => { if (props.value === undefined) setInternalValue(next); props.onChange?.(next) }
  return <RadioContext.Provider value={{ value, setValue }}>{props.children}</RadioContext.Provider>
}

export function RadioItem<T = "div">(props: PolymorphicProps<T, DropdownMenuRadioItemProps<T>>): JSX.Element {
  const radio = useContext(RadioContext)
  if (!radio) throw new Error("DropdownMenu.RadioItem must be used inside DropdownMenu.RadioGroup")
  const selected = () => radio.value() === props.value
  return <IndicatorContext.Provider value={{ selected }}><Item {...props} closeOnSelect={false} onSelect={() => { radio.setValue(props.value); props.onSelect?.() }}>{props.children}</Item></IndicatorContext.Provider>
}

export const DropdownMenu = Object.assign(Root, { Root, Trigger, Portal, Content, Item, Separator, Group, GroupLabel, Sub, SubTrigger, SubContent, CheckboxItem, ItemIndicator, RadioGroup, RadioItem })
export { Portal }
