import type { StyleDesc } from "./host/types.js"

export type NativeColorMode = "light" | "dark"
export type NativeClassList = Record<string, boolean | null | undefined>

export interface NativeStyleManifestEntry {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
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
  if (!manifest) {
    throw new Error("Native class styling requires configureNativeStyleManifest() before render")
  }

  let resolved: StyleDesc | undefined
  for (const candidate of candidates) {
    const entry = manifest.classes[candidate]
    if (!entry) throw new Error(`Native style manifest is missing Tailwind candidate ${JSON.stringify(candidate)}`)
    const themed = colorMode === "dark" ? entry.dark : entry.light
    resolved = mergeNativeStyles(resolved, entry.base, themed)
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
