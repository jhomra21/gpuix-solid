import type { JSX } from "solid-js"
import type { PolymorphicProps } from "./polymorphic.js"
import { mergeStyle, type NativeComponentProps } from "./shared.js"

export interface SeparatorRootProps<T = "hr"> extends NativeComponentProps {
  as?: T
  orientation?: "horizontal" | "vertical"
}

export function Root<T = "hr">(props: PolymorphicProps<T, SeparatorRootProps<T>>): JSX.Element {
  const vertical = () => props.orientation === "vertical"
  return (
    <div
      testId={props.testId}
      style={mergeStyle(
        vertical()
          ? { width: 1, minWidth: 1, height: "100%", backgroundColor: "#34343a", flexShrink: 0 }
          : { height: 1, minHeight: 1, width: "100%", backgroundColor: "#34343a", flexShrink: 0 },
        props.style,
      )}
    />
  )
}

export const Separator = Root
