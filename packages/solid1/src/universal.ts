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
} from "./host/nodes.js"
import type { ElementType, StyleDesc } from "./host/types.js"
import {
  mergeNativeStyles,
  onNativeStyleEnvironmentChange,
  resolveNativeClassStyle,
  type NativeClassList,
} from "./native-style.js"

interface NativeStyleState {
  class: string | undefined
  className: string | undefined
  classList: NativeClassList | undefined
  inlineStyle: StyleDesc | undefined
}

type SvgAttributeValue = string

const styleStates = new WeakMap<HostElementNode, NativeStyleState>()
const classStyledNodes = new Set<HostElementNode>()
const semanticTags = new WeakMap<HostElementNode, string>()
const svgAttributes = new WeakMap<HostElementNode, Map<string, SvgAttributeValue>>()

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
])

const DIV_SEMANTIC_TAGS = new Set([
  "button",
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
])

const SVG_CHILD_TAGS = new Set([
  "path",
  "g",
  "defs",
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
    applyNativeStyleState(node)
  }
})

const runtime = createRenderer<HostNode | HostParent>({
  createElement(tagName) {
    const type = nativeElementType(tagName)
    const node = createHostElement(type)
    if (type !== tagName || tagName === "svg") semanticTags.set(node, tagName)
    return node
  },
  createTextNode(value) {
    return createHostText(value)
  },
  replaceText(node, value) {
    if (!isHostTextNode(node)) throw new TypeError("Expected GPUIX text node")
    replaceHostText(node, value)
    refreshInlineSvgFromParent(node.parent)
  },
  setProperty(node, name, value, previous) {
    if (node.kind === "root") return
    if (node.kind === "element") {
      const semanticTag = semanticTags.get(node)
      if (semanticTag && isSvgMarkupTag(semanticTag)) {
        if (semanticTag !== "svg") {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
        if (isSvgMarkupAttribute(name)) {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
      }

      if (name === "style") {
        setHostProperty(node, name, value, previous)
        setNativeInlineStyle(node, node.style)
        return
      }
      if (name === "class") {
        setNativeClass(node, parseNativeClassName(value))
        return
      }
      if (name === "className") {
        setNativeClassName(node, parseNativeClassName(value))
        return
      }
      if (name === "classList") {
        setNativeClassList(node, parseNativeClassList(value))
        return
      }
    }
    setHostProperty(node, name, value, previous)
  },
  insertNode(parent, node, anchor) {
    if (parent.kind === "text" || node.kind === "root") {
      throw new TypeError("Expected a GPUIX parent and child host node")
    }
    if (anchor?.kind === "root") throw new TypeError("Expected a GPUIX host node anchor")
    insertHostNode(parent, node, anchor ?? null)
    refreshInlineSvgFromParent(parent)
  },
  isTextNode(node) {
    return node.kind === "text"
  },
  removeNode(parent, node) {
    if (parent.kind === "text" || node.kind === "root") {
      throw new TypeError("Expected a GPUIX parent and child host node")
    }
    const svgRoot = inlineSvgRoot(parent)
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
  let current: HostElementNode | undefined = node
  for (;;) {
    if (semanticTags.get(current) === "svg") return current
    const parent = current.parent
    if (!parent || parent.kind === "root") return undefined
    current = parent
  }
}

function serializeSvgElement(node: HostElementNode, root: boolean): string {
  const tagName = semanticTags.get(node)
  if (!tagName || !isSvgMarkupTag(tagName)) return ""

  const attributes = new Map(svgAttributes.get(node) ?? [])
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
  applyNativeStyleState(node)
}

function hasNativeClasses(state: NativeStyleState): boolean {
  if (state.class?.trim() || state.className?.trim()) return true
  return Boolean(state.classList && Object.values(state.classList).some(Boolean))
}

function applyNativeStyleState(node: HostElementNode): void {
  const state = styleStates.get(node)
  if (!state) return
  const className = [state.class, state.className].filter(Boolean).join(" ") || undefined
  const classStyle = resolveNativeClassStyle(className, state.classList)
  setHostProperty(node, "style", mergeNativeStyles(classStyle, state.inlineStyle) ?? {})
}
