import { createRoot as createSolidRoot, type JSX } from "solid-js"
import { createRenderer } from "solid-js/universal"
import {
  createHostElement,
  createHostText,
  getFirstChild as getHostFirstChild,
  getNextSibling as getHostNextSibling,
  getParentNode as getHostParentNode,
  insertHostNode,
  isHostTextNode,
  removeHostNode,
  replaceHostText,
  setHostProperty,
  type HostElementNode,
  type HostNode,
  type HostParent,
  type HostTextNode,
} from "./host/nodes.js"
import type { DimensionValue, ElementType, StyleDesc } from "./host/types.js"
import {
  applyNativeStyleParentPosition,
  applyNativeStyleTranslation,
  mergeNativeStyles,
  onNativeStyleEnvironmentChange,
  resolveNativeClassStyle,
  resolveNativeClassAttributeStyle,
  resolveNativeClassSvgPaint,
  resolveNativeClassParentPosition,
  resolveNativeClassTranslation,
  resolveNativeClassTextTransform,
  resolveNativeDescendantClassStyle,
  type NativeClassList,
  type NativeTextTransform,
} from "./native-style.js"

interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
}

type NativeInlineStyleInput = Omit<StyleDesc, "gap" | "rowGap" | "columnGap" | "top" | "right" | "bottom" | "left"> & {
  top?: DimensionValue
  right?: DimensionValue
  bottom?: DimensionValue
  left?: DimensionValue
  gap?: DimensionValue
  rowGap?: DimensionValue
  columnGap?: DimensionValue
  "row-gap"?: DimensionValue
  "column-gap"?: DimensionValue
  "min-width"?: DimensionValue
  "min-height"?: DimensionValue
  "max-width"?: DimensionValue
  "max-height"?: DimensionValue
  "flex-direction"?: string
  "flex-wrap"?: string
  "align-items"?: string
  "align-self"?: string
  "align-content"?: string
  "justify-content"?: string
  "background-color"?: string
  "font-family"?: string
  "font-weight"?: string | number
  "text-align"?: string
  "white-space"?: "normal" | "nowrap"
  "overflow-x"?: string
  "overflow-y"?: string
  "pointer-events"?: "auto" | "none"
  "user-select"?: "text" | "none" | "auto"
}

type SvgAttributeValue = string

const styleStates = new WeakMap<HostElementNode, NativeStyleState>()
const classStyledNodes = new Set<HostElementNode>()
const semanticTags = new WeakMap<HostElementNode, string>()
const svgAttributes = new WeakMap<HostElementNode, Map<string, SvgAttributeValue>>()
const textTransforms = new WeakMap<HostElementNode, NativeTextTransform>()
const sourceTextValues = new WeakMap<HostTextNode, string>()

const TEXT_SEMANTIC_TAGS = new Set([
  "span",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "small",
  "label",
  "time",
  "kbd",
  "samp",
  "output",
  "option",
])

const DIV_SEMANTIC_TAGS = new Set([
  "button",
  "hr",
  "section",
  "main",
  "header",
  "footer",
  "nav",
  "aside",
  "article",
  "ul",
  "ol",
  "li",
  "form",
  "fieldset",
  "legend",
  "figure",
  "figcaption",
  "a",
  "select",
])

const SVG_CHILD_TAGS = new Set([
  "path",
  "g",
  "defs",
  "pattern",
  "linearGradient",
  "radialGradient",
  "stop",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "clipPath",
  "mask",
  "title",
  "desc",
  "use",
])

const SVG_ATTRIBUTE_NAMES = new Map<string, string>([
  ["strokeWidth", "stroke-width"],
  ["strokeLinecap", "stroke-linecap"],
  ["strokeLinejoin", "stroke-linejoin"],
  ["strokeMiterlimit", "stroke-miterlimit"],
  ["strokeDasharray", "stroke-dasharray"],
  ["strokeDashoffset", "stroke-dashoffset"],
  ["fillRule", "fill-rule"],
  ["clipRule", "clip-rule"],
  ["stopColor", "stop-color"],
  ["stopOpacity", "stop-opacity"],
  ["clipPath", "clip-path"],
])

const OMITTED_SVG_ATTRIBUTES = new Set([
  "children",
  "ref",
  "key",
  "style",
  "class",
  "className",
  "classList",
  "testId",
  "tabIndex",
  "autoFocus",
  "src",
  "source",
])

onNativeStyleEnvironmentChange(() => {
  for (const node of classStyledNodes) {
    if (!node.nativeAlive) {
      classStyledNodes.delete(node)
      continue
    }
    reapplyNativeStyleSubtree(node)
    refreshInlineSvg(node)
  }
})

const runtime = createRenderer<HostNode | HostParent>({
  createElement(tagName) {
    const type = nativeElementType(tagName)
    const node = createHostElement(type, tagName)
    if (type !== tagName || tagName === "svg") semanticTags.set(node, tagName)
    return node
  },
  createTextNode(value) {
    const node = createHostText(value)
    sourceTextValues.set(node, String(value))
    return node
  },
  replaceText(node, value) {
    if (!isHostTextNode(node)) throw new TypeError("Expected GPUIX text node")
    sourceTextValues.set(node, String(value))
    applyNativeTextTransform(node)
    refreshInlineSvgFromParent(node.parent)
  },
  setProperty(node, name, value, previous) {
    if (node.kind === "root") return
    if (node.kind === "element") {
      const semanticTag = semanticTags.get(node)
      if (semanticTag && isSvgMarkupTag(semanticTag)) {
        if (semanticTag !== "svg") {
          if (isSvgMarkupAttribute(name)) {
            setSvgAttribute(node, name, value)
            refreshInlineSvg(node)
            return
          }
        } else if (isSvgMarkupAttribute(name)) {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
      }

      if (name === "style") {
        // SAFETY: Solid's DOM-style object reaches this host boundary after JSX typing; this contract adds the CSS kebab-case aliases used by upstream Solid source.
        const inlineStyle = value as NativeInlineStyleInput | undefined
        setNativeInlineStyle(node, normalizeNativeInlineStyle(inlineStyle))
        return
      }
      if (name === "class") {
        setNativeClass(node, parseNativeClassName(value))
        refreshInlineSvg(node)
        return
      }
      if (name === "className") {
        setNativeClassName(node, parseNativeClassName(value))
        refreshInlineSvg(node)
        return
      }
      if (name === "classList") {
        setNativeClassList(node, parseNativeClassList(value))
        refreshInlineSvg(node)
        return
      }
    }
    setHostProperty(node, name, value, previous)
    if (node.kind === "element" && (name.startsWith("data-") || name.startsWith("aria-"))) {
      reapplyNativeStyleSubtree(node)
    }
  },
  insertNode(parent, node, anchor) {
    if (parent.kind === "text" || node.kind === "root") {
      throw new TypeError("Expected a GPUIX parent and child host node")
    }
    if (anchor?.kind === "root") throw new TypeError("Expected a GPUIX host node anchor")
    insertHostNode(parent, node, anchor ?? null)
    if (node.kind === "element") reapplyNativeStyleSubtree(node)
    else applyNativeTextTransform(node)
    refreshInlineSvgFromParent(parent)
  },
  isTextNode(node) {
    return node.kind === "text"
  },
  removeNode(parent, node) {
    if (parent.kind === "text" || node.kind === "root") {
      throw new TypeError("Expected a GPUIX parent and child host node")
    }
    const svgRoot = parent.kind === "element" ? inlineSvgRoot(parent) : undefined
    if (node.kind === "element") classStyledNodes.delete(node)
    removeHostNode(parent, node)
    if (svgRoot) refreshInlineSvg(svgRoot)
  },
  getParentNode(node) {
    return node.kind === "root" ? undefined : getHostParentNode(node)
  },
  getFirstChild(node) {
    return node.kind === "text" ? undefined : getHostFirstChild(node)
  },
  getNextSibling(node) {
    return node.kind === "root" ? undefined : getHostNextSibling(node)
  },
})

export function universalRender(code: () => JSX.Element, node: HostNode | HostParent): () => void {
  return createSolidRoot((dispose) => {
    runtime.insert(node, code())
    return dispose
  })
}

export const effect = runtime.effect
export const memo = runtime.memo
export const createComponent = runtime.createComponent
export const createElement = runtime.createElement
export const createTextNode = runtime.createTextNode
export const insertNode = runtime.insertNode
export const insert = runtime.insert
export const spread = runtime.spread
export const setProp = runtime.setProp
export const mergeProps = runtime.mergeProps
export const use = runtime.use

function nativeElementType(tagName: string): ElementType {
  switch (tagName) {
    case "div":
    case "text":
    case "img":
    case "svg":
    case "canvas":
    case "input":
    case "textarea":
    case "anchored":
    case "code":
    case "diff":
    case "markdown":
    case "virtual-list":
      return tagName
    default:
      if (TEXT_SEMANTIC_TAGS.has(tagName)) return "text"
      if (DIV_SEMANTIC_TAGS.has(tagName) || SVG_CHILD_TAGS.has(tagName)) return "div"
      throw new Error(`Unsupported GPUIX semantic element <${tagName}>`)
  }
}

function isSvgMarkupTag(tagName: string): boolean {
  return tagName === "svg" || SVG_CHILD_TAGS.has(tagName)
}

function isSvgMarkupAttribute(name: string): boolean {
  return !OMITTED_SVG_ATTRIBUTES.has(name) && !name.startsWith("on")
}

function setSvgAttribute<T>(node: HostElementNode, name: string, value: T): void {
  if (!isSvgMarkupAttribute(name)) return
  const attributes = svgAttributes.get(node) ?? new Map<string, SvgAttributeValue>()
  if (value == null) attributes.delete(name)
  else attributes.set(name, String(value))
  svgAttributes.set(node, attributes)
}

function refreshInlineSvgFromParent(parent: HostParent | null): void {
  if (!parent || parent.kind === "root") return
  refreshInlineSvg(parent)
}

function refreshInlineSvg(node: HostElementNode): void {
  const root = inlineSvgRoot(node)
  if (!root) return
  const source = serializeSvgElement(root, true)
  setHostProperty(root, "source", source)
  setHostProperty(root, "src", `data:image/svg+xml,${encodeURIComponent(source)}`)
}

function inlineSvgRoot(node: HostElementNode): HostElementNode | undefined {
  let current: HostElementNode = node
  for (;;) {
    if (semanticTags.get(current) === "svg") return current
    const parent: HostParent | null = current.parent
    if (!parent || parent.kind === "root") return undefined
    current = parent
  }
}

function serializeSvgElement(node: HostElementNode, root: boolean): string {
  const tagName = semanticTags.get(node)
  if (!tagName || !isSvgMarkupTag(tagName)) return ""

  const attributes = new Map(svgAttributes.get(node) ?? [])
  const state = styleStates.get(node)
  if (state && hasNativeClasses(state)) {
    const paint = resolveNativeClassSvgPaint(combinedClassName(state), state.classList)
    if (paint?.fill !== undefined) attributes.set("fill", paint.fill)
    if (paint?.stroke !== undefined) attributes.set("stroke", paint.stroke)
  }
  if (root && !attributes.has("xmlns")) attributes.set("xmlns", "http://www.w3.org/2000/svg")
  const renderedAttributes = [...attributes]
    .map(([name, value]) => `${serializeSvgAttributeName(name)}="${escapeXmlAttribute(value)}"`)
    .join(" ")
  const opening = renderedAttributes ? `<${tagName} ${renderedAttributes}>` : `<${tagName}>`
  const children = node.children.map(serializeSvgChild).join("")
  return `${opening}${children}</${tagName}>`
}

function serializeSvgChild(node: HostNode): string {
  if (node.kind === "text") return escapeXmlText(node.text)
  const tagName = semanticTags.get(node)
  if (!tagName || !isSvgMarkupTag(tagName)) return ""
  return serializeSvgElement(node, false)
}

function serializeSvgAttributeName(name: string): string {
  return SVG_ATTRIBUTE_NAMES.get(name) ?? name
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function parseNativeClassName<T>(value: T): string | undefined {
  return value == null ? undefined : String(value)
}

function parseNativeClassList<T>(value: T): NativeClassList | undefined {
  if (value == null) return undefined
  const parsed: NativeClassList = {}
  for (const [candidate, enabled] of Object.entries(Object(value))) {
    parsed[candidate] = Boolean(enabled)
  }
  return parsed
}

function normalizeNativeInlineStyle(style: NativeInlineStyleInput | undefined): StyleDesc | undefined {
  if (!style) return undefined
  const {
    gap,
    rowGap,
    columnGap,
    top,
    right,
    bottom,
    left,
    "row-gap": cssRowGap,
    "column-gap": cssColumnGap,
    "min-width": cssMinWidth,
    "min-height": cssMinHeight,
    "max-width": cssMaxWidth,
    "max-height": cssMaxHeight,
    "flex-direction": cssFlexDirection,
    "flex-wrap": cssFlexWrap,
    "align-items": cssAlignItems,
    "align-self": cssAlignSelf,
    "align-content": cssAlignContent,
    "justify-content": cssJustifyContent,
    "background-color": cssBackgroundColor,
    "font-family": cssFontFamily,
    "font-weight": cssFontWeight,
    "text-align": cssTextAlign,
    "white-space": cssWhiteSpace,
    "overflow-x": cssOverflowX,
    "overflow-y": cssOverflowY,
    "pointer-events": cssPointerEvents,
    "user-select": cssUserSelect,
    ...nativeStyle
  } = style
  const normalized: StyleDesc = { ...nativeStyle }

  if (cssFlexDirection !== undefined) normalized.flexDirection = cssFlexDirection
  if (cssFlexWrap !== undefined) normalized.flexWrap = cssFlexWrap
  if (cssAlignItems !== undefined) normalized.alignItems = cssAlignItems
  if (cssAlignSelf !== undefined) normalized.alignSelf = cssAlignSelf
  if (cssAlignContent !== undefined) normalized.alignContent = cssAlignContent
  if (cssJustifyContent !== undefined) normalized.justifyContent = cssJustifyContent
  if (cssBackgroundColor !== undefined) normalized.backgroundColor = cssBackgroundColor
  if (cssFontFamily !== undefined) normalized.fontFamily = cssFontFamily
  if (cssFontWeight !== undefined) normalized.fontWeight = cssFontWeight
  if (cssTextAlign !== undefined) normalized.textAlign = cssTextAlign
  if (cssWhiteSpace !== undefined) normalized.whiteSpace = cssWhiteSpace
  if (cssOverflowX !== undefined) normalized.overflowX = cssOverflowX
  if (cssOverflowY !== undefined) normalized.overflowY = cssOverflowY
  if (cssPointerEvents !== undefined) normalized.pointerEvents = cssPointerEvents
  if (cssUserSelect !== undefined) normalized.userSelect = cssUserSelect

  if (style.width !== undefined) normalized.width = normalizeInlineDimension(style.width)
  if (style.height !== undefined) normalized.height = normalizeInlineDimension(style.height)
  if (top !== undefined) normalized.top = normalizeInlineDimension(top)
  if (right !== undefined) normalized.right = normalizeInlineDimension(right)
  if (bottom !== undefined) normalized.bottom = normalizeInlineDimension(bottom)
  if (left !== undefined) normalized.left = normalizeInlineDimension(left)
  if (cssMinWidth !== undefined) normalized.minWidth = normalizeInlineDimension(cssMinWidth)
  else if (style.minWidth !== undefined) normalized.minWidth = normalizeInlineDimension(style.minWidth)
  if (cssMinHeight !== undefined) normalized.minHeight = normalizeInlineDimension(cssMinHeight)
  else if (style.minHeight !== undefined) normalized.minHeight = normalizeInlineDimension(style.minHeight)
  if (cssMaxWidth !== undefined) normalized.maxWidth = normalizeInlineDimension(cssMaxWidth)
  else if (style.maxWidth !== undefined) normalized.maxWidth = normalizeInlineDimension(style.maxWidth)
  if (cssMaxHeight !== undefined) normalized.maxHeight = normalizeInlineDimension(cssMaxHeight)
  else if (style.maxHeight !== undefined) normalized.maxHeight = normalizeInlineDimension(style.maxHeight)

  const parsedGap = normalizeInlineNumericLength(gap)
  const parsedRowGap = normalizeInlineNumericLength(cssRowGap ?? rowGap)
  const parsedColumnGap = normalizeInlineNumericLength(cssColumnGap ?? columnGap)
  if (parsedGap !== undefined) normalized.gap = parsedGap
  if (parsedRowGap !== undefined) normalized.rowGap = parsedRowGap
  if (parsedColumnGap !== undefined) normalized.columnGap = parsedColumnGap

  return normalized
}

function normalizeInlineDimension(value: DimensionValue): DimensionValue {
  const trimmed = String(value).trim()
  if (trimmed === "0") return 0
  const pixel = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/i)
  if (pixel) return Number(pixel[1])
  const rem = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/i)
  if (rem) return Number(rem[1]) * 16
  return value
}

function normalizeInlineNumericLength(value: DimensionValue | undefined): number | undefined {
  if (value === undefined) return undefined
  const normalized = normalizeInlineDimension(value)
  const number = Number(normalized)
  return Number.isFinite(number) ? number : undefined
}

function nativeStyleState(node: HostElementNode): NativeStyleState {
  return styleStates.get(node) ?? {
    class: undefined,
    className: undefined,
    classList: undefined,
    inlineStyle: undefined,
  }
}

function setNativeInlineStyle(node: HostElementNode, style: StyleDesc | undefined): void {
  const state = nativeStyleState(node)
  state.inlineStyle = style
  commitNativeStyleState(node, state)
}

function setNativeClass(node: HostElementNode, className: string | undefined): void {
  const state = nativeStyleState(node)
  state.class = className
  commitNativeStyleState(node, state)
}

function setNativeClassName(node: HostElementNode, className: string | undefined): void {
  const state = nativeStyleState(node)
  state.className = className
  commitNativeStyleState(node, state)
}

function setNativeClassList(node: HostElementNode, classList: NativeClassList | undefined): void {
  const state = nativeStyleState(node)
  state.classList = classList
  commitNativeStyleState(node, state)
}

function commitNativeStyleState(node: HostElementNode, state: NativeStyleState): void {
  styleStates.set(node, state)
  if (hasNativeClasses(state)) classStyledNodes.add(node)
  else classStyledNodes.delete(node)
  reapplyNativeStyleSubtree(node)
}

function hasNativeClasses(state: NativeStyleState): boolean {
  if (state.class?.trim() || state.className?.trim()) return true
  return Boolean(state.classList && Object.values(state.classList).some(Boolean))
}

function reapplyNativeStyleSubtree(node: HostElementNode): void {
  applyNativeStyleState(node)
  for (const child of node.children) {
    if (child.kind === "element") reapplyNativeStyleSubtree(child)
    else applyNativeTextTransform(child)
  }
}

function applyNativeStyleState(node: HostElementNode): void {
  const state = nativeStyleState(node)
  const className = combinedClassName(state)
  const inheritedStyle = resolveInheritedNativeStyle(node)
  const ancestorStyle = resolveAncestorDescendantStyle(node)
  const preClassStyle = mergeNativeStyles(inheritedStyle, ancestorStyle)
  const classStyle = resolveNativeClassStyle(className, state.classList, state.inlineStyle?.fontSize ?? preClassStyle?.fontSize)
  const classAttributeStyle = resolveNativeClassAttributeStyle(className, state.classList, node.props)
  const classParentPosition = resolveNativeClassParentPosition(className, state.classList)
  const classTranslation = resolveNativeClassTranslation(className, state.classList)
  const inheritedTextTransform = resolveInheritedTextTransform(node)
  const classTextTransform = resolveNativeClassTextTransform(className, state.classList)
  const textTransform = classTextTransform ?? inheritedTextTransform
  if (textTransform === undefined) textTransforms.delete(node)
  else textTransforms.set(node, textTransform)
  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle)
  const parentWidth = resolvedNativeNodeSize(node.parent, "x")
  const parentHeight = resolvedNativeNodeSize(node.parent, "y")
  const positionedStyle = applyNativeStyleParentPosition(
    mergedStyle,
    classParentPosition,
    parentWidth,
    parentHeight,
  )
  setHostProperty(
    node,
    "style",
    applyNativeStyleTranslation(positionedStyle, classTranslation) ?? {},
  )
}

function applyNativeTextTransform(node: HostTextNode): void {
  const source = sourceTextValues.get(node) ?? node.text
  const parent = node.parent
  const transform = parent?.kind === "element" ? textTransforms.get(parent) : undefined
  replaceHostText(node, transformText(source, transform))
}

function transformText(value: string, transform: NativeTextTransform | undefined): string {
  switch (transform) {
    case "uppercase": return value.toUpperCase()
    case "lowercase": return value.toLowerCase()
    case "capitalize": return value.replace(/\b\p{L}/gu, (character) => character.toUpperCase())
    case "none":
    case undefined:
      return value
  }
}

function resolvedNativeNodeSize(parent: HostParent | null, axis: "x" | "y"): number | undefined {
  if (!parent || parent.kind === "root") return undefined
  const style = parent.style
  const parentSize = resolvedNativeNodeSize(parent.parent, axis)
  const explicit = axis === "x" ? style.width : style.height
  const explicitSize = resolvedNativeDimension(explicit, parentSize)
  if (explicitSize !== undefined) return explicitSize
  if (parentSize === undefined) return undefined

  const start = resolvedNativePosition(axis === "x" ? style.left : style.top, parentSize)
  const end = resolvedNativePosition(axis === "x" ? style.right : style.bottom, parentSize)
  if (start === undefined || end === undefined) return undefined
  return Math.max(0, parentSize - start - end)
}

function resolvedNativeDimension(value: DimensionValue | undefined, parentSize: number | undefined): number | undefined {
  if (value === undefined) return undefined
  const number = Number(value)
  if (Number.isFinite(number)) return number
  const percentage = String(value).trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))%$/)
  if (percentage && parentSize !== undefined) return parentSize * Number(percentage[1]) / 100
  return undefined
}

function resolvedNativePosition(value: DimensionValue | undefined, parentSize: number): number | undefined {
  if (value === undefined) return undefined
  const number = Number(value)
  if (Number.isFinite(number)) return number
  const percentage = String(value).trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))%$/)
  if (percentage) return parentSize * Number(percentage[1]) / 100
  return undefined
}

function resolveInheritedTextTransform(node: HostElementNode): NativeTextTransform | undefined {
  const parent = node.parent
  if (!parent || parent.kind !== "element") return undefined
  return textTransforms.get(parent)
}

function resolveInheritedNativeStyle(node: HostElementNode): StyleDesc | undefined {
  const parent = node.parent
  if (!parent || parent.kind !== "element" || !parent.style) return undefined
  const source = parent.style
  const inherited: StyleDesc = {}
  if (source.visibility !== undefined) inherited.visibility = source.visibility
  if (source.color !== undefined) inherited.color = source.color
  if (source.fontSize !== undefined) inherited.fontSize = source.fontSize
  if (source.fontFamily !== undefined) inherited.fontFamily = source.fontFamily
  if (source.fontWeight !== undefined) inherited.fontWeight = source.fontWeight
  if (source.textAlign !== undefined) inherited.textAlign = source.textAlign
  if (source.lineHeight !== undefined) inherited.lineHeight = source.lineHeight
  if (source.whiteSpace !== undefined) inherited.whiteSpace = source.whiteSpace
  if (source.cursor !== undefined) inherited.cursor = source.cursor
  if (source.userSelect !== undefined) inherited.userSelect = source.userSelect
  if (source.selectionColor !== undefined) inherited.selectionColor = source.selectionColor
  return Object.keys(inherited).length > 0 ? inherited : undefined
}

function resolveAncestorDescendantStyle(node: HostElementNode): StyleDesc | undefined {
  const ancestors: HostElementNode[] = []
  let parent: HostParent | null = node.parent
  while (parent && parent.kind === "element") {
    ancestors.unshift(parent)
    parent = parent.parent
  }

  const tagName = semanticTags.get(node) ?? node.type
  const directParent = node.parent
  const directChildIndex = directParent?.kind === "element"
    ? directParent.children.filter((child) => child.kind === "element").indexOf(node) + 1
    : undefined
  let resolved: StyleDesc | undefined
  for (const ancestor of ancestors) {
    const state = styleStates.get(ancestor)
    if (!state || !hasNativeClasses(state)) continue
    resolved = mergeNativeStyles(
      resolved,
      resolveNativeDescendantClassStyle(
        combinedClassName(state),
        state.classList,
        tagName,
        directParent === ancestor,
        directParent === ancestor ? directChildIndex : undefined,
      ),
    )
  }
  return resolved
}

function combinedClassName(state: NativeStyleState): string | undefined {
  return [state.class, state.className].filter(Boolean).join(" ") || undefined
}
