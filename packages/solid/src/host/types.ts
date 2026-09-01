import type {
  EventPayload as NativeEventPayload,
  NativeRenderer,
  NativeWindowInsets,
} from "@gpuix/native"

export type { NativeRenderer, NativeWindowInsets }

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

export type PublicInstance = {
  readonly kind: "element" | "text"
}

export type DimensionValue = number | string

export interface EdgeInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export type CursorValue =
  | "default"
  | "pointer"
  | "text"
  | "crosshair"
  | "move"
  | "grab"
  | "grabbing"
  | "ew-resize"
  | "ns-resize"
  | "nesw-resize"
  | "nwse-resize"
  | "col-resize"
  | "row-resize"
  | "e-resize"
  | "n-resize"
  | "ne-resize"
  | "nw-resize"
  | "s-resize"
  | "se-resize"
  | "sw-resize"
  | "w-resize"
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

  background?: string
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
  foreground?: string
  background?: string
  surfaceBackground?: string
  border?: string
  muted?: string
  syntax?: SyntaxTheme
  metrics?: GpuixMetrics
}

export type HighlightSpec = {
  query: string
  activeIndex?: number
  radius?: number
}

export type HighlightMatch = {
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
    | "centerLeft"
    | "center"
    | "centerRight"
    | "bottomLeft"
    | "bottomCenter"
    | "bottomRight"
}

export interface VirtualListPropsBase extends HostProps {
  alignment?: "top" | "bottom"
}

export type DebugFrameOverlayMode = "hidden" | "visible"

export interface DebugFrameOverlayStats {
  frameCount: number
  updateCount: number
}
