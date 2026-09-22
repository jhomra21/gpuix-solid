import "./dom-environment.js"
import { installPacedAnimationFrame } from "./animation-frame.js"

installPacedAnimationFrame()

export { render, resetRender } from "./runtime.js"
export type { RenderHandle, RenderOptions } from "./runtime.js"
export { createRoot } from "./root.js"
export type { Root, WindowEventHandlers, WindowSelectionChangeHandler } from "./root.js"
export { createTextSelection } from "./primitives/create-text-selection.js"
export type { TextSelection } from "./primitives/create-text-selection.js"
export { startFrameLoop } from "./frame-loop.js"
export type { FrameLoop, TickRenderer } from "./frame-loop.js"
export { TestRenderer, createTestRoot, hasNativeTestRenderer } from "./testing.js"
export type { TestBounds, TestRoot } from "./testing.js"

export {
  applyNativeStyleParentPosition,
  applyNativeStyleTranslation,
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  getNativeStyleColorMode,
  mergeNativeStyles,
  resolveNativeClassStyle,
  resolveNativeClassAttributeStyle,
  resolveNativeClassSvgPaint,
  resolveNativeClassParentPosition,
  resolveNativeClassTranslation,
  resolveNativeDescendantClassStyle,
  setNativeStyleColorMode,
} from "./native-style.js"
export type {
  NativeClassList,
  NativeColorMode,
  NativeStyleManifest,
  NativeStyleManifestEntry,
  NativeStyleParentPosition,
  NativeStyleTranslation,
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
  CanvasProps,
  CodeProps,
  CursorValue,
  DebugFrameOverlayMode,
  DebugFrameOverlayStats,
  DiffProps,
  DimensionValue,
  DragData,
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
  ImgInstance,
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
  VideoFrameProps,
  VideoFrameSurfaceFrame,
  VirtualListProps,
  WindowKeyEventHandler,
  WindowKeyEventHandlers,
} from "./host/types.js"

export { CANVAS_DRAW_LIST_VERSION, createCanvas2DRecorder } from "./host/canvas.js"
export type {
  Canvas2DRecorder,
  CanvasBackingSize,
  CanvasDrawCommand,
  CanvasDrawList,
  CanvasDrawListVersion,
  CanvasMatrix,
  CanvasPathSegment,
} from "./host/canvas.js"

export { GpuixRenderer } from "@gpuix/native"
export type {
  EventModifiers,
  WindowOptions,
  WindowSize as NativeWindowSize,
} from "@gpuix/native"
