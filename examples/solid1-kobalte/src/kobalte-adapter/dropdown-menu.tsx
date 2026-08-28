import type { JSX } from "solid-js"
import * as Native from "@jhomra21/gpuix-solid1/kobalte/dropdown-menu"
import type { DropdownMenuSubProps } from "@jhomra21/gpuix-solid1/kobalte/dropdown-menu"

interface SubProps extends DropdownMenuSubProps {
  overlap?: boolean | undefined
  gutter?: number | undefined
  shift?: number | undefined
}

interface VisualProps {
  children?: JSX.Element
  class?: string | undefined
}

function Sub(props: SubProps): JSX.Element {
  const { overlap: _overlap, gutter: _gutter, shift: _shift, ...rest } = props
  return <Native.Sub {...rest} />
}

function Icon(props: VisualProps): JSX.Element {
  return <div class={props.class}>{props.children}</div>
}

function Arrow(): JSX.Element {
  return <></>
}

export const DropdownMenu = Object.assign(Native.Root, {
  Root: Native.Root,
  Trigger: Native.Trigger,
  Icon,
  Portal: Native.Portal,
  Content: Native.Content,
  Item: Native.Item,
  Separator: Native.Separator,
  Group: Native.Group,
  GroupLabel: Native.GroupLabel,
  Sub,
  SubTrigger: Native.SubTrigger,
  SubContent: Native.SubContent,
  CheckboxItem: Native.CheckboxItem,
  ItemIndicator: Native.ItemIndicator,
  RadioGroup: Native.RadioGroup,
  RadioItem: Native.RadioItem,
  Arrow,
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
export const CheckboxItem = Native.CheckboxItem
export const ItemIndicator = Native.ItemIndicator
export const RadioGroup = Native.RadioGroup
export const RadioItem = Native.RadioItem
export { Sub, Icon, Arrow }
