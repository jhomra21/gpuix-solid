import type { JSX } from "solid-js"
import * as Native from "@jhomra21/gpuix-solid1/kobalte/tooltip"

function Arrow(): JSX.Element {
  return <div style={{ width: 8, height: 8 }} />
}

export const Tooltip = Object.assign(Native.Root, {
  Root: Native.Root,
  Trigger: Native.Trigger,
  Portal: Native.Portal,
  Content: Native.Content,
  Arrow,
})

export const Root = Native.Root
export const Trigger = Native.Trigger
export const Portal = Native.Portal
export const Content = Native.Content
export { Arrow }
