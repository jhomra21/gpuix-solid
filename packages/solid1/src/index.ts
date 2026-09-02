import "./dom-environment.js"

export { render } from "./runtime.js"
export type { RenderHandle, RenderOptions } from "./runtime.js"
export { createRoot } from "./root.js"
export type { Root } from "./root.js"
export { startFrameLoop } from "./frame-loop.js"
export type { FrameLoop, TickRenderer } from "./frame-loop.js"
export { TestRenderer, createTestRoot, hasNativeTestRenderer } from "./testing.js"
export type { TestBounds, TestRoot } from "./testing.js"

export {
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  getNativeStyleColorMode,
  mergeNativeStyles,
  resolveNativeClassStyle,
  resolveNativeDescendantClassStyle,
  setNativeStyleColorMode,
} from "./native-style.js"
export type {
  NativeClassList,
  NativeColorMode,
  NativeStyleManifest,
  NativeStyleManifestEntry,
  NativeStyleVariant,
} from "./native-style.js"

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
  AnchoredProps,
  CodeProps,
  CursorValue,
  DebugFrameOverlayMode,
  DebugFrameOverlayStats,
  DiffProps,
  DimensionValue,
  EdgeInsets,
  ElementType,
  EventPayload,
  GpuixMetrics,
  GpuixTheme,
  HighlightMatch,
  HighlightSpec,
  HostEventHandler,
  HostProps,
  HostRef,
  ImgProps,
  LinearGradientBackground,
  LinearGradientStop,
  InputProps,
  MarkdownProps,
  NativeRenderer,
  NativeWindowInsets,
  PublicInstance,
  StyleDesc,
  SvgProps,
  SyntaxTheme,
  TextareaProps,
  VirtualListProps,
  WindowKeyEventHandler,
  WindowKeyEventHandlers,
} from "./host/types.js"

export { GpuixRenderer } from "@gpuix/native"
export type {
  EventModifiers,
  WindowOptions,
  WindowSize as NativeWindowSize,
} from "@gpuix/native"
