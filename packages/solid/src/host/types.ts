import type { EventPayload as NativeEventPayload } from "@gpuix/native"

export type ElementType =
  | "div"
  | "text"
  | "img"
  | "svg"
  | "canvas"
  | "input"
  | "textarea"
  | "anchored"
  | "code"
  | "diff"
  | "markdown"
  | "virtual-list"

export type DebugFrameOverlayMode = "hidden" | "minimal" | "full"
export type DimensionValue = number | string

export interface DebugFrameOverlayStats {
  currentMs?: number
  p90Ms?: number
  p99Ms?: number
  maxMs?: number
  frames: number
  samples: number
}

export interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface NativeWindowInsets {
  safeArea: EdgeInsets
  ime: EdgeInsets
  effective: EdgeInsets
}

/** Internal native animation style passed through the GPUIX `motion` wire prop. */
export interface MotionStyle {
  width?: number
  height?: number
  opacity?: number
  top?: number
  right?: number
  bottom?: number
  left?: number
  borderRadius?: number
}

/** Internal native easing format passed through the GPUIX `motion` wire prop. */
export type MotionEase =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | [number, number, number, number]

/** Internal native transition format passed through the GPUIX `motion` wire prop. */
export interface MotionTransition {
  /** Duration in seconds. */
  duration?: number
  /** Delay in seconds. */
  delay?: number
  ease?: MotionEase
}

/** Internal native descriptor. Public callers use `animate.*`. */
export interface MotionProps {
  initial?: MotionStyle | false
  animate: MotionStyle
  transition?: MotionTransition
}

export type CursorValue =
  | "default"
  | "auto"
  | "pointer"
  | "text"
  | "vertical-text"
  | "crosshair"
  | "grab"
  | "grabbing"
  | "move"
  | "all-scroll"
  | "col-resize"
  | "row-resize"
  | "ew-resize"
  | "ns-resize"
  | "nwse-resize"
  | "nesw-resize"
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
  | "not-allowed"
  | "no-drop"
  | "alias"
  | "copy"
  | "context-menu"

export interface BoxShadow {
  offsetX: number
  offsetY: number
  blurRadius: number
  spreadRadius: number
  color: string
}

export interface LinearGradientStop {
  color: string
  /** Position along the gradient from 0 to 1. */
  position: number
}

export interface LinearGradientBackground {
  type: "linear-gradient"
  /** CSS angle in degrees. 0 points up and values increase clockwise. */
  angle: number
  stops: [LinearGradientStop, LinearGradientStop]
  colorSpace?: "srgb" | "oklab"
}

export interface StyleDesc {
  display?: string
  visibility?: string
  flexDirection?: string
  flexWrap?: string
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number
  alignItems?: string
  alignSelf?: string
  alignContent?: string
  justifyContent?: string
  gap?: number
  rowGap?: number
  columnGap?: number
  gridTemplateColumns?: number
  gridTemplateRows?: number
  gridColumnMin?: "zero" | "min-content" | "max-content"
  gridRowMin?: "zero" | "min-content" | "max-content"

  width?: DimensionValue
  height?: DimensionValue
  minWidth?: DimensionValue
  minHeight?: DimensionValue
  maxWidth?: DimensionValue
  maxHeight?: DimensionValue

  padding?: number
  paddingTop?: number
  paddingRight?: number
  paddingBottom?: number
  paddingLeft?: number

  margin?: number
  marginTop?: number
  marginRight?: number
  marginBottom?: number
  marginLeft?: number

  position?: string
  top?: number
  right?: number
  bottom?: number
  left?: number

  background?: string | LinearGradientBackground
  backgroundColor?: string
  color?: string
  opacity?: number

  borderWidth?: number
  borderTopWidth?: number
  borderRightWidth?: number
  borderBottomWidth?: number
  borderLeftWidth?: number
  borderColor?: string
  borderRadius?: number
  borderTopLeftRadius?: number
  borderTopRightRadius?: number
  borderBottomLeftRadius?: number
  borderBottomRightRadius?: number
  boxShadow?: BoxShadow

  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  textAlign?: string
  lineHeight?: number
  whiteSpace?: "normal" | "nowrap"
  textOverflow?: "ellipsis" | "ellipsis-start"
  lineClamp?: number

  overflow?: string
  overflowX?: string
  overflowY?: string

  cursor?: CursorValue
  pointerEvents?: "auto" | "none"
  userSelect?: "text" | "none" | "auto"
  selectionColor?: string

  hover?: Omit<StyleDesc, "hover" | "active">
  active?: Omit<StyleDesc, "hover" | "active">
}

export interface SyntaxTheme {
  comment?: string
  keyword?: string
  string?: string
  stringSpecial?: string
  escape?: string
  number?: string
  boolean?: string
  typeName?: string
  typeBuiltin?: string
  constructor?: string
  function?: string
  functionBuiltin?: string
  macroName?: string
  property?: string
  constant?: string
  variable?: string
  variableSpecial?: string
  parameter?: string
  operator?: string
  punctuation?: string
  tag?: string
  attribute?: string
  label?: string
  invalid?: string
}

export interface GpuixMetrics {
  codeTextSize?: number
  codeLineHeight?: number
  codeGutterDigitWidth?: number
  codeGutterPaddingRight?: number
  codeGutterMinWidth?: number

  diffTextSize?: number
  diffLineHeight?: number
  diffFileHeaderHeight?: number
  diffHunkHeaderHeight?: number
  diffNoticeHeight?: number
  diffBodyBottomPad?: number
  diffGutterWidth?: number
  diffMarkerWidth?: number
  diffAccentBarWidth?: number
  diffRowPaddingX?: number

  mdTextSize?: number
  mdLineHeight?: number
  mdBlockGap?: number
  mdHeadingSizes?: number[]
  mdHeadingLineHeights?: number[]
  mdTableCellPadding?: number
  mdTableMinColumnWidth?: number
  mdTableMinColumnContent?: number
  mdInlineCodeRadius?: number
  mdCodePaddingX?: number
  mdCodePaddingY?: number
  mdCodeRadius?: number
  mdCodeHeaderPaddingY?: number
  mdCodeHeaderTextSize?: number
}

export interface GpuixTheme {
  appearance?: "dark" | "light"
  bg?: string
  border?: string
  text?: string
  textMuted?: string
  textFaint?: string
  textDim?: string
  accent?: string
  caret?: string
  codeText?: string
  codeWash?: string
  diffAdd?: string
  diffDel?: string
  diffHunkBg?: string
  fontSans?: string
  fontMono?: string
  syntax?: SyntaxTheme
  metrics?: GpuixMetrics
}

export interface HighlightSpec {
  query?: string
  caseSensitive?: boolean
  wholeWord?: boolean
  ranges?: Array<[number, number]>
  color?: string
  activeColor?: string
  activeIndex?: number
  matchIndexOffset?: number
  radius?: number
}

export interface HighlightMatch {
  elementId: number
  sub: number
  text: string
  start: number
  end: number
  active: boolean
  rects: Array<{ x: number; y: number; width: number; height: number }>
}

export type DomCompatTarget = {
  value: string
  scrollTop: number
  scrollLeft: number
  style: object
  classList: {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
  }
  focus: () => void
  blur: () => void
  select: () => void
  setPointerCapture: (pointerId: number) => void
  releasePointerCapture: (pointerId: number) => void
  hasPointerCapture: (pointerId: number) => boolean
  getBoundingClientRect: () => {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }
}

type PointerCompatTarget = DomCompatTarget & EventTarget

export type EventPayload = NativeEventPayload &
  Partial<Omit<PointerEvent, "currentTarget" | "target">> & {
    currentTarget?: PointerCompatTarget
    target?: PointerCompatTarget
    clientX?: number
    clientY?: number
    pointerId?: number
    shiftKey?: boolean
    metaKey?: boolean
    altKey?: boolean
    ctrlKey?: boolean
    preventDefault?: () => void
    stopPropagation?: () => void
  }

export type HostRef = (instance: PublicInstance) => void
export type HostEventHandler = (event: EventPayload) => void

export interface HostProps {
  style?: StyleDesc
  children?: unknown
  ref?: HostRef

  onClick?: HostEventHandler
  onAuxClick?: HostEventHandler
  onContextMenu?: HostEventHandler
  onMouseDown?: HostEventHandler
  onMouseUp?: HostEventHandler
  onMouseEnter?: HostEventHandler
  onMouseLeave?: HostEventHandler
  onMouseMove?: HostEventHandler
  onPointerDown?: HostEventHandler
  onPointerUp?: HostEventHandler
  onPointerCancel?: HostEventHandler
  onPointerEnter?: HostEventHandler
  onPointerLeave?: HostEventHandler
  onPointerMove?: HostEventHandler
  onLostPointerCapture?: HostEventHandler
  onMouseDownOutside?: HostEventHandler
  onKeyDown?: HostEventHandler
  onKeyUp?: HostEventHandler
  onFocus?: HostEventHandler
  onBlur?: HostEventHandler
  onScroll?: HostEventHandler
  onChange?: HostEventHandler
  onInput?: HostEventHandler
  onSubmit?: HostEventHandler
  onToggleFile?: HostEventHandler
  onShowMore?: HostEventHandler
  onLineClick?: HostEventHandler
  onLinkClick?: HostEventHandler
  onVisibleRange?: HostEventHandler
  onHighlight?: HostEventHandler

  highlight?: HighlightSpec | HighlightSpec[] | null
  autoFocus?: boolean
  tabIndex?: number
  title?: string
  testId?: string
}

export interface InputProps extends HostProps {
  value?: string
  placeholder?: string
  readOnly?: boolean
  theme?: GpuixTheme
}

export interface TextareaProps extends InputProps {
  minRows?: number
  maxRows?: number
}

type VirtualListShared = {
  style?: Omit<StyleDesc, "hover" | "active">
  children?: unknown
  ref?: HostRef
  alignment?: "top" | "bottom"
  followTail?: boolean
  overdraw?: number
  onVisibleRange?: HostEventHandler
}

export type VirtualListProps =
  | (VirtualListShared & {
      estimatedItemHeight?: number
      itemCount?: never
      windowStart?: never
    })
  | (VirtualListShared & {
      itemCount: number
      estimatedItemHeight: number
      windowStart?: number
    })

export interface ImgProps extends HostProps {
  src?: string
  objectFit?: "fill" | "contain" | "cover" | "scaleDown" | "none"
  alt?: string
}

export interface SvgProps extends HostProps {
  src?: string
  source?: string
}

export interface CodeProps extends HostProps {
  code?: string
  language?: string
  path?: string
  showLineNumbers?: boolean
  showHeader?: boolean
  theme?: GpuixTheme
}

export interface DiffProps extends HostProps {
  patch?: string
  wordDiff?: boolean
  collapsedPaths?: string[]
  scroll?: boolean
  maxLines?: number
  theme?: GpuixTheme
}

export interface MarkdownProps extends HostProps {
  source?: string
  theme?: GpuixTheme
}

export interface AnchoredProps extends HostProps {
  position?: { x: number; y: number }
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  gap?: number
  anchor?:
    | "topLeft"
    | "topCenter"
    | "topRight"
    | "rightCenter"
    | "bottomRight"
    | "bottomCenter"
    | "bottomLeft"
    | "leftCenter"
  offset?: { x: number; y: number }
  fit?: "switch" | "snap"
  snapMargin?: number
  deferred?: boolean
  priority?: number
  occlude?: boolean
}

export interface NativeRenderer {
  createElement(id: number, elementType: string): void
  destroyElement(id: number): number[]
  appendChild(parentId: number, childId: number): void
  removeChild(parentId: number, childId: number): void
  insertBefore(parentId: number, childId: number, beforeId: number): void
  setStyle(id: number, styleJson: string): void
  setText(id: number, content: string): void
  setEventListener(id: number, eventType: string, hasHandler: boolean): void
  setRoot(id: number): void
  commitMutations(): void
  setCustomProp(id: number, key: string, valueJson: string): void
  applyBatch?(json: string): number[]

  focusElement?(elementId: number): void
  focusNext?(): void
  focusPrevious?(): void
  blur?(): void
  setWindowKeyEvents?(keyDown: boolean, keyUp: boolean, eventId: number): void
  scrollTo?(elementId: number, x: number, y: number): void
  scrollToItem?(elementId: number, index: number, offsetInItem?: number): void
  getScrollOffset?(elementId: number): number[] | null
  getListScrollTop?(elementId: number): number[] | null
  getSelectedText?(): string | null
  clearSelection?(): void
  getPaintedHighlights?(): HighlightMatch[]
  getWindowSize?(): { width: number; height: number }
  getWindowInsets?(): NativeWindowInsets
  activateWindow?(): void
  setWindowTitle?(title: string): void
  setDebugFrameOverlay?(mode: DebugFrameOverlayMode): string
  getDebugFrameOverlay?(): string
  cycleDebugFrameOverlay?(): string
  resetDebugFrameOverlayStats?(): void
  getDebugFrameOverlayStats?(): DebugFrameOverlayStats
}

export type WindowKeyEventHandler = (event: EventPayload, renderer: NativeRenderer) => void

export interface WindowKeyEventHandlers {
  /** Window-level GPUI listener. Key actions can consume an event before this runs. */
  onKeyDown?: WindowKeyEventHandler
  /** Window-level GPUI listener. */
  onKeyUp?: WindowKeyEventHandler
}

export interface PublicInstance {
  readonly id: number
  readonly type: ElementType
}
