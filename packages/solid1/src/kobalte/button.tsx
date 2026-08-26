import { createMemo, type JSX } from "solid-js"
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
  // Solid's compiled component spreads may expose lazy getters whose first read
  // creates an internal memo. Prime the interaction-facing values while this
  // component is owned so native events never instantiate those computations
  // later, outside the render owner.
  const disabled = createMemo(() => props.disabled)
  const onClick = createMemo(() => props.onClick)
  const onPress = createMemo(() => props.onPress)
  const onKeyDown = createMemo(() => props.onKeyDown)

  const style = (): StyleDesc => mergeStyle(triggerBaseStyle, {
    opacity: disabled() ? 0.5 : 1,
    pointerEvents: disabled() ? "none" : "auto",
  })

  return (
    <div
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      tabIndex={disabled() ? undefined : (props.tabIndex ?? 0)}
      onClick={(event: EventPayload) => {
        if (disabled()) return
        onClick()?.(event)
        onPress()?.(event)
      }}
      onKeyDown={(event: EventPayload) => {
        if (disabled()) return
        onKeyDown()?.(event)
        if (event.key === "enter" || event.key === "space") onPress()?.(event)
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
