import { createContext, createSignal, Show, splitProps, useContext, type JSX } from "solid-js"
import * as Native from "@jhomra21/gpuix-solid1/kobalte/context-menu"
import type { ContextMenuSubProps } from "@jhomra21/gpuix-solid1/kobalte/context-menu"

interface SubProps extends ContextMenuSubProps {
  overlap?: boolean | undefined
  gutter?: number | undefined
  shift?: number | undefined
}

interface SelectableProps {
  children?: JSX.Element
  class?: string | undefined
  disabled?: boolean | undefined
  checked?: boolean | undefined
  defaultChecked?: boolean | undefined
  onChange?: ((checked: boolean) => void) | undefined
}

interface RadioGroupProps {
  children?: JSX.Element
  value?: string | undefined
  defaultValue?: string | undefined
  onChange?: ((value: string) => void) | undefined
}

interface RadioItemProps {
  children?: JSX.Element
  class?: string | undefined
  disabled?: boolean | undefined
  value: string
}

interface IndicatorProps {
  children?: JSX.Element
  class?: string | undefined
}

const IndicatorContext = createContext<() => boolean>(() => false)
const RadioContext = createContext<{ value: () => string | undefined; setValue: (value: string) => void }>()

function Sub(props: SubProps): JSX.Element {
  const [, rest] = splitProps(props, ["overlap", "gutter", "shift"])
  return <Native.Sub {...rest} />
}

function CheckboxItem(props: SelectableProps): JSX.Element {
  const [internal, setInternal] = createSignal(props.defaultChecked ?? false)
  const checked = () => props.checked ?? internal()
  const select = () => {
    if (props.disabled) return
    const next = !checked()
    if (props.checked === undefined) setInternal(next)
    props.onChange?.(next)
  }
  return <IndicatorContext.Provider value={checked}><div class={props.class} onClick={select}>{props.children}</div></IndicatorContext.Provider>
}

function ItemIndicator(props: IndicatorProps): JSX.Element {
  const selected = useContext(IndicatorContext)
  return <Show when={selected()}><div class={props.class}>{props.children}</div></Show>
}

function RadioGroup(props: RadioGroupProps): JSX.Element {
  const [internal, setInternal] = createSignal(props.defaultValue)
  const value = () => props.value ?? internal()
  const setValue = (next: string) => {
    if (props.value === undefined) setInternal(next)
    props.onChange?.(next)
  }
  return <RadioContext.Provider value={{ value, setValue }}>{props.children}</RadioContext.Provider>
}

function RadioItem(props: RadioItemProps): JSX.Element {
  const radio = useContext(RadioContext)
  if (!radio) throw new Error("ContextMenu.RadioItem must be used inside ContextMenu.RadioGroup")
  const selected = () => radio.value() === props.value
  return <IndicatorContext.Provider value={selected}><div class={props.class} onClick={() => { if (!props.disabled) radio.setValue(props.value) }}>{props.children}</div></IndicatorContext.Provider>
}

export const ContextMenu = Object.assign(Native.Root, {
  Root: Native.Root,
  Trigger: Native.Trigger,
  Portal: Native.Portal,
  Content: Native.Content,
  Item: Native.Item,
  Separator: Native.Separator,
  Group: Native.Group,
  GroupLabel: Native.GroupLabel,
  Sub,
  SubTrigger: Native.SubTrigger,
  SubContent: Native.SubContent,
  CheckboxItem,
  ItemIndicator,
  RadioGroup,
  RadioItem,
})

export const Root = Native.Root
export const Trigger = Native.Trigger
export const Portal = Native.Portal
export const Content = Native.Content
export const Item = Native.Item
export const Separator = Native.Separator
export const Group = Native.Group
export const GroupLabel = Native.GroupLabel
export const SubTrigger = Native.SubTrigger
export const SubContent = Native.SubContent
export { Sub, CheckboxItem, ItemIndicator, RadioGroup, RadioItem }
