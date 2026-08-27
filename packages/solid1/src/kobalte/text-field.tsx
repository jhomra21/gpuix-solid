import { createContext, createSignal, Show, useContext, type JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import { hasNativeClassStyle, mergeStyle, type NativeComponentProps } from "./shared.jsx"

type ValidationState = "valid" | "invalid" | undefined

type TextFieldContextValue = {
  value: () => string
  setValue: (value: string) => void
  disabled: () => boolean
  readOnly: () => boolean
  validationState: () => ValidationState
}

const TextFieldContext = createContext<TextFieldContextValue>()

export interface TextFieldRootProps<T = "div"> extends NativeComponentProps {
  as?: T
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  readOnly?: boolean
  validationState?: ValidationState
}

export interface TextFieldInputProps<T = "input"> extends NativeComponentProps {
  as?: T
  value?: string
  placeholder?: string
  readOnly?: boolean
  type?: string
}

export interface TextFieldTextAreaProps<T = "textarea"> extends NativeComponentProps {
  as?: T
  value?: string
  placeholder?: string
  readOnly?: boolean
  minRows?: number
  maxRows?: number
}

export interface TextFieldLabelProps<T = "label"> extends NativeComponentProps { as?: T }
export interface TextFieldDescriptionProps<T = "div"> extends NativeComponentProps { as?: T }
export interface TextFieldErrorMessageProps<T = "div"> extends NativeComponentProps { as?: T; forceMount?: boolean }

function requireContext(name: string): TextFieldContextValue {
  const context = useContext(TextFieldContext)
  if (!context) throw new Error(`${name} must be used inside TextField.Root`)
  return context
}

function sourceAwareStyle(
  props: Pick<NativeComponentProps, "class" | "className" | "classList" | "style">,
  fallback: StyleDesc,
  state: StyleDesc = {},
): StyleDesc {
  const base = hasNativeClassStyle(props) ? state : { ...fallback, ...state }
  return mergeStyle(base, props.style)
}

export function Root<T = "div">(props: PolymorphicProps<T, TextFieldRootProps<T>>): JSX.Element {
  const [internalValue, setInternalValue] = createSignal(props.defaultValue ?? props.value ?? "")
  const value = () => props.value ?? internalValue()
  const setValue = (next: string) => {
    if (props.value === undefined) setInternalValue(next)
    props.onValueChange?.(next)
  }
  const context: TextFieldContextValue = {
    value,
    setValue,
    disabled: () => Boolean(props.disabled),
    readOnly: () => Boolean(props.readOnly),
    validationState: () => props.validationState,
  }
  return (
    <TextFieldContext.Provider value={context}>
      <div
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        style={sourceAwareStyle(props, { gap: 4 })}
      >{props.children}</div>
    </TextFieldContext.Provider>
  )
}

export function Input<T = "input">(props: PolymorphicProps<T, TextFieldInputProps<T>>): JSX.Element {
  const context = requireContext("TextField.Input")
  const style = (): StyleDesc => sourceAwareStyle(
    props,
    {
      height: 34,
      paddingLeft: 10,
      paddingRight: 10,
      backgroundColor: "#0d0d0f",
      color: "#fafafa",
      borderWidth: 1,
      borderColor: "#34343a",
    },
    context.validationState() === "invalid" ? { borderColor: "#ef4444" } : {},
  )

  return (
    <input
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      value={props.value ?? context.value()}
      placeholder={props.placeholder}
      readOnly={props.readOnly ?? context.readOnly()}
      onChange={(event: EventPayload) => {
        props.onChange?.(event)
        context.setValue(event.value ?? "")
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyDown={props.onKeyDown}
      style={style()}
    />
  )
}

export function TextArea<T = "textarea">(props: PolymorphicProps<T, TextFieldTextAreaProps<T>>): JSX.Element {
  const context = requireContext("TextField.TextArea")
  const style = (): StyleDesc => sourceAwareStyle(
    props,
    {
      minHeight: 72,
      padding: 10,
      backgroundColor: "#0d0d0f",
      color: "#fafafa",
      borderWidth: 1,
      borderColor: "#34343a",
    },
    context.validationState() === "invalid" ? { borderColor: "#ef4444" } : {},
  )

  return (
    <textarea
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      value={props.value ?? context.value()}
      placeholder={props.placeholder}
      readOnly={props.readOnly ?? context.readOnly()}
      minRows={props.minRows ?? 3}
      maxRows={props.maxRows ?? 8}
      onChange={(event: EventPayload) => {
        props.onChange?.(event)
        context.setValue(event.value ?? "")
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyDown={props.onKeyDown}
      style={style()}
    />
  )
}

export function Label<T = "label">(props: PolymorphicProps<T, TextFieldLabelProps<T>>): JSX.Element {
  return (
    <text
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      style={sourceAwareStyle(props, { fontSize: 12, lineHeight: 16, fontWeight: 600, color: "#fafafa" })}
    >{props.children}</text>
  )
}

export function Description<T = "div">(props: PolymorphicProps<T, TextFieldDescriptionProps<T>>): JSX.Element {
  return (
    <text
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      style={sourceAwareStyle(props, { fontSize: 11, lineHeight: 14, color: "#a1a1aa" })}
    >{props.children}</text>
  )
}

export function ErrorMessage<T = "div">(props: PolymorphicProps<T, TextFieldErrorMessageProps<T>>): JSX.Element {
  const context = requireContext("TextField.ErrorMessage")
  return (
    <Show when={props.forceMount || context.validationState() === "invalid"}>
      <text
        class={props.class}
        className={props.className}
        classList={props.classList}
        testId={props.testId}
        style={sourceAwareStyle(props, { fontSize: 11, lineHeight: 14, color: "#ef4444" })}
      >{props.children}</text>
    </Show>
  )
}

export const TextField = Object.assign(Root, { Root, Input, TextArea, Label, Description, ErrorMessage })
