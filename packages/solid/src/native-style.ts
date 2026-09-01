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
  return () => environmentListeners.delete(listener)
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
    if (directChild) resolved = mergeNativeStyles(resolved, resolveVariant(descendants[`>${tagName}`]))
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
  if (!manifest) throw new Error("Native class styling requires configureNativeStyleManifest() before render")
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
  for (const [classNames, enabled] of Object.entries(classList)) {
    if (enabled) candidates.push(...classNames.split(/\s+/).filter(Boolean))
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
  if (result.boxShadow) result.boxShadow = { ...result.boxShadow, color: normalizePublishedNativeColor(result.boxShadow.color) }
  if (result.hover) result.hover = normalizeNestedColors(result.hover)
  if (result.active) result.active = normalizeNestedColors(result.active)
  return result
}

function normalizeNestedColors(style: Omit<StyleDesc, "hover" | "active">): Omit<StyleDesc, "hover" | "active"> {
  const normalized = normalizePublishedNativeColors(style)
  if (!normalized) return style
  const { hover: _hover, active: _active, ...nested } = normalized
  return nested
}

function normalizePublishedNativeColor(value: string): string {
  const trimmed = value.trim()
  const oklch = parseOklch(trimmed)
  if (oklch) {
    const [red, green, blue] = oklchToSrgb(oklch.lightness, oklch.chroma, oklch.hue)
    return formatSrgbColor(red, green, blue, oklch.alpha)
  }
  const hsl = parseHsl(trimmed)
  if (hsl) {
    const [red, green, blue] = hslToSrgb(hsl.hue, hsl.saturation, hsl.lightness)
    return formatSrgbColor(red, green, blue, hsl.alpha)
  }
  const rgb = parseRgb(trimmed)
  if (!rgb) return value
  return formatSrgbColor(rgb.red, rgb.green, rgb.blue, rgb.alpha)
}

interface ParsedOklch { lightness: number; chroma: number; hue: number; alpha: number }
interface ParsedHsl { hue: number; saturation: number; lightness: number; alpha: number }
interface ParsedRgb { red: number; green: number; blue: number; alpha: number }

function parseOklch(value: string): ParsedOklch | undefined {
  const match = value.match(/^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/i)
  if (!match) return undefined
  const lightness = percentageOrNumber(match[1], 1)
  const chroma = percentageOrNumber(match[2], 0.4)
  const hue = hueDegrees(match[3])
  const alpha = match[4] === undefined ? 1 : percentageOrNumber(match[4], 1)
  if (![lightness, chroma, hue, alpha].every(Number.isFinite)) return undefined
  return { lightness: clamp(lightness, 0, 1), chroma: Math.max(0, chroma), hue, alpha: clamp(alpha, 0, 1) }
}

function parseHsl(value: string): ParsedHsl | undefined {
  const match = value.match(/^hsla?\(\s*(.*?)\s*\)$/i)
  if (!match?.[1]) return undefined
  const parts = functionalColorParts(match[1])
  if (parts.length < 3 || parts.length > 4) return undefined
  const hue = hueDegrees(parts[0])
  const saturation = percentageOrNumber(parts[1], 1)
  const lightness = percentageOrNumber(parts[2], 1)
  const alpha = parts[3] === undefined ? 1 : percentageOrNumber(parts[3], 1)
  if (![hue, saturation, lightness, alpha].every(Number.isFinite)) return undefined
  return { hue, saturation: clamp(saturation, 0, 1), lightness: clamp(lightness, 0, 1), alpha: clamp(alpha, 0, 1) }
}

function parseRgb(value: string): ParsedRgb | undefined {
  const match = value.match(/^rgba?\(\s*(.*?)\s*\)$/i)
  if (!match?.[1]) return undefined
  const parts = functionalColorParts(match[1])
  if (parts.length < 3 || parts.length > 4) return undefined
  const red = rgbChannelValue(parts[0])
  const green = rgbChannelValue(parts[1])
  const blue = rgbChannelValue(parts[2])
  const alpha = parts[3] === undefined ? 1 : percentageOrNumber(parts[3], 1)
  if (![red, green, blue, alpha].every(Number.isFinite)) return undefined
  return { red: Math.round(clamp(red, 0, 255)), green: Math.round(clamp(green, 0, 255)), blue: Math.round(clamp(blue, 0, 255)), alpha: clamp(alpha, 0, 1) }
}

function functionalColorParts(value: string): string[] {
  return value.replace(/\s*\/\s*/g, " ").replaceAll(",", " ").trim().split(/\s+/)
}

function rgbChannelValue(value: string | undefined): number {
  if (value === undefined) return Number.NaN
  if (value.endsWith("%")) return Number(value.slice(0, -1)) * 255 / 100
  return Number(value)
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

function hslToSrgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const normalizedHue = ((hue % 360) + 360) % 360 / 360
  if (saturation <= 0) {
    const gray = Math.round(lightness * 255)
    return [gray, gray, gray]
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q
  return [
    Math.round(hueToSrgbChannel(p, q, normalizedHue + 1 / 3) * 255),
    Math.round(hueToSrgbChannel(p, q, normalizedHue) * 255),
    Math.round(hueToSrgbChannel(p, q, normalizedHue - 1 / 3) * 255),
  ]
}

function hueToSrgbChannel(p: number, q: number, hue: number): number {
  let normalized = hue
  if (normalized < 0) normalized += 1
  if (normalized > 1) normalized -= 1
  if (normalized < 1 / 6) return p + (q - p) * 6 * normalized
  if (normalized < 1 / 2) return q
  if (normalized < 2 / 3) return p + (q - p) * (2 / 3 - normalized) * 6
  return p
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
  return [srgbChannel(linearRed), srgbChannel(linearGreen), srgbChannel(linearBlue)]
}

function srgbChannel(linear: number): number {
  const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.max(0, linear) ** (1 / 2.4) - 0.055
  return Math.round(clamp(encoded, 0, 1) * 255)
}

function formatSrgbColor(red: number, green: number, blue: number, alpha: number): string {
  if (alpha >= 0.999999) return rgbHex(red, green, blue)
  return `rgba(${red}, ${green}, ${blue}, ${formatAlpha(alpha)})`
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
