export { render, createRenderer } from "./runtime.js"
export type { RenderHandle, RenderOptions, RendererBinding } from "./runtime.js"
export { createRoot } from "./root.js"
export type { Root } from "./root.js"
export { startFrameLoop } from "./frame-loop.js"
export type { FrameLoop, TickRenderer } from "./frame-loop.js"
export { GpuixContext, useGpuix, useGpuixRequired } from "./context.js"
export { useWindowSize } from "./hooks/use-window-size.js"
export type { WindowSize } from "./hooks/use-window-size.js"
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
  EventPayload,
  GpuixMetrics,
  GpuixTheme,
  HostProps,
  ImgProps,
  InputProps,
  MarkdownProps,
  NativeRenderer,
  PublicInstance,
  StyleDesc,
  SyntaxTheme,
  SvgProps,
  TextareaProps,
  VirtualListProps,
} from "./host/types.js"

export { GpuixRenderer } from "@gpuix/native"
export type { EventModifiers, WindowOptions } from "@gpuix/native"