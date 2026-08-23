import {
  Show,
  createComponent,
  createContext,
  merge,
  omit,
  onCleanup,
  useContext,
  type Accessor,
  type Element as SolidElement,
} from "solid-js"
import type { HostProps } from "../host/types.js"
import {
  FloatingLayer,
  composeHandlers,
  createControllableState,
  escapePressed,
  floatingRootStyle,
  renderDiv,
  renderSlot,
  type FloatingContentProps,
  type SlotRenderer,
} from "./floating.js"

interface TooltipProviderContextValue {
  delayDuration: Accessor<number>
  skipDelayDuration: Accessor<number>
  disableHoverableContent: Accessor<boolean>
  lastClosedAt: { value: number }
}

const DEFAULT_PROVIDER: TooltipProviderContextValue = {
  delayDuration: () => 0,
  skipDelayDuration: () => 300,
  disableHoverableContent: () => false,
  lastClosedAt: { value: Number.NEGATIVE_INFINITY },
}

const TooltipProviderContext = createContext(DEFAULT_PROVIDER)

export interface TooltipProviderProps {
  children?: SolidElement
  delayDuration?: number
  skipDelayDuration?: number
  disableHoverableContent?: boolean
}

export function TooltipProvider(props: TooltipProviderProps): SolidElement {
  const value: TooltipProviderContextValue = {
    delayDuration: () => props.delayDuration ?? 0,
    skipDelayDuration: () => props.skipDelayDuration ?? 300,
    disableHoverableContent: () => props.disableHoverableContent ?? false,
    lastClosedAt: { value: Number.NEGATIVE_INFINITY },
  }
  return createComponent(TooltipProviderContext, {
    value,
    get children() {
      return props.children
    },
  })
}

interface TooltipContextValue {
  open: Accessor<boolean>
  disableHoverableContent: Accessor<boolean>
  openImmediately(): void
  scheduleOpen(): void
  scheduleClose(): void
  cancelClose(): void
  close(): void
}

const TooltipContext = createContext<TooltipContextValue>()

function useTooltipContext(name: string): TooltipContextValue {
  try {
    return useContext(TooltipContext)
  } catch {
    throw new Error(`${name} must be used inside Tooltip`)
  }
}

export interface TooltipProps extends Omit<HostProps, "children"> {
  children?: SolidElement
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  disableHoverableContent?: boolean
}

export function Tooltip(props: TooltipProps): SolidElement {
  const provider = useContext(TooltipProviderContext)
  const [open, setOpenState] = createControllableState(
    () => props.open,
    props.defaultOpen ?? false,
    () => props.onOpenChange,
  )
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined

  const cancelOpen = (): void => {
    if (openTimer !== undefined) clearTimeout(openTimer)
    openTimer = undefined
  }
  const cancelClose = (): void => {
    if (closeTimer !== undefined) clearTimeout(closeTimer)
    closeTimer = undefined
  }
  const hoverableDisabled = (): boolean =>
    props.disableHoverableContent ?? provider.disableHoverableContent()
  const setOpen = (next: boolean): void => {
    cancelOpen()
    cancelClose()
    setOpenState(next)
    if (!next) provider.lastClosedAt.value = Date.now()
  }
  const openImmediately = (): void => setOpen(true)
  const scheduleOpen = (): void => {
    cancelClose()
    const recentlyClosed = Date.now() - provider.lastClosedAt.value <= provider.skipDelayDuration()
    const delay = recentlyClosed ? 0 : (props.delayDuration ?? provider.delayDuration())
    if (delay <= 0) {
      setOpen(true)
      return
    }
    cancelOpen()
    openTimer = setTimeout(() => setOpen(true), delay)
  }
  const close = (): void => setOpen(false)
  const scheduleClose = (): void => {
    cancelOpen()
    if (hoverableDisabled()) {
      close()
      return
    }
    cancelClose()
    closeTimer = setTimeout(close, 80)
  }

  onCleanup(() => {
    cancelOpen()
    cancelClose()
  })

  const context: TooltipContextValue = {
    open,
    disableHoverableContent: hoverableDisabled,
    openImmediately,
    scheduleOpen,
    scheduleClose,
    cancelClose,
    close,
  }

  return createComponent(TooltipContext, {
    value: context,
    get children() {
      return renderDiv(props, () => floatingRootStyle(props.style))
    },
  })
}

export interface TooltipTriggerProps extends HostProps {
  as?: SlotRenderer
}

export function TooltipTrigger(props: TooltipTriggerProps): SolidElement {
  const context = useTooltipContext("TooltipTrigger")
  const host = omit(props, "as")
  const merged = merge(host, {
    get tabIndex() {
      return props.as ? props.tabIndex : (props.tabIndex ?? 0)
    },
    get onMouseEnter() {
      return composeHandlers(props.onMouseEnter, () => context.scheduleOpen())
    },
    get onMouseLeave() {
      return composeHandlers(props.onMouseLeave, () => context.scheduleClose())
    },
    get onMouseDown() {
      return composeHandlers(props.onMouseDown, () => context.close())
    },
    get onClick() {
      return composeHandlers(props.onClick, () => context.close())
    },
    get onFocus() {
      return composeHandlers(props.onFocus, () => context.openImmediately())
    },
    get onBlur() {
      return composeHandlers(props.onBlur, () => context.close())
    },
    get onKeyDown() {
      return composeHandlers(props.onKeyDown, (event) => {
        if (escapePressed(event)) context.close()
      })
    },
  })
  return renderSlot(props.as, merged)
}

export interface TooltipContentProps extends FloatingContentProps {}

export function TooltipContent(props: TooltipContentProps): SolidElement {
  const context = useTooltipContext("TooltipContent")
  return createComponent(Show, {
    get when() {
      return context.open()
    },
    get children() {
      const merged = merge(props, {
        get side() {
          return props.side ?? "top"
        },
        get align() {
          return props.align ?? "center"
        },
        get sideOffset() {
          return props.sideOffset ?? 0
        },
        get onMouseEnter() {
          return composeHandlers(props.onMouseEnter, () => {
            if (!context.disableHoverableContent()) context.cancelClose()
          })
        },
        get onMouseLeave() {
          return composeHandlers(props.onMouseLeave, () => context.scheduleClose())
        },
      })
      return FloatingLayer(merged)
    },
  })
}
