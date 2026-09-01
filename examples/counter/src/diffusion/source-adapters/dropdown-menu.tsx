import {
  Show,
  createContext,
  createSignal,
  useContext,
  type Element as SolidElement,
  type ParentProps,
} from "solid-js"
import type { HostEventHandler, StyleDesc } from "gpuix-solid"

interface DropdownContextValue {
  open: () => boolean
  setOpen: (value: boolean) => void
}

const DropdownContext = createContext<DropdownContextValue>()

function useDropdown(): DropdownContextValue {
  const context = useContext(DropdownContext)
  if (!context) throw new Error("Dropdown source adapter requires DropdownMenu")
  return context
}

export function DropdownMenu(props: ParentProps<{ placement?: string }>): SolidElement {
  const [open, setOpen] = createSignal(false)
  return (
    <DropdownContext value={{ open, setOpen }}>
      <div style={{ position: "relative", display: "flex", flexGrow: 1, justifyContent: "flex-end" }}>
        {props.children}
      </div>
    </DropdownContext>
  )
}

interface TriggerProps {
  as?: (props: { onClick: HostEventHandler }) => SolidElement
  children?: SolidElement
}

export function DropdownMenuTrigger<_T = unknown>(props: TriggerProps): SolidElement {
  const context = useDropdown()
  const onClick: HostEventHandler = () => context.setOpen(!context.open())
  return props.as ? props.as({ onClick }) : <button onClick={onClick}>{props.children}</button>
}

export function DropdownMenuPortal(props: ParentProps): SolidElement {
  return <>{props.children}</>
}

interface ContentProps extends ParentProps {
  class?: string
}

const contentStyle: StyleDesc = {
  position: "absolute",
  right: 0,
  top: 32,
  minWidth: 128,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 8,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#FFFFFF0F",
  backgroundColor: "#1C1C1C",
  color: "#F2F2F2",
  overflowX: "hidden",
  overflowY: "hidden",
  boxShadow: {
    offsetX: 0,
    offsetY: 4,
    blurRadius: 16,
    spreadRadius: 2,
    color: "rgba(0,0,0,0.24)",
  },
}

export function DropdownMenuContent(props: ContentProps): SolidElement {
  const context = useDropdown()
  return (
    <Show when={context.open()}>
      <div class={props.class} style={contentStyle}>
        {props.children}
      </div>
    </Show>
  )
}

interface ItemProps extends ParentProps {
  onSelect?: () => void
  disabled?: boolean
}

const itemStyle: StyleDesc = {
  position: "relative",
  height: 28,
  minHeight: 28,
  width: "100%",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingLeft: 8,
  paddingRight: 8,
  borderRadius: 6,
  fontSize: 12,
  cursor: "default",
  hover: {
    backgroundColor: "#0095FF",
    color: "#FFFFFF",
  },
}

export function DropdownMenuItem(props: ItemProps): SolidElement {
  const context = useDropdown()
  const onClick: HostEventHandler = () => {
    if (props.disabled) return
    props.onSelect?.()
    context.setOpen(false)
  }
  return (
    <div onClick={onClick} style={{ ...itemStyle, opacity: props.disabled ? 0.5 : 1 }}>
      {props.children}
    </div>
  )
}

export function DropdownMenuShortcut(props: ParentProps): SolidElement {
  return (
    <span style={{ position: "absolute", right: 8, color: "#F2F2F28C", fontSize: 10 }}>
      {props.children}
    </span>
  )
}
