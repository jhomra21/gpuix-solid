import type { StyleDesc } from "./host/types.js"

export type NativeColorMode = "light" | "dark"
export type NativeClassList = Record<string, boolean | null | undefined>
export type NativeTextTransform = "uppercase" | "lowercase" | "capitalize" | "none"

export interface NativeStyleVariant {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
}

export interface NativeStyleManifestEntry extends NativeStyleVariant {
  descendants?: Record<string, NativeStyleVariant>
  textTransform?: NativeTextTransform
}

export interface NativeStyleManifest {
  classes: Record<string, NativeStyleManifestEntry>
}

let manifest: NativeStyleManifest | undefined
let colorMode: NativeColorMode = "dark"
const environmentListeners = new Set<() => void>()

export function configureNativeStyleManifest(nextManifest: NativeStyleManifest): void {
  manifest = nextManifest
  notifyEnvironmentChange()
}

export function clearNativeStyleManifest(): void {
  manifest = undefined
  notifyEnvironmentChange()
}

export function getNativeStyleColorMode(): NativeColorMode {
  return colorMode
}

export function setNativeStyleColorMode(nextMode: NativeColorMode): void {
  if (colorMode === nextMode) return
  colorMode = nextMode
  notifyEnvironmentChange()
}

export function onNativeStyleEnvironmentChange(listener: () => void): () => void {
  environmentListeners.add(listener)
  return () => {
    environmentListeners.delete(listener)
  }
}

export function resolveNativeClassStyle(
  className: string | undefined,
  classList: NativeClassList | undefined,
): StyleDesc | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: StyleDesc | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    resolved = mergeNativeStyles(resolved, resolveVariant(entry))
  }
  return resolved
}

export function resolveNativeClassTextTransform(
  className: string | undefined,
  classList: NativeClassList | undefined,
): NativeTextTransform | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: NativeTextTransform | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    if (entry.textTransform !== undefined) resolved = entry.textTransform
  }
  return resolved
}

export function resolveNativeDescendantClassStyle(
  className: string | undefined,
  classList: NativeClassList | undefined,
  tagName: string,
  directChild: boolean,
): StyleDesc | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: StyleDesc | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    const descendants = entry.descendants
    if (!descendants) continue
    resolved = mergeNativeStyles(resolved, resolveVariant(descendants[tagName]))
    if (directChild) {
      resolved = mergeNativeStyles(resolved, resolveVariant(descendants[`>${tagName}`]))
    }
  }
  return resolved
}

export function mergeNativeStyles(...styles: Array<StyleDesc | undefined>): StyleDesc | undefined {
  let result: StyleDesc | undefined
  for (const style of styles) {
    if (!style) continue
    result = mergeStylePair(result, style)
  }
  return result
}

function requireManifest(): NativeStyleManifest {
  if (!manifest) {
    throw new Error("Native class styling requires configureNativeStyleManifest() before render")
  }
  return manifest
}

function missingCandidate(candidate: string): Error {
  return new Error(`Native style manifest is missing Tailwind candidate ${JSON.stringify(candidate)}`)
}

function resolveVariant(variant: NativeStyleVariant | undefined): StyleDesc | undefined {
  if (!variant) return undefined
  const themed = colorMode === "dark" ? variant.dark : variant.light
  return normalizePublishedNativeColors(mergeNativeStyles(variant.base, themed))
}

function classCandidates(className: string | undefined, classList: NativeClassList | undefined): string[] {
  const candidates = className?.split(/\s+/).filter(Boolean) ?? []
  if (!classList) return candidates
  for (const [candidate, enabled] of Object.entries(classList)) {
    if (enabled) candidates.push(candidate)
  }
  return candidates
}

function mergeStylePair(base: StyleDesc | undefined, override: StyleDesc): StyleDesc {
  const hover = mergeNestedState(base?.hover, override.hover)
  const active = mergeNestedState(base?.active, override.active)
  const result: StyleDesc = { ...base, ...override }
  if (hover) result.hover = hover
  else delete result.hover
  if (active) result.active = active
  else delete result.active
  return result
}

function mergeNestedState(
  base: Omit<StyleDesc, "hover" | "active"> | undefined,
  override: Omit<StyleDesc, "hover" | "active"> | undefined,
): Omit<StyleDesc, "hover" | "active"> | undefined {
  if (!base) return override
  if (!override) return base
  return { ...base, ...override }
}

function normalizePublishedNativeColors(style: StyleDesc | undefined): StyleDesc | undefined {
  if (!style) return undefined
  const result: StyleDesc = { ...style }
  for (const key of ["background", "backgroundColor", "color", "borderColor", "selectionColor"] as const) {
    const value = result[key]
    if (value !== undefined) result[key] = normalizePublishedNativeColor(value)
  }
  if (result.boxShadow) {
    result.boxShadow = {
      ...result.boxShadow,
      color: normalizePublishedNativeColor(result.boxShadow.color),
    }
  }
  if (result.hover) result.hover = normalizeNestedColors(result.hover)
  if (result.active) result.active = normalizeNestedColors(result.active)
  return result
}

function normalizeNestedColors(
  style: Omit<StyleDesc, "hover" | "active">,
): Omit<StyleDesc, "hover" | "active"> {
  const normalized = normalizePublishedNativeColors(style)
  if (!normalized) return style
  const { hover: _hover, active: _active, ...nested } = normalized
  return nested
}

function normalizePublishedNativeColor(value: string): string {
  const parsed = parseOklch(value.trim())
  if (!parsed) return value
  const [red, green, blue] = oklchToSrgb(parsed.lightness, parsed.chroma, parsed.hue)
  if (parsed.alpha >= 0.999999) return rgbHex(red, green, blue)
  return `rgba(${red}, ${green}, ${blue}, ${formatAlpha(parsed.alpha)})`
}

interface ParsedOklch {
  lightness: number
  chroma: number
  hue: number
  alpha: number
}

function parseOklch(value: string): ParsedOklch | undefined {
  const match = value.match(
    /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/i,
  )
  if (!match) return undefined
  const lightness = percentageOrNumber(match[1], 1)
  const chroma = percentageOrNumber(match[2], 0.4)
  const hue = hueDegrees(match[3])
  const alpha = match[4] === undefined ? 1 : percentageOrNumber(match[4], 1)
  if (![lightness, chroma, hue, alpha].every(Number.isFinite)) return undefined
  return {
    lightness: clamp(lightness, 0, 1),
    chroma: Math.max(0, chroma),
    hue,
    alpha: clamp(alpha, 0, 1),
  }
}

function percentageOrNumber(value: string | undefined, percentageScale: number): number {
  if (value === undefined) return Number.NaN
  if (value.endsWith("%")) return Number(value.slice(0, -1)) * percentageScale / 100
  return Number(value)
}

function hueDegrees(value: string | undefined): number {
  if (value === undefined || value.toLowerCase() === "none") return 0
  const match = value.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(deg|grad|rad|turn)?$/i)
  if (!match) return Number.NaN
  const amount = Number(match[1])
  switch (match[2]?.toLowerCase()) {
    case "grad": return amount * 0.9
    case "rad": return amount * 180 / Math.PI
    case "turn": return amount * 360
    default: return amount
  }
}

function oklchToSrgb(lightness: number, chroma: number, hue: number): [number, number, number] {
  const radians = hue * Math.PI / 180
  const a = chroma * Math.cos(radians)
  const b = chroma * Math.sin(radians)
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b
  const l = lRoot ** 3
  const m = mRoot ** 3
  const s = sRoot ** 3
  const linearRed = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const linearGreen = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const linearBlue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  return [
    srgbChannel(linearRed),
    srgbChannel(linearGreen),
    srgbChannel(linearBlue),
  ]
}

function srgbChannel(linear: number): number {
  const encoded = linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.max(0, linear) ** (1 / 2.4) - 0.055
  return Math.round(clamp(encoded, 0, 1) * 255)
}

function rgbHex(red: number, green: number, blue: number): string {
  return `#${hexChannel(red)}${hexChannel(green)}${hexChannel(blue)}`
}

function hexChannel(value: number): string {
  return value.toString(16).padStart(2, "0")
}

function formatAlpha(value: number): string {
  return String(Math.round(value * 10000) / 10000)
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function notifyEnvironmentChange(): void {
  for (const listener of environmentListeners) listener()
}
