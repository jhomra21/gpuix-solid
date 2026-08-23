import {
  For,
  Show,
  children as resolveChildren,
  createComponent,
  createContext,
  createMemo,
  createSignal,
  merge,
  omit,
  onCleanup,
  useContext,
  type Accessor,
  type Element as SolidElement,
} from "solid-js"
import { useGpuixRequired } from "../context.js"
import type { HostProps, InputProps, PublicInstance } from "../host/types.js"
import {
  FloatingLayer,
  composeHandlers,
  composeRefs,
  createControllableState,
  floatingRootStyle,
  isRenderFunction,
  renderDiv,
  renderInput,
  renderSlot,
  resolveStyle,
  type FloatingContentProps,
  type SlotRenderer,
  type StateStyle,
} from "./floating.js"

export type ComboboxValue = string | string[] | null

interface DisabledItemRecord {
  token: symbol
  value: Accessor<string>
  disabled: Accessor<boolean>
}

interface MutableBox<Value> {
  value: Value
}

interface ComboboxContextValue {
  open: Accessor<boolean>
  disabled: Accessor<boolean>
  multiple: Accessor<boolean>
  value: Accessor<ComboboxValue>
  inputValue: Accessor<string>
  filteredItems: Accessor<readonly string[]>
  activeIndex: Accessor<number | null>
  inputRef: MutableBox<PublicInstance | undefined>
  itemToString(item: string): string
  setOpen(open: boolean): void
  setInputValue(value: string): void
  setActiveIndex(index: number | null): void
  moveActive(delta: number): void
  selectItem(item: string): void
  registerItem(item: DisabledItemRecord): void
  unregisterItem(token: symbol): void
}

const ComboboxContext = createContext<ComboboxContextValue>()

function useComboboxContext(name: string): ComboboxContextValue {
  try {
    return useContext(ComboboxContext)
  } catch {
    throw new Error(`${name} must be used inside Combobox`)
  }
}

function defaultFilter(
  items: readonly string[],
  query: string,
  itemToString: (item: string) => string,
): string[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return [...items]
  const matches: Array<{ item: string; rank: number; index: number }> = []
  items.forEach((item, index) => {
    const label = itemToString(item).toLowerCase()
    const rank = label.startsWith(normalized) ? 0 : label.includes(normalized) ? 1 : null
    if (rank !== null) matches.push({ item, rank, index })
  })
  return matches
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((match) => match.item)
}

export interface ComboboxProps extends Omit<HostProps, "children" | "onChange"> {
  children?: SolidElement
  items?: readonly string[]
  value?: ComboboxValue
  defaultValue?: ComboboxValue
  onValueChange?: (value: ComboboxValue) => void
  inputValue?: string
  defaultInputValue?: string
  onInputValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  multiple?: boolean
  disabled?: boolean
  autoHighlight?: boolean | "always"
  filter?: null | ((item: string, query: string, itemToString: (item: string) => string) => boolean)
  itemToStringValue?: (item: string) => string
}

export function Combobox(props: ComboboxProps): SolidElement {
  const renderer = useGpuixRequired()
  const [value, setValue] = createControllableState<ComboboxValue>(
    () => props.value,
    props.defaultValue ?? null,
    () => props.onValueChange,
  )
  const [inputValue, setInputValueState] = createControllableState(
    () => props.inputValue,
    props.defaultInputValue ?? "",
    () => props.onInputValueChange,
  )
  const [open, setOpenState] = createControllableState(
    () => props.open,
    props.defaultOpen ?? false,
    () => props.onOpenChange,
  )
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null)
  const itemRecords: DisabledItemRecord[] = []
  const inputRef: MutableBox<PublicInstance | undefined> = { value: undefined }
  const itemToString = (item: string): string => {
    const stringify = props.itemToStringValue
    return stringify ? stringify(item) : item
  }

  const filterItems = (query: string): string[] => {
    const items = props.items ?? []
    const filter = props.filter
    if (filter === null) return [...items]
    if (filter) return items.filter((item) => filter(item, query, itemToString))
    return defaultFilter(items, query, itemToString)
  }
  const filteredItems = createMemo(() => filterItems(inputValue()))
  const isDisabledItem = (item: string): boolean =>
    itemRecords.some((record) => record.value() === item && record.disabled())

  const registerItem = (item: DisabledItemRecord): void => {
    const index = itemRecords.findIndex((record) => record.token === item.token)
    if (index < 0) itemRecords.push(item)
    else itemRecords[index] = item
  }
  const unregisterItem = (token: symbol): void => {
    const index = itemRecords.findIndex((record) => record.token === token)
    if (index >= 0) itemRecords.splice(index, 1)
  }
  const setOpen = (nextOpen: boolean): void => {
    setOpenState(nextOpen)
    if (nextOpen) {
      queueMicrotask(() => {
        const input = inputRef.value
        if (input) renderer.focusElement?.(input.id)
      })
    }
  }
  const updateInputValue = (nextValue: string): void => {
    setInputValueState(nextValue)
    const nextItems = filterItems(nextValue)
    const firstEnabled = nextItems.findIndex((item) => !isDisabledItem(item))
    setActiveIndex(props.autoHighlight && firstEnabled >= 0 ? firstEnabled : null)
  }
  const moveActive = (delta: number): void => {
    const items = filteredItems()
    if (items.length === 0) return
    const current = activeIndex()
    let nextIndex = current === null ? (delta > 0 ? -1 : 0) : current
    for (let checked = 0; checked < items.length; checked += 1) {
      nextIndex = (nextIndex + delta + items.length) % items.length
      const item = items[nextIndex]
      if (item !== undefined && !isDisabledItem(item)) {
        setActiveIndex(nextIndex)
        return
      }
    }
  }
  const selectItem = (item: string): void => {
    if ((props.disabled ?? false) || isDisabledItem(item)) return
    if (props.multiple ?? false) {
      const current = value()
      const selected = Array.isArray(current) ? current : []
      const exists = selected.includes(item)
      setValue(exists ? selected.filter((candidate) => candidate !== item) : [...selected, item])
      setInputValueState("")
      setActiveIndex(null)
      return
    }
    setValue(item)
    setInputValueState(itemToString(item))
    setOpen(false)
    setActiveIndex(null)
  }

  const context: ComboboxContextValue = {
    open,
    disabled: () => props.disabled ?? false,
    multiple: () => props.multiple ?? false,
    value,
    inputValue,
    filteredItems,
    activeIndex,
    inputRef,
    itemToString,
    setOpen,
    setInputValue: updateInputValue,
    setActiveIndex,
    moveActive,
    selectItem,
    registerItem,
    unregisterItem,
  }

  return createComponent(ComboboxContext, {
    value: context,
    get children() {
      return renderDiv(props, () => floatingRootStyle(props.style))
    },
  })
}

export interface ComboboxInputProps extends InputProps {
  disabled?: boolean
}

export function ComboboxInput(props: ComboboxInputProps): SolidElement {
  const context = useComboboxContext("ComboboxInput")
  const disabled = (): boolean => props.disabled ?? context.disabled()
  const ref = composeRefs(
    (instance) => {
      context.inputRef.value = instance
    },
    props.ref,
  )
  const host = omit(props, "disabled")
  const merged = merge(host, {
    get ref() {
      return ref
    },
    get value() {
      return context.inputValue()
    },
    get readOnly() {
      return disabled() || props.readOnly
    },
    get autoFocus() {
      return context.open()
    },
    get onClick() {
      return composeHandlers(props.onClick, () => {
        if (!disabled()) context.setOpen(true)
      })
    },
    get onFocus() {
      return composeHandlers(props.onFocus, () => {
        if (!disabled()) context.setOpen(true)
      })
    },
    get onChange() {
      return composeHandlers(props.onChange, (event) => {
        context.setInputValue(event.value ?? "")
        if (!disabled()) context.setOpen(true)
      })
    },
    get onKeyDown() {
      return composeHandlers(props.onKeyDown, (event) => {
        if (disabled()) return
        if (event.key === "escape") {
          context.setOpen(false)
        } else if (event.key === "down" || (event.key === "n" && event.modifiers?.ctrl)) {
          context.moveActive(1)
        } else if (event.key === "up" || (event.key === "p" && event.modifiers?.ctrl)) {
          context.moveActive(-1)
        }
      })
    },
    get onSubmit() {
      return composeHandlers(props.onSubmit, () => {
        if (disabled()) return
        const index = context.activeIndex()
        if (index === null) return
        const item = context.filteredItems()[index]
        if (item !== undefined) context.selectItem(item)
      })
    },
  })
  return renderInput(merged)
}

export interface ComboboxTriggerProps extends HostProps {
  as?: SlotRenderer
  disabled?: boolean
}

export function ComboboxTrigger(props: ComboboxTriggerProps): SolidElement {
  const context = useComboboxContext("ComboboxTrigger")
  const disabled = (): boolean => props.disabled ?? context.disabled()
  const host = omit(omit(props, "as"), "disabled")
  const merged = merge(host, {
    get tabIndex() {
      return disabled() ? -1 : (props.as ? props.tabIndex : (props.tabIndex ?? 0))
    },
    get onClick() {
      return composeHandlers(props.onClick, () => {
        if (!disabled()) context.setOpen(!context.open())
      })
    },
    get onKeyDown() {
      return composeHandlers(props.onKeyDown, (event) => {
        if (disabled()) return
        if (event.key === "down" || event.key === "up") context.setOpen(true)
        if (event.key === "escape") context.setOpen(false)
      })
    },
  })
  return renderSlot(props.as, merged)
}

export interface ComboboxValueProps extends Omit<HostProps, "children"> {
  placeholder?: SolidElement
  children?: SolidElement | ((value: ComboboxValue) => SolidElement)
}

export function ComboboxValue(props: ComboboxValueProps): SolidElement {
  const context = useComboboxContext("ComboboxValue")
  const host = omit(omit(props, "placeholder"), "children")
  const merged = merge(host, {
    get children() {
      const child = props.children
      if (isRenderFunction<ComboboxValue>(child)) return child(context.value())
      if (child !== undefined) return child
      const current = context.value()
      const label = Array.isArray(current)
        ? current.map(context.itemToString).join(", ")
        : current === null
          ? ""
          : context.itemToString(current)
      return label || props.placeholder
    },
  })
  return renderDiv(merged)
}

export function ComboboxContent(props: FloatingContentProps): SolidElement {
  const context = useComboboxContext("ComboboxContent")
  const content = resolveChildren(() => props.children)
  content()
  return Show({
    get when() {
      return context.open()
    },
    get children() {
      const merged = merge(props, {
        get children() {
          return content()
        },
        get onMouseDownOutside() {
          return composeHandlers(props.onMouseDownOutside, () => context.setOpen(false))
        },
      })
      return FloatingLayer(merged)
    },
  })
}

export interface ComboboxListProps extends Omit<HostProps, "children"> {
  children?: SolidElement | ((item: string) => SolidElement)
}

export function ComboboxList(props: ComboboxListProps): SolidElement {
  const context = useComboboxContext("ComboboxList")
  const host = omit(props, "children")
  const merged = merge(host, {
    get children() {
      const child = props.children
      if (!isRenderFunction<string>(child)) return child
      return For({
        get each() {
          return context.filteredItems()
        },
        children: (item: string) => child(item),
      })
    },
  })
  return renderDiv(merged)
}

export interface ComboboxItemState {
  selected: boolean
  highlighted: boolean
  disabled: boolean
}

export interface ComboboxItemProps extends Omit<HostProps, "children" | "style"> {
  value: string
  disabled?: boolean
  children?: SolidElement | ((state: ComboboxItemState) => SolidElement)
  style?: StateStyle<ComboboxItemState>
}

export function ComboboxItem(props: ComboboxItemProps): SolidElement {
  const context = useComboboxContext("ComboboxItem")
  const token = Symbol("combobox-item")
  context.registerItem({
    token,
    value: () => props.value,
    disabled: () => props.disabled ?? false,
  })
  onCleanup(() => context.unregisterItem(token))

  const index = (): number => context.filteredItems().indexOf(props.value)
  const state = (): ComboboxItemState => {
    const current = context.value()
    return {
      selected: Array.isArray(current) ? current.includes(props.value) : current === props.value,
      highlighted: context.activeIndex() === index(),
      disabled: props.disabled ?? false,
    }
  }
  const host = omit(
    omit(omit(omit(props, "value"), "disabled"), "style"),
    "children",
  )
  const merged = merge(host, {
    get style() {
      return resolveStyle(props.style, state())
    },
    get children() {
      const child = props.children
      return isRenderFunction<ComboboxItemState>(child) ? child(state()) : child
    },
    get onMouseEnter() {
      return composeHandlers(props.onMouseEnter, () => {
        const itemIndex = index()
        if (!(props.disabled ?? false) && itemIndex >= 0) context.setActiveIndex(itemIndex)
      })
    },
    get onClick() {
      return composeHandlers(props.onClick, () => {
        if (!(props.disabled ?? false)) context.selectItem(props.value)
      })
    },
  })
  return renderDiv(merged)
}

export function ComboboxEmpty(props: HostProps): SolidElement {
  const context = useComboboxContext("ComboboxEmpty")
  return Show({
    get when() {
      return context.filteredItems().length === 0
    },
    get children() {
      return renderDiv(props)
    },
  })
}

export function ComboboxGroup(props: HostProps): SolidElement {
  return renderDiv(props)
}

export function ComboboxLabel(props: HostProps): SolidElement {
  return renderDiv(props)
}

export function ComboboxSeparator(props: HostProps): SolidElement {
  return renderDiv(props)
}

export {
  Combobox as Root,
  ComboboxContent as Content,
  ComboboxEmpty as Empty,
  ComboboxGroup as Group,
  ComboboxInput as Input,
  ComboboxItem as Item,
  ComboboxLabel as Label,
  ComboboxList as List,
  ComboboxSeparator as Separator,
  ComboboxTrigger as Trigger,
  ComboboxValue as Value,
}
