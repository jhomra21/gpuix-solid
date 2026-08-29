import {
  setHostProperty,
  type HostElementNode,
  type HostNode,
  type HostParent,
  type HostRootNode,
} from "./host/nodes.js"
import type { DimensionValue, StyleDesc } from "./host/types.js"

interface SvgViewBox {
  width: number
  height: number
}

interface SvgPresentationStyle {
  fill?: string
  stroke?: string
  strokeWidth?: string | number
  "stroke-width"?: string | number
}

interface SvgSourceState {
  base: string
  rendered: string
}

type SvgPresentationProperty = "fill" | "stroke" | "stroke-width"

const svgSourceStates = new WeakMap<HostElementNode, SvgSourceState>()

/**
 * GPUI's native SVG leaf needs layout dimensions before paint. Browser inline
 * SVGs may instead get their size from width/height attributes or a viewBox,
 * so mirror those dimensions into the native style when CSS did not already
 * size the element. SVG presentation properties inherited from an HTML wrapper
 * are also copied onto the serialized SVG root because the native SVG source
 * no longer has that wrapper in its markup tree.
 */
export function syncNativeSvgLayoutCompatibility(root: HostRootNode): void {
  for (const child of root.children) syncSvgNode(child)
}

function syncSvgNode(node: HostNode): void {
  if (node.kind === "text") return
  if (node.type === "svg") syncSvgLayout(node)
  for (const child of node.children) syncSvgNode(child)
}

function syncSvgLayout(node: HostElementNode): void {
  const sourceValue = node.props.get("source")
  if (sourceValue == null) return
  const source = syncSvgSourcePresentation(node, String(sourceValue))

  const viewBox = parseViewBox(attribute(source, "viewBox"))
  let width = parseDimension(attribute(source, "width"))
  let height = parseDimension(attribute(source, "height"))

  if (width === undefined && height === undefined && viewBox) {
    width = viewBox.width
    height = viewBox.height
  } else if (viewBox) {
    if (width !== undefined && height === undefined) {
      const numericWidth = Number(width)
      if (Number.isFinite(numericWidth) && viewBox.width > 0) {
        height = numericWidth * viewBox.height / viewBox.width
      }
    } else if (height !== undefined && width === undefined) {
      const numericHeight = Number(height)
      if (Number.isFinite(numericHeight) && viewBox.height > 0) {
        width = numericHeight * viewBox.width / viewBox.height
      }
    }
  }

  const nativeStyle: StyleDesc = { ...node.style }
  let changed = false
  if (node.style.width === undefined && width !== undefined) {
    nativeStyle.width = width
    changed = true
  }
  if (node.style.height === undefined && height !== undefined) {
    nativeStyle.height = height
    changed = true
  }
  if (changed) setHostProperty(node, "style", nativeStyle)
}

function syncSvgSourcePresentation(node: HostElementNode, currentSource: string): string {
  const previous = svgSourceStates.get(node)
  const base = previous && currentSource === previous.rendered ? previous.base : currentSource
  const rendered = withInheritedPresentation(node, base)
  svgSourceStates.set(node, { base, rendered })

  if (rendered !== currentSource) {
    setHostProperty(node, "source", rendered)
    setHostProperty(node, "src", `data:image/svg+xml,${encodeURIComponent(rendered)}`)
  }
  return rendered
}

function withInheritedPresentation(node: HostElementNode, source: string): string {
  let result = source
  for (const property of ["fill", "stroke", "stroke-width"] as const) {
    if (attribute(result, property) !== undefined) continue
    const value = inheritedPresentationValue(node, property)
    if (value !== undefined) result = addRootAttribute(result, property, value)
  }
  return result
}

function inheritedPresentationValue(
  node: HostElementNode,
  property: SvgPresentationProperty,
): string | undefined {
  let current: HostElementNode | null = node
  while (current) {
    const style = svgPresentationStyle(current)
    const direct = directPresentationValue(style, property)
    if (direct !== undefined && direct !== "") return String(direct)
    const custom = current.style.getPropertyValue(property)
    if (custom) return custom
    const parent: HostParent | null = current.parent
    current = parent && parent.kind === "element" ? parent : null
  }
  return undefined
}

function directPresentationValue(
  style: SvgPresentationStyle,
  property: SvgPresentationProperty,
): string | number | undefined {
  switch (property) {
    case "fill": return style.fill
    case "stroke": return style.stroke
    case "stroke-width": return style.strokeWidth ?? style["stroke-width"]
  }
}

function svgPresentationStyle(node: HostElementNode): SvgPresentationStyle {
  // SAFETY: the browser-style bridge can carry CSS SVG presentation keys that are valid upstream CSS but intentionally absent from GPUIX's native StyleDesc.
  return node.style as StyleDesc & SvgPresentationStyle
}

function addRootAttribute(source: string, name: string, value: string): string {
  return source.replace(/^<svg(?=\s|>)/, `<svg ${name}="${escapeXmlAttribute(value)}"`)
}

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function attribute(source: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}="([^"]+)"`).exec(source)
  return match?.[1]
}

function parseDimension(value: string | undefined): DimensionValue | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(trimmed)) return Number(trimmed)
  const pixel = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/i.exec(trimmed)
  if (pixel?.[1] !== undefined) return Number(pixel[1])
  const rem = /^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/i.exec(trimmed)
  if (rem?.[1] !== undefined) return Number(rem[1]) * 16
  return trimmed
}

function parseViewBox(value: string | undefined): SvgViewBox | undefined {
  if (value === undefined) return undefined
  const parts = value.trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return undefined
  const width = parts[2]
  const height = parts[3]
  if (width === undefined || height === undefined || width <= 0 || height <= 0) return undefined
  return { width, height }
}
