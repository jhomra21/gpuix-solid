export { render, createRenderer } from "./runtime.js"
export type { RenderHandle, RenderOptions, RendererBinding } from "./runtime.js"
export { createRoot } from "./root.js"
export type { Root } from "./root.js"
export { startFrameLoop } from "./frame-loop.js"
export type { FrameLoop, TickRenderer } from "./frame-loop.js"
export { GpuixContext, useGpuix, useGpuixRequired } from "./context.js"
export { useWindowSize } from "./hooks/use-window-size.js"
export type { WindowSize } from "./hooks/use-window-size.js"
export { motion } from "./components/motion.js"
export type { MotionDivProps } from "./components/motion.js"

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
  applyRef,
  ref,
} from "./host/universal.js"

export { Errored, For, Loading, Match, Repeat, Reveal, Show, Switch } from "solid-js"

export type {
  AnchoredProps,
  CodeProps,
  DebugFrameOverlayMode,
  DiffProps,
  DimensionValue,
  ElementType,
  GpuixMetrics,
  GpuixTheme,
  HostProps,
  ImgProps,
  InputProps,
  MarkdownProps,
  MotionEase,
  MotionProps,
  MotionStyle,
  MotionTransition,
  NativeRenderer,
  PublicInstance,
  StyleDesc,
  SyntaxTheme,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "./host/types.js"

export { GpuixRenderer } from "@gpuix/native"
export type { EventModifiers, EventPayload, WindowOptions } from "@gpuix/native"
