import type { EventPayload } from "@gpuix/native"
import {
  Show,
  children as resolveChildren,
  createComponent,
  createContext,
  createSignal,
  merge,
  omit,
  onCleanup,
  untrack,
  useContext,
  type Accessor,
  type Element as SolidElement,
} from "solid-js"
import { useGpuixRequired } from "../context.js"
import type { HostProps, PublicInstance } from "../host/types.js"
import {
  FloatingLayer,
  composeHandlers,
  composeRefs,
  createControllableState,
  floatingRootStyle,
  isRenderFunction,
  renderDiv,
  renderSlot,
  resolveStyle,
  type FloatingContentProps,
  type SlotRenderer,
  type StateStyle,
} from "./floating.js"

interface SelectItemRecord {
  token: symbol
  value: Accessor<string>
  textValue: Accessor<string>
  disabled: Accessor<boolean>
}

interface MutableBox<Value> {
  value: Value
}

interface SelectContextValue {
  open: Accessor<boolean>
  value: Accessor<string | undefined>
  disabled: Accessor<boolean>
  items(): readonly SelectItemRecord[]
  activeValue: Accessor<string | null>
  triggerPressedWhileOpen: MutableBox<boolean>
  dismissedByOutsidePress: MutableBox<boolean>
  triggerRef: MutableBox<PublicInstance | undefined>
  setOpen(open: boolean): void
  setActiveValue(value: string | null): void
  moveActive(delta: number): void
  selectValue(value: string): void
  registerItem(item: SelectItemRecord): void
  unregisterItem(token: symbol): void
}

const SelectContext = createContext<SelectContextValue>()

function useSelectContext(name: string): SelectContextValue {
  try {
    return useContext(SelectContext)
  } catch {
    throw new Error(`${name} must be used inside Select`)
  }
}

export interface SelectProps extends Omit<HostProps, "children" | "onChange"> {
  children?: SolidElement
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  disabled?: boolean
}

export function Select(props: SelectProps): SolidElement {
  const renderer = useGpuixRequired()
  const [value, setValue] = createControllableState<string | undefined>(
    () => props.value,
    props.defaultValue,
    () => (next) => {
      if (next !== undefined) props.onValueChange?.(next)
    },
  )
  const [open, setOpenState] = createControllableState(
    () => props.open,
    props.defaultOpen ?? false,
    () => props.onOpenChange,
  )
  const [activeValue, setActiveValue] = createSignal<string | null>(null)
  const items: SelectItemRecord[] = []
  const triggerPressedWhileOpen: MutableBox<boolean> = { value: false }
  const dismissedByOutsidePress: MutableBox<boolean> = { value: false }
  const triggerRef: MutableBox<PublicInstance | undefined> = { value: undefined }

  const registerItem = (item: SelectItemRecord): void => {
    const index = items.findIndex((candidate) => candidate.token === item.token)
    if (index < 0) items.push(item)
    else items[index] = item
  }
  const unregisterItem = (token: symbol): void => {
    const index = items.findIndex((item) => item.token === token)
    if (index >= 0) items.splice(index, 1)
  }
  const setOpen = (nextOpen: boolean): void => {
    setOpenState(nextOpen)
    if (nextOpen) {
      const selected = items.find(
        (item) => item.value() === value() && !item.disabled(),
      )
      setActiveValue(selected?.value() ?? null)
    } else {
      const trigger = triggerRef.value
      if (trigger) renderer.focusElement?.(trigger.id)
    }
  }
  const moveActive = (delta: number): void => {
    const enabled = items.filter((item) => !item.disabled())
    if (enabled.length === 0) return
    const currentIndex = enabled.findIndex((item) => item.value() === activeValue())
    const start = currentIndex < 0 ? (delta > 0 ? -1 : 0) : currentIndex
    const nextIndex = (start + delta + enabled.length) % enabled.length
    setActiveValue(enabled[nextIndex]?.value() ?? null)
  }
  const selectValue = (nextValue: string): void => {
    const item = items.find((candidate) => candidate.value() === nextValue)
    if (!item || item.disabled()) return
    setValue(nextValue)
    setOpen(false)
  }

  const context: SelectContextValue = {
    open,
    value,
    disabled: () => props.disabled ?? false,
    items: () => items,
    activeValue,
    triggerPressedWhileOpen,
    dismissedByOutsidePress,
    triggerRef,
    setOpen,
    setActiveValue,
    moveActive,
    selectValue,
    registerItem,
    unregisterItem,
  }

  return createComponent(SelectContext, {
    value: context,
    get children() {
      return renderDiv(props, () => floatingRootStyle(props.style))
    },
  })
}

export interface SelectTriggerState {
  open: boolean
  disabled: boolean
  placeholder: boolean
}

export interface SelectTriggerProps extends Omit<HostProps, "style"> {
  as?: SlotRenderer
  disabled?: boolean
  style?: StateStyle<SelectTriggerState>
}

export function SelectTrigger(props: SelectTriggerProps): SolidElement {
  const context = useSelectContext("SelectTrigger")
  const disabled = (): boolean => props.disabled ?? context.disabled()
  const state = (): SelectTriggerState => ({
    open: context.open(),
    disabled: disabled(),
    placeholder: context.value() === undefined,
  })
  const ref = composeRefs(
    (instance) => {
      context.triggerRef.value = instance
    },
    props.ref,
  )
  const host = omit(omit(omit(props, "as"), "disabled"), "style")
  const merged = merge(host, {
    get ref() {
      return ref
    },
    get tabIndex() {
      return disabled() ? -1 : (props.as ? props.tabIndex : (props.tabIndex ?? 0))
    },
    get style() {
      return resolveStyle(props.style, state())
    },
    get onMouseDown() {
      return composeHandlers(props.onMouseDown, () => {
        context.triggerPressedWhileOpen.value = context.open()
      })
    },
    get onClick() {
      return composeHandlers(props.onClick, () => {
        if (disabled()) return
        if (context.dismissedByOutsidePress.value) {
          context.dismissedByOutsidePress.value = false
          return
        }
        if (context.triggerPressedWhileOpen.value) {
          context.triggerPressedWhileOpen.value = false
          context.setOpen(false)
          return
        }
        context.setOpen(!context.open())
      })
    },
    get onKeyDown() {
      return composeHandlers(props.onKeyDown, (event) => {
        if (disabled()) return
        if (event.key === "escape") {
          context.setOpen(false)
          return
        }
        if (event.key === "down" || (event.key === "n" && event.modifiers?.ctrl)) {
          if (!context.open()) context.setOpen(true)
          context.moveActive(1)
          return
        }
        if (event.key === "up" || (event.key === "p" && event.modifiers?.ctrl)) {
          if (!context.open()) context.setOpen(true)
          context.moveActive(-1)
          return
        }
        if (event.key === "enter" || event.key === "space") {
          context.setOpen(!context.open())
        }
      })
    },
  })
  return renderSlot(props.as, merged)
}

export interface SelectValueProps extends HostProps {
  placeholder?: SolidElement
}

export function SelectValue(props: SelectValueProps): SolidElement {
  const host = omit(props, "placeholder")
  const context = useSelectContext("SelectValue")
  const merged = merge(host, {
    get children() {
      if (props.children !== undefined) return props.children
      const item = context.items().find((candidate) => candidate.value() === context.value())
      return item?.textValue() || props.placeholder
    },
  })
  return renderDiv(merged)
}

export interface SelectContentProps extends FloatingContentProps {
  onEscapeKeyDown?: (event: EventPayload) => void
}

export function SelectContent(props: SelectContentProps): SolidElement {
  const context = useSelectContext("SelectContent")
  const content = resolveChildren(() => props.children)
  // Resolve once while detached so items register before the popup opens.
  untrack(content)
  const host = omit(props, "onEscapeKeyDown")
  return Show({
    get when() {
      return context.open()
    },
    get children() {
      const merged = merge(host, {
        get children() {
          return content()
        },
        get tabIndex() {
          return props.tabIndex ?? 0
        },
        autoFocus: true,
        get onMouseDownOutside() {
          return composeHandlers(props.onMouseDownOutside, () => {
            context.dismissedByOutsidePress.value = true
            queueMicrotask(() => {
              context.dismissedByOutsidePress.value = false
            })
            context.setOpen(false)
          })
        },
        get onKeyDown() {
          return composeHandlers(props.onKeyDown, (event) => {
            if (event.key === "escape") {
              props.onEscapeKeyDown?.(event)
              context.setOpen(false)
              return
            }
            if (event.key === "down" || (event.key === "n" && event.modifiers?.ctrl)) {
              context.moveActive(1)
              return
            }
            if (event.key === "up" || (event.key === "p" && event.modifiers?.ctrl)) {
              context.moveActive(-1)
              return
            }
            if (event.key === "enter" || event.key === "space") {
              const active = context.activeValue()
              if (active !== null) context.selectValue(active)
            }
          })
        },
      })
      return FloatingLayer(merged)
    },
  })
}

export interface SelectItemState {
  selected: boolean
  highlighted: boolean
  disabled: boolean
}

export interface SelectItemProps extends Omit<HostProps, "children" | "style"> {
  value: string
  disabled?: boolean
  textValue?: string
  children?: SolidElement | ((state: SelectItemState) => SolidElement)
  style?: StateStyle<SelectItemState>
}

function selectItemTextValue(props: SelectItemProps): string {
  if (props.textValue !== undefined) return props.textValue
  const child = props.children
  if (child === undefined || child === null || child instanceof Function || child instanceof Object) {
    return ""
  }
  return String(child)
}

export function SelectItem(props: SelectItemProps): SolidElement {
  const context = useSelectContext("SelectItem")
  const token = Symbol("select-item")
  context.registerItem({
    token,
    value: () => props.value,
    textValue: () => selectItemTextValue(props),
    disabled: () => props.disabled ?? false,
  })
  onCleanup(() => context.unregisterItem(token))

  const state = (): SelectItemState => ({
    selected: context.value() === props.value,
    highlighted: context.activeValue() === props.value,
    disabled: props.disabled ?? false,
  })
  const host = omit(
    omit(omit(omit(omit(props, "value"), "disabled"), "textValue"), "style"),
    "children",
  )
  const merged = merge(host, {
    get style() {
      return resolveStyle(props.style, state())
    },
    get onMouseEnter() {
      return composeHandlers(props.onMouseEnter, () => {
        if (!(props.disabled ?? false)) context.setActiveValue(props.value)
      })
    },
    get onClick() {
      return composeHandlers(props.onClick, () => {
        if (!(props.disabled ?? false)) context.selectValue(props.value)
      })
    },
    get children() {
      const child = props.children
      return isRenderFunction<SelectItemState>(child) ? child(state()) : child
    },
  })
  return renderDiv(merged)
}

export function SelectGroup(props: HostProps): SolidElement {
  return renderDiv(props)
}

export function SelectLabel(props: HostProps): SolidElement {
  return renderDiv(props)
}

export function SelectSeparator(props: HostProps): SolidElement {
  return renderDiv(props)
}

export function SelectScrollUpButton(props: HostProps): SolidElement {
  return renderDiv(props)
}

export function SelectScrollDownButton(props: HostProps): SolidElement {
  return renderDiv(props)
}

export {
  Select as Root,
  SelectContent as Content,
  SelectGroup as Group,
  SelectItem as Item,
  SelectLabel as Label,
  SelectScrollDownButton as ScrollDownButton,
  SelectScrollUpButton as ScrollUpButton,
  SelectSeparator as Separator,
  SelectTrigger as Trigger,
  SelectValue as Value,
}
