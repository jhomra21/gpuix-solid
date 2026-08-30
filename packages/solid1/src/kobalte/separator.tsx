import type { JSX } from "solid-js"
import type { PolymorphicProps } from "./polymorphic.js"
import { mergeComponentStyle, type NativeComponentProps } from "./shared.jsx"

export interface SeparatorRootProps<T = "hr"> extends NativeComponentProps {
  as?: T
  orientation?: "horizontal" | "vertical"
}

export function Root<T = "hr">(props: PolymorphicProps<T, SeparatorRootProps<T>>): JSX.Element {
  const vertical = () => props.orientation === "vertical"
  return (
    <div
      class={props.class}
      className={props.className}
      classList={props.classList}
      testId={props.testId}
      style={mergeComponentStyle(
        vertical()
          ? { width: 1, minWidth: 1, height: "100%", flexShrink: 0 }
          : { height: 1, minHeight: 1, width: "100%", flexShrink: 0 },
        { backgroundColor: "#34343a" },
        props,
      )}
    />
  )
}

export const Separator = Root
