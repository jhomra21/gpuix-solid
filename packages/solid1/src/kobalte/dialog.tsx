import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import { Portal as NativePortal, mergeStyle, triggerBaseStyle, type NativeComponentProps } from "./shared.jsx"

export interface DialogRootProps {
  children?: JSX.Element
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  modal?: boolean
}
export interface DialogTriggerProps<T = "button"> extends NativeComponentProps { as?: T }
export interface DialogPortalProps { children?: JSX.Element }
export interface DialogOverlayProps<T = "div"> extends NativeComponentProps { as?: T }
export interface DialogContentProps<T = "div"> extends NativeComponentProps { as?: T }
export interface DialogCloseButtonProps<T = "button"> extends NativeComponentProps { as?: T }
export interface DialogTitleProps<T = "h2"> extends NativeComponentProps { as?: T }
export interface DialogDescriptionProps<T = "p"> extends NativeComponentProps { as?: T }

type DialogContextValue = { open: () => boolean; setOpen: (open: boolean) => void }
const DialogContext = createContext<DialogContextValue>()
const DialogPortalContext = createContext(false)

function requireContext(name: string): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${name} must be used inside Dialog.Root`)
  return context
}

function interactiveStyle(disabled: boolean | undefined, override: StyleDesc | undefined): StyleDesc {
  return mergeStyle({
    ...triggerBaseStyle,
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? "none" : "auto",
  }, override)
}

function overlayNode<T>(
  props: PolymorphicProps<T, DialogOverlayProps<T>>,
  context: DialogContextValue,
): JSX.Element {
  return (
    <div
      testId={props.testId}
      onClick={(event: EventPayload) => { props.onClick?.(event); context.setOpen(false) }}
      style={mergeStyle({
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "#00000088",
        pointerEvents: "auto",
      }, props.style)}
    />
  )
}

function contentNode<T>(
  props: PolymorphicProps<T, DialogContentProps<T>>,
  context: DialogContextValue,
): JSX.Element {
  return (
    <anchored
      position={{ x: 280, y: 140 }}
      side="bottom"
      align="start"
      gap={0}
      fit="snap"
      snapMargin={16}
      deferred
      priority={3}
      occlude
    >
      <div
        testId={props.testId}
        tabIndex={props.tabIndex ?? 0}
        onMouseDownOutside={(event: EventPayload) => { props.onMouseDownOutside?.(event); context.setOpen(false) }}
        onKeyDown={(event: EventPayload) => { props.onKeyDown?.(event); if (event.key === "escape") context.setOpen(false) }}
        style={mergeStyle({
          width: 600,
          maxHeight: 520,
          overflowY: "auto",
          padding: 18,
          gap: 12,
          backgroundColor: "#151518",
          color: "#fafafa",
          borderWidth: 1,
          borderColor: "#34343a",
          borderRadius: 8,
          pointerEvents: "auto",
        }, props.style)}
      >{props.children}</div>
    </anchored>
  )
}

export function Root(props: DialogRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  const open = () => props.open ?? internalOpen()
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next)
  }
  return <DialogContext.Provider value={{ open, setOpen }}>{props.children}</DialogContext.Provider>
}

export function Trigger<T = "button">(props: PolymorphicProps<T, DialogTriggerProps<T>>): JSX.Element {
  const context = requireContext("Dialog.Trigger")
  return (
    <div
      testId={props.testId}
      tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)}
      onClick={(event: EventPayload) => {
        if (props.disabled) return
        props.onClick?.(event)
        context.setOpen(true)
      }}
      onKeyDown={(event: EventPayload) => {
        if (props.disabled) return
        props.onKeyDown?.(event)
        if (event.key === "enter" || event.key === "space") context.setOpen(true)
      }}
      style={interactiveStyle(props.disabled, props.style)}
    >{props.children}</div>
  )
}

export function Portal(props: DialogPortalProps): JSX.Element {
  const context = requireContext("Dialog.Portal")
  return (
    <Show when={context.open()}>
      <DialogPortalContext.Provider value={true}>
        <NativePortal>{props.children}</NativePortal>
      </DialogPortalContext.Provider>
    </Show>
  )
}

export function Overlay<T = "div">(props: PolymorphicProps<T, DialogOverlayProps<T>>): JSX.Element {
  const context = requireContext("Dialog.Overlay")
  const inPortal = useContext(DialogPortalContext)
  return inPortal ? overlayNode(props, context) : <Show when={context.open()}>{overlayNode(props, context)}</Show>
}

export function Content<T = "div">(props: PolymorphicProps<T, DialogContentProps<T>>): JSX.Element {
  const context = requireContext("Dialog.Content")
  const inPortal = useContext(DialogPortalContext)
  return inPortal ? contentNode(props, context) : <Show when={context.open()}>{contentNode(props, context)}</Show>
}

export function CloseButton<T = "button">(props: PolymorphicProps<T, DialogCloseButtonProps<T>>): JSX.Element {
  const context = requireContext("Dialog.CloseButton")
  return (
    <div
      testId={props.testId}
      tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)}
      onClick={(event: EventPayload) => {
        if (props.disabled) return
        props.onClick?.(event)
        context.setOpen(false)
      }}
      onKeyDown={(event: EventPayload) => {
        if (props.disabled) return
        props.onKeyDown?.(event)
        if (event.key === "enter" || event.key === "space") context.setOpen(false)
      }}
      style={interactiveStyle(props.disabled, props.style)}
    >{props.children}</div>
  )
}

export function Title<T = "h2">(props: PolymorphicProps<T, DialogTitleProps<T>>): JSX.Element {
  return <text testId={props.testId} style={mergeStyle({ fontSize: 18, lineHeight: 24, fontWeight: 700, color: "#fafafa" }, props.style)}>{props.children}</text>
}

export function Description<T = "p">(props: PolymorphicProps<T, DialogDescriptionProps<T>>): JSX.Element {
  return <text testId={props.testId} style={mergeStyle({ fontSize: 13, lineHeight: 18, color: "#a1a1aa" }, props.style)}>{props.children}</text>
}

export const Dialog = Object.assign(Root, { Root, Trigger, Portal, Overlay, Content, CloseButton, Title, Description })
