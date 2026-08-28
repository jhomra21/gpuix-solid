import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import { useGpuixContextRequired } from "../context.js"
import type { PublicInstance, StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import { mergeStyle, triggerBaseStyle, type FocusableInstance, type NativeComponentProps } from "./shared.jsx"

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

type DialogContextValue = {
  open: () => boolean
  setOpen: (open: boolean) => void
  setTrigger: (instance: PublicInstance) => void
  setContent: (instance: PublicInstance) => void
  focusTrigger: () => void
  focusContent: () => void
}
const DialogContext = createContext<DialogContextValue>()
const DialogPortalContext = createContext(false)

function requireContext(name: string): DialogContextValue {
  const context = useContext(DialogContext)
  if (!context) throw new Error(`${name} must be used inside Dialog.Root`)
  return context
}

function focusable(instance: PublicInstance): FocusableInstance | undefined {
  return typeof (instance as FocusableInstance).focus === "function"
    ? instance as FocusableInstance
    : undefined
}

function focusAfterMount(action: () => void): void {
  queueMicrotask(action)
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
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      onClick={(event: EventPayload) => { props.onClick?.(event); context.setOpen(false) }}
      style={mergeStyle({
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(0, 0, 0, 0.2)",
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
    <div
      ref={(instance) => { context.setContent(instance); props.ref?.(instance) }}
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={props.tabIndex ?? 0}
      onMouseDownOutside={(event: EventPayload) => { props.onMouseDownOutside?.(event); context.setOpen(false) }}
      onKeyDown={(event: EventPayload) => {
        props.onKeyDown?.(event)
        if (event.key === "escape") context.setOpen(false)
      }}
      style={mergeStyle({
        width: 500,
        maxHeight: 520,
        overflowY: "auto",
        padding: 16,
        gap: 12,
        backgroundColor: "#151518",
        color: "#fafafa",
        borderWidth: 1,
        borderColor: "#34343a",
        borderRadius: 6,
        pointerEvents: "auto",
      }, props.style)}
    >{props.children}</div>
  )
}

export function Root(props: DialogRootProps): JSX.Element {
  const [internalOpen, setInternalOpen] = createSignal(props.defaultOpen ?? false)
  let trigger: FocusableInstance | undefined
  let content: FocusableInstance | undefined
  const open = () => props.open ?? internalOpen()
  const focusTrigger = () => trigger?.focus()
  const focusContent = () => content?.focus()
  const setOpen = (next: boolean) => {
    if (props.open === undefined) setInternalOpen(next)
    props.onOpenChange?.(next)
    if (!next) focusAfterMount(focusTrigger)
  }
  return (
    <DialogContext.Provider value={{
      open,
      setOpen,
      setTrigger(instance) { trigger = focusable(instance) },
      setContent(instance) { content = focusable(instance) },
      focusTrigger,
      focusContent,
    }}>
      {props.children}
    </DialogContext.Provider>
  )
}

export function Trigger<T = "button">(props: PolymorphicProps<T, DialogTriggerProps<T>>): JSX.Element {
  const context = requireContext("Dialog.Trigger")
  const open = () => {
    context.setOpen(true)
    focusAfterMount(context.focusContent)
  }
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      <div
        ref={(instance) => { context.setTrigger(instance); props.ref?.(instance) }}
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        tabIndex={props.disabled ? undefined : (props.tabIndex ?? 0)}
        onClick={(event: EventPayload) => {
          if (props.disabled) return
          props.onClick?.(event)
          open()
        }}
        onKeyDown={(event: EventPayload) => {
          if (props.disabled) return
          props.onKeyDown?.(event)
          if (event.key === "enter" || event.key === "space") open()
        }}
        style={interactiveStyle(props.disabled, props.style)}
      >{props.children}</div>
    </div>
  )
}

export function Portal(props: DialogPortalProps): JSX.Element {
  const context = requireContext("Dialog.Portal")
  const gpuix = useGpuixContextRequired()
  const viewportStyle = (): StyleDesc => {
    const size = gpuix.getViewportSize()
    return {
      position: "relative",
      width: size.width,
      height: size.height,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.001)",
      pointerEvents: "auto",
    }
  }

  return (
    <Show when={context.open()}>
      <anchored
        testId="dialog-positioner"
        position={{ x: 0, y: 0 }}
        side="bottom"
        align="start"
        gap={0}
        fit="snap"
        snapMargin={0}
        deferred
        priority={100}
        occlude
        style={viewportStyle()}
      >
        <DialogPortalContext.Provider value={true}>
          {props.children}
        </DialogPortalContext.Provider>
      </anchored>
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
      class={props.class}
      className={props.className}
      classList={props.classList}
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
  return <text class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={mergeStyle({ fontSize: 18, lineHeight: 24, fontWeight: 700, color: "#fafafa" }, props.style)}>{props.children}</text>
}

export function Description<T = "p">(props: PolymorphicProps<T, DialogDescriptionProps<T>>): JSX.Element {
  return <text class={props.class} className={props.className} classList={props.classList} testId={props.testId} style={mergeStyle({ fontSize: 13, lineHeight: 18, color: "#a1a1aa" }, props.style)}>{props.children}</text>
}

export const Dialog = Object.assign(Root, { Root, Trigger, Portal, Overlay, Content, CloseButton, Title, Description })
