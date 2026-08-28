import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import * as Native from "@jhomra21/gpuix-solid1/kobalte/menubar"
import type { MenubarSubProps } from "@jhomra21/gpuix-solid1/kobalte/menubar"

interface SubProps extends MenubarSubProps {
  overlap?: boolean | undefined
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

interface GroupProps { children?: JSX.Element }
interface LabelProps { children?: JSX.Element; class?: string | undefined }
interface IndicatorProps { children?: JSX.Element; class?: string | undefined }
interface RadioGroupProps { children?: JSX.Element; value?: string | undefined; defaultValue?: string | undefined; onChange?: ((value: string) => void) | undefined }
interface RadioItemProps { children?: JSX.Element; class?: string | undefined; disabled?: boolean | undefined; value: string }

const IndicatorContext = createContext<() => boolean>(() => false)
const RadioContext = createContext<{ value: () => string | undefined; setValue: (value: string) => void }>()

function Sub(props: SubProps): JSX.Element {
  const { overlap: _overlap, shift: _shift, ...rest } = props
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

function Group(props: GroupProps): JSX.Element { return <>{props.children}</> }
function GroupLabel(props: LabelProps): JSX.Element { return <text class={props.class}>{props.children}</text> }

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
  if (!radio) throw new Error("Menubar.RadioItem must be used inside Menubar.RadioGroup")
  const selected = () => radio.value() === props.value
  return <IndicatorContext.Provider value={selected}><div class={props.class} onClick={() => { if (!props.disabled) radio.setValue(props.value) }}>{props.children}</div></IndicatorContext.Provider>
}

export const Menubar = Object.assign(Native.Root, {
  Root: Native.Root,
  Menu: Native.Menu,
  Trigger: Native.Trigger,
  Portal: Native.Portal,
  Content: Native.Content,
  Item: Native.Item,
  Separator: Native.Separator,
  Sub,
  SubTrigger: Native.SubTrigger,
  SubContent: Native.SubContent,
  CheckboxItem,
  ItemIndicator,
  Group,
  GroupLabel,
  RadioGroup,
  RadioItem,
})

export const Root = Native.Root
export const Menu = Native.Menu
export const Trigger = Native.Trigger
export const Portal = Native.Portal
export const Content = Native.Content
export const Item = Native.Item
export const Separator = Native.Separator
export const SubTrigger = Native.SubTrigger
export const SubContent = Native.SubContent
export { Sub, CheckboxItem, ItemIndicator, Group, GroupLabel, RadioGroup, RadioItem }
