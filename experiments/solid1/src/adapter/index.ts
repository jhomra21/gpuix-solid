export { render } from "./runtime.js"
export type { RenderHandle, RenderOptions } from "./runtime.js"
export { createRoot } from "./root.js"
export type { Root } from "./root.js"
export {
  TestRenderer,
  createTestRoot,
  hasNativeTestRenderer,
} from "./testing.js"
export type { TestRoot } from "./testing.js"

export {
  effect,
  memo,
  createComponent,
  createElement,
  createTextNode,
  insertNode,
  insert,
  spread,
  setProp,
  mergeProps,
  use,
} from "./universal.js"

export {
  ErrorBoundary,
  For,
  Index,
  Match,
  Show,
  Suspense,
  SuspenseList,
  Switch,
} from "solid-js"

export type {
  HostProps,
  InputProps,
  NativeRenderer,
  StyleDesc,
  TextareaProps,
} from "../../../../packages/solid/src/host/types.js"

export { GpuixRenderer } from "@gpuix/native"
export type { EventPayload, WindowOptions } from "@gpuix/native"
