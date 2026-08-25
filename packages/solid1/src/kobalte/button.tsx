import type { JSX } from "solid-js"
import type { EventPayload } from "@gpuix/native"
import type { StyleDesc } from "../host/types.js"
import type { PolymorphicProps } from "./polymorphic.js"
import { mergeStyle, triggerBaseStyle, type NativeComponentProps } from "./shared.jsx"

export interface ButtonRootProps<T = "button"> extends NativeComponentProps {
  as?: T
  type?: "button" | "submit" | "reset" | string | undefined
  pressed?: boolean | undefined
  onPress?: ((event: EventPayload) => void) | undefined
}

export function Root<T = "button">(props: PolymorphicProps<T, ButtonRootProps<T>>): JSX.Element {
  const style = (): StyleDesc => mergeStyle(triggerBaseStyle, {
    opacity: props.disabled ? 0.5 : 1,
    pointerEvents: props.disabled ? "none" : "auto",
  })

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
        props.onPress?.(event)
      }}
      onKeyDown={(event: EventPayload) => {
        if (props.disabled) return
        props.onKeyDown?.(event)
        if (event.key === "enter" || event.key === "space") props.onPress?.(event)
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
      style={mergeStyle(style(), props.style)}
    >
      {props.children}
    </div>
  )
}

export const Button = Root
