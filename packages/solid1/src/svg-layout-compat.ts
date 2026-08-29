import { setHostProperty, type HostElementNode, type HostNode, type HostRootNode } from "./host/nodes.js"
import type { DimensionValue, StyleDesc } from "./host/types.js"

interface SvgViewBox {
  width: number
  height: number
}

/**
 * GPUI's native SVG leaf needs layout dimensions before paint. Browser inline
 * SVGs may instead get their size from width/height attributes or a viewBox,
 * so mirror those dimensions into the native style when CSS did not already
 * size the element.
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
  const source = String(sourceValue)
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

  const needsWidth = node.style.width === undefined && width !== undefined
  const needsHeight = node.style.height === undefined && height !== undefined
  if (!needsWidth && !needsHeight) return

  const nativeStyle: StyleDesc = { ...node.style }
  if (needsWidth) nativeStyle.width = width
  if (needsHeight) nativeStyle.height = height
  setHostProperty(node, "style", nativeStyle)
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
