import { splitProps, type JSX } from "solid-js"
import * as Native from "@jhomra21/gpuix-solid1/kobalte/text-field"
import type {
  TextFieldRootProps,
  TextFieldTextAreaProps,
} from "@jhomra21/gpuix-solid1/kobalte/text-field"

interface RootProps extends Omit<TextFieldRootProps, "onChange"> {
  onChange?: ((value: string) => void) | undefined
  name?: string | undefined
}

interface TextAreaProps extends TextFieldTextAreaProps {
  autoResize?: boolean | undefined
}

function Root(props: RootProps): JSX.Element {
  const [local, rest] = splitProps(props, ["onChange", "name"])
  return local.onChange
    ? <Native.Root {...rest} onValueChange={local.onChange} />
    : <Native.Root {...rest} />
}

function TextArea(props: TextAreaProps): JSX.Element {
  const [, rest] = splitProps(props, ["autoResize"])
  return <Native.TextArea {...rest} />
}

export const Input = Native.Input
export const Label = Native.Label
export const Description = Native.Description
export const ErrorMessage = Native.ErrorMessage
export const TextField = Object.assign(Root, { Root, Input, TextArea, Label, Description, ErrorMessage })
export { Root, TextArea }
