export { render, resetRender, createRenderer } from "./runtime.js"
export type { RenderHandle, RenderOptions, RendererBinding } from "./runtime.js"
export { appMenu, appWindow, dialog, shell, DesktopUnsupportedError } from "./desktop.js"
export type {
  MessageDialogButtons,
  MessageDialogOptions,
  OpenFileDialogOptions,
  SaveFileDialogOptions,
} from "./desktop.js"
export { list } from "./list.js"
export type { NativeListTarget } from "./list.js"
export { h, makeH } from "./h.js"
export type { H, HChild, HNode, HProps } from "./h.js"
export { parseNativeUtilities } from "./utilities.js"
export type { NativeUtilityParseResult } from "./utilities.js"
export { createRoot } from "./root.js"
export type { Root, WindowEventHandlers, WindowSelectionChangeHandler } from "./root.js"
export { startFrameLoop } from "./frame-loop.js"
export type { FrameLoop, TickRenderer } from "./frame-loop.js"
export { GpuixContext, useGpuix, useGpuixRequired } from "./context.js"
export {
  MAC_CPU_THROTTLES,
  applyMacCpuThrottleFromEnv,
  readMacCpuThrottle,
} from "./cpu-throttle.js"
export type { MacCpuThrottle } from "./cpu-throttle.js"
export { createTextSearch, findRanges, useTextSearch } from "./hooks/use-text-search.js"
export type { FindRangesOptions, TextSearch, TextSearchOptions } from "./hooks/use-text-search.js"
export {
  createWindowInsets,
  createWindowSize,
  useWindowInsets,
  useWindowSize,
} from "./hooks/use-window-size.js"
export { createTextSelection } from "./primitives/create-text-selection.js"
export type { TextSelection } from "./primitives/create-text-selection.js"
export type {
  WindowInsets,
  WindowInsetsOptions,
  WindowSize,
  WindowSizeOptions,
} from "./hooks/use-window-size.js"
export type { SlotRenderer } from "./components/floating.js"

export {
  TestRenderer,
  createTestRoot,
  hasNativeTestRenderer,
} from "./testing.js"
export type { TestElement, TestRoot } from "./testing.js"
export {
  App,
  AutomationError,
  InProcessAutomationBackend,
  Locator,
  createTestApp,
} from "./automation.js"
export type {
  AutomationBackend,
  AutomationErrorCode,
  AutomationTreeNode,
  ElementBounds,
} from "./automation.js"

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select.js"
export type {
  SelectContentProps,
  SelectItemProps,
  SelectItemState,
  SelectProps,
  SelectTriggerProps,
  SelectTriggerState,
  SelectValueProps,
} from "./components/select.js"

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "./components/combobox.js"
export type {
  ComboboxInputProps,
  ComboboxItemProps,
  ComboboxItemState,
  ComboboxListProps,
  ComboboxProps,
  ComboboxTriggerProps,
  ComboboxValueProps,
} from "./components/combobox.js"

export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/tooltip.js"
export type {
  TooltipContentProps,
  TooltipProps,
  TooltipProviderProps,
  TooltipTriggerProps,
} from "./components/tooltip.js"

export { animate } from "./components/animate.js"
export type {
  AnimateDivProps,
  AnimationEase,
  AnimationStyle,
  AnimationTransition,
} from "./components/animate.js"

export {
  applyNativeStyleParentPosition,
  applyNativeStyleTranslation,
  clearNativeStyleManifest,
  configureNativeStyleManifest,
  getNativeStyleColorMode,
  mergeNativeStyles,
  resolveNativeClassStyle,
  resolveNativeClassParentPosition,
  resolveNativeClassTranslation,
  resolveNativeClassTextTransform,
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
  NativeTextTransform,
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
  applyRef,
  ref,
} from "./host/universal.js"

export { Errored, For, Loading, Match, Repeat, Reveal, Show, Switch } from "solid-js"

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
  SyntaxTheme,
  SvgProps,
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
export type { EventModifiers, WindowOptions } from "@gpuix/native"
