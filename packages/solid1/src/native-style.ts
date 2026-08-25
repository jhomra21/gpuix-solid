import type { StyleDesc } from "./host/types.js"

export type NativeColorMode = "light" | "dark"
export type NativeClassList = Record<string, boolean | null | undefined>

export interface NativeStyleVariant {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
}

export interface NativeStyleManifestEntry extends NativeStyleVariant {
  descendants?: Record<string, NativeStyleVariant>
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
  return mergeNativeStyles(variant.base, themed)
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

function notifyEnvironmentChange(): void {
  for (const listener of environmentListeners) listener()
}
