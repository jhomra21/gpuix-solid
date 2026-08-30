import { createContext, createSignal, onCleanup, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { PublicInstance, StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import {
  FloatingLayer,
  Portal,
  createFocusRegistry,
  hasNativeClassStyle,
  mergeStyle,
  popupBaseStyle,
  triggerBaseStyle,
  type FocusKey,
  type FocusRegistry,
  type FocusableInstance,
  type NativeComponentProps,
} from "./shared.jsx"

export interface DropdownMenuRootProps {
  children?: JSX.Element
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  gutter?: number
}
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

type TriggerInstance = FocusableInstance & {
  getBoundingClientRect: () => {
    left: number
    top: number
    right: number
    bottom: number
  }
}

type MenuContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  gutter: () => number
  items: FocusRegistry
  setTrigger: (instance: PublicInstance) => void
  focusTrigger: () => void
  isTriggerEvent: (event: EventPayload) => boolean
}
const MenuContext = createContext<MenuContextValue>()
type SubContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  setTrigger: (instance: PublicInstance) => void
  focusTrigger: () => void
}
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

function classAwareFallback(
  props: Pick<NativeComponentProps, "class" | "className" | "classList" | "style">,
  fallback: StyleDesc,
  structural: StyleDesc = {},
): StyleDesc {
  const base = hasNativeClassStyle(props) ? structural : { ...fallback, ...structural }
  return mergeStyle(base, props.style)
}

function disabledState(disabled: boolean | undefined): StyleDesc {
  return disabled
    ? { opacity: 0.5, pointerEvents: "none" }
    : { opacity: 1, pointerEvents: "auto" }
}

function isActivationKey(key: string | undefined): boolean {
  return key === "enter" || key === "space"
}

function focusable(instance: PublicInstance): FocusableInstance {
  // SAFETY: Solid host refs are HostElementNode instances, and HostElementNode implements focus().
  return instance as FocusableInstance
}

function triggerInstance(instance: PublicInstance): TriggerInstance {
  // SAFETY: Solid host refs are HostElementNode instances, whose DOM-compat contract implements focus() and getBoundingClientRect().
  return instance as TriggerInstance
}

function focusAfterMount(action: () => void): void {
  queueMicrotask(action)
}

function withHoveredStyle(base: StyleDesc, style: StyleDesc | undefined, hovered: boolean): StyleDesc {
  const merged = mergeStyle(base, style)
  return hovered && style?.hover ? mergeStyle(merged, style.hover) : merged
}

export function Root(props: DropdownMenuRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const items = createFocusRegistry()
  let trigger: TriggerInstance | undefined
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next)
  }
  return (
    <MenuContext.Provider value={{
      open,
      setOpen,
      gutter: () => props.gutter ?? 4,
      items,
      setTrigger(instance) { trigger = triggerInstance(instance) },
      focusTrigger() { trigger?.focus() },
      isTriggerEvent(event) {
        const x = event.x
        const y = event.y
        if (x === undefined || y === undefined || !trigger) return false
        const bounds = trigger.getBoundingClientRect()
        return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom
      },
    }}>
      {props.children}
    </MenuContext.Provider>
  )
}

export function Trigger<T = "button">(props: PolymorphicProps<T, DropdownMenuTriggerProps<T>>): JSX.Element {
  const context = requireMenu("DropdownMenu.Trigger")
  const openAndFocus = (edge: "first" | "last") => {
    context.setOpen(true)
    focusAfterMount(edge === "first" ? context.items.focusFirst : context.items.focusLast)
  }
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <div
        ref={(instance: PublicInstance) => { context.setTrigger(instance); props.ref?.(instance) }}
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)}
        onClick={(event: EventPayload) => {
          props.onClick?.(event)
          if (!props.disabled) context.setOpen(!context.open())
        }}
        onKeyDown={(event: EventPayload) => {
          props.onKeyDown?.(event)
          if (props.disabled) return
          if (event.key === "up") openAndFocus("last")
          else if (isActivationKey(event.key) || event.key === "down") openAndFocus("first")
          else if (event.key === "escape") context.setOpen(false)
        }}
        style={mergeStyle({ ...triggerBaseStyle, ...disabledState(props.disabled) }, props.style)}
      >{props.children}</div>
    </div>
  )
}

export function Content<T = "div">(props: PolymorphicProps<T, DropdownMenuContentProps<T>>): JSX.Element {
  const context = requireMenu("DropdownMenu.Content")
  return (
    <Show when={context.open()}>
      <FloatingLayer
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        side="bottom"
        align="start"
        sideOffset={props.gutter ?? context.gutter()}
        onMouseDownOutside={(event: EventPayload) => {
          props.onMouseDownOutside?.(event)
          if (!context.isTriggerEvent(event)) context.setOpen(false)
        }}
        onKeyDown={(event: EventPayload) => {
          props.onKeyDown?.(event)
          if (event.key === "escape") {
            context.setOpen(false)
            focusAfterMount(context.focusTrigger)
          }
        }}
        style={classAwareFallback(props, popupBaseStyle)}
      >{props.children}</FloatingLayer>
    </Show>
  )
}

export function Item<T = "div">(props: PolymorphicProps<T, DropdownMenuItemProps<T>>): JSX.Element {
  const context = requireMenu("DropdownMenu.Item")
  const sub = useContext(SubContext)
  const [hovered, setHovered] = createSignal(false)
  const focusKey: FocusKey = Symbol("dropdown-item")
  onCleanup(() => context.items.unregister(focusKey))
  const fallback: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 26,
    paddingLeft: 8,
    paddingRight: 8,
    gap: 6,
    cursor: "pointer",
    hover: { backgroundColor: "#2a2a30" },
  }
  const activate = () => {
    if (props.disabled) return
    props.onSelect?.()
    if (props.closeOnSelect !== false) {
      context.setOpen(false)
      focusAfterMount(context.focusTrigger)
    }
  }
  const style = () => {
    const base = classAwareFallback(props, fallback, disabledState(props.disabled))
    return hovered() && props.style?.hover ? mergeStyle(base, props.style.hover) : base
  }
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
      onMouseEnter={(event: EventPayload) => { props.onMouseEnter?.(event); if (!props.disabled) setHovered(true) }}
      onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); setHovered(false) }}
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

export function Separator<T = "hr">(props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>): JSX.Element {
  return <div class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={classAwareFallback(props, { height: 1, marginTop: 4, marginBottom: 4, backgroundColor: "#34343a" })} />
}

export function Group(props: DropdownMenuGroupProps): JSX.Element { return <>{props.children}</> }

export function GroupLabel<T = "span">(props: PolymorphicProps<T, DropdownMenuGroupLabelProps<T>>): JSX.Element {
  return <text class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={classAwareFallback(props, { fontSize: 11, lineHeight: 16, fontWeight: 700, color: "#a1a1aa", paddingLeft: 8, paddingRight: 8 })}>{props.children}</text>
}

export function Sub(props: DropdownMenuSubProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  let trigger: FocusableInstance | undefined
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next)
  }
  return (
    <SubContext.Provider value={{
      open,
      setOpen,
      setTrigger(instance) { trigger = focusable(instance) },
      focusTrigger() { trigger?.focus() },
    }}>
      {props.children}
    </SubContext.Provider>
  )
}

export function SubTrigger<T = "div">(props: PolymorphicProps<T, DropdownMenuSubTriggerProps<T>>): JSX.Element {
  const menu = requireMenu("DropdownMenu.SubTrigger")
  const context = useContext(SubContext)
  if (!context) throw new Error("DropdownMenu.SubTrigger must be used inside DropdownMenu.Sub")
  const [hovered, setHovered] = createSignal(false)
  const focusKey: FocusKey = Symbol("dropdown-sub-trigger")
  onCleanup(() => menu.items.unregister(focusKey))
  const fallback: StyleDesc = { display: "flex", flexDirection: "row", alignItems: "center", minHeight: 26, paddingLeft: 8, paddingRight: 8, cursor: "pointer", hover: { backgroundColor: "#2a2a30" } }
  const style = () => {
    const base = classAwareFallback(props, fallback, disabledState(props.disabled))
    return hovered() && props.style?.hover ? mergeStyle(base, props.style.hover) : base
  }
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
        setHovered(true)
        context.setOpen(true)
      }}
      onMouseLeave={(event: EventPayload) => { props.onMouseLeave?.(event); setHovered(false) }}
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

export function SubContent<T = "div">(props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>): JSX.Element {
  const context = useContext(SubContext)
  if (!context) throw new Error("DropdownMenu.SubContent must be used inside DropdownMenu.Sub")
  return <Show when={context.open()}><FloatingLayer class={props.class} className={props.className} classList={props.classList} testId={props.testId} side="right" align="start" sideOffset={4} style={classAwareFallback(props, popupBaseStyle)}>{props.children}</FloatingLayer></Show>
}

export function CheckboxItem<T = "div">(props: PolymorphicProps<T, DropdownMenuCheckboxItemProps<T>>): JSX.Element {
  const [internalChecked, setInternalChecked] = createSignal(props.defaultChecked ?? false)
  const checked = () => props.checked ?? internalChecked()
  const setChecked = (next: boolean) => {
    if (props.checked === undefined) setInternalChecked(next)
    props.onChange?.(next)
  }
  const { checked: _checked, defaultChecked: _defaultChecked, onChange: _onChange, ...itemProps } = props
  return (
    <IndicatorContext.Provider value={{ selected: checked }}>
      <Item {...itemProps} closeOnSelect={false} onSelect={() => { setChecked(!checked()); props.onSelect?.() }}>{props.children}</Item>
    </IndicatorContext.Provider>
  )
}

export function ItemIndicator(props: DropdownMenuItemIndicatorProps): JSX.Element {
  const context = useContext(IndicatorContext)
  return <Show when={context?.selected()}><div class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={props.style}>{props.children}</div></Show>
}

export function RadioGroup(props: DropdownMenuRadioGroupProps): JSX.Element {
  const [internalValue, setInternalValue] = createSignal(props.defaultValue)
  const value = () => props.value ?? internalValue()
  const setValue = (next: string) => {
    if (props.value === undefined) setInternalValue(next)
    props.onChange?.(next)
  }
  return <RadioContext.Provider value={{ value, setValue }}>{props.children}</RadioContext.Provider>
}

export function RadioItem<T = "div">(props: PolymorphicProps<T, DropdownMenuRadioItemProps<T>>): JSX.Element {
  const radio = useContext(RadioContext)
  if (!radio) throw new Error("DropdownMenu.RadioItem must be used inside DropdownMenu.RadioGroup")
  const selected = () => radio.value() === props.value
  return (
    <IndicatorContext.Provider value={{ selected }}>
      <Item {...props} closeOnSelect={false} onSelect={() => { radio.setValue(props.value); props.onSelect?.() }}>{props.children}</Item>
    </IndicatorContext.Provider>
  )
}

export const DropdownMenu = Object.assign(Root, {
  Root,
  Trigger,
  Portal,
  Content,
  Item,
  Separator,
  Group,
  GroupLabel,
  Sub,
  SubTrigger,
  SubContent,
  CheckboxItem,
  ItemIndicator,
  RadioGroup,
  RadioItem,
})
export { Portal }
