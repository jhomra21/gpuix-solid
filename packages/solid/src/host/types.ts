import type { EventPayload } from "@gpuix/native"

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

/**
 * Initial style surface. This intentionally starts with the documented GPUIX
 * layout/paint keys needed by the first parity fixtures. It will be expanded
 * against upstream tests rather than copied from the React package.
 */
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
  borderColor?: string
  borderRadius?: number
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  textAlign?: string
  lineHeight?: number
  whiteSpace?: "normal" | "nowrap"
  overflow?: string
  overflowX?: string
  overflowY?: string
  cursor?: string
  pointerEvents?: "auto" | "none"
  userSelect?: "text" | "none" | "auto"
  selectionColor?: string
  hover?: Omit<StyleDesc, "hover" | "active">
  active?: Omit<StyleDesc, "hover" | "active">
}

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

export type MotionEase =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | [number, number, number, number]

export interface MotionTransition {
  duration?: number
  delay?: number
  ease?: MotionEase
}

export interface MotionProps {
  initial?: MotionStyle | false
  animate: MotionStyle
  transition?: MotionTransition
}

export type HostRef = (instance: PublicInstance) => void
export type HostEventHandler = (event: EventPayload) => void

export interface HostProps {
  style?: StyleDesc
  children?: unknown
  ref?: HostRef

  onClick?: HostEventHandler
  onMouseDown?: HostEventHandler
  onMouseUp?: HostEventHandler
  onMouseEnter?: HostEventHandler
  onMouseLeave?: HostEventHandler
  onMouseMove?: HostEventHandler
  onMouseDownOutside?: HostEventHandler
  onKeyDown?: HostEventHandler
  onKeyUp?: HostEventHandler
  onFocus?: HostEventHandler
  onBlur?: HostEventHandler
  onScroll?: HostEventHandler
  onChange?: HostEventHandler
  onSubmit?: HostEventHandler
  onToggleFile?: HostEventHandler
  onShowMore?: HostEventHandler
  onLineClick?: HostEventHandler
  onLinkClick?: HostEventHandler

  autoFocus?: boolean
  tabIndex?: number
  testId?: string
  motion?: MotionProps
}

export interface InputProps extends HostProps {
  value?: string
  placeholder?: string
  readOnly?: boolean
  theme?: unknown
}

export interface TextareaProps extends InputProps {
  minRows?: number
  maxRows?: number
}

export interface VirtualListProps extends HostProps {
  alignment?: "top" | "bottom"
  followTail?: boolean
  overdraw?: number
  estimatedItemHeight?: number
}

export interface ImgProps extends HostProps {
  src?: string
  objectFit?: "fill" | "contain" | "cover" | "scaleDown" | "none"
  alt?: string
}

export interface SvgProps extends HostProps {
  src?: string
}

export interface CodeProps extends HostProps {
  code?: string
  language?: string
  path?: string
  showLineNumbers?: boolean
  showHeader?: boolean
  theme?: unknown
}

export interface DiffProps extends HostProps {
  patch?: string
  wordDiff?: boolean
  collapsedPaths?: string[]
  scroll?: boolean
  maxLines?: number
  theme?: unknown
}

export interface MarkdownProps extends HostProps {
  source?: string
  theme?: unknown
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
  setCustomProp(
    id: number,
    key: string,
    valueJson: string,
  ): void
  applyBatch?(json: string): number[]

  focusElement?(elementId: number): void
  blur?(): void
  scrollTo?(elementId: number, x: number, y: number): void
  scrollToItem?(elementId: number, index: number): void
  getScrollOffset?(elementId: number): number[] | null
  getSelectedText?(): string | null
  clearSelection?(): void
  getWindowSize?(): { width: number; height: number }
  setWindowTitle?(title: string): void
  setDebugFrameOverlay?(mode: DebugFrameOverlayMode): string
  getDebugFrameOverlay?(): string
  cycleDebugFrameOverlay?(): string
  resetDebugFrameOverlayStats?(): void
}

export interface PublicInstance {
  readonly id: number
  readonly type: ElementType
}
