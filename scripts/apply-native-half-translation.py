from pathlib import Path


def replace_required(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if old not in text:
        raise SystemExit(f"{path}: missing {label}")
    path.write_text(text.replace(old, new, 1))


for package in ("solid", "solid1"):
    native_style = Path(f"packages/{package}/src/native-style.ts")
    text = native_style.read_text()
    variant = '''export interface NativeStyleVariant {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
}
'''
    translation = '''export interface NativeStyleVariant {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
}

/** Fractional visual translation resolved against the element's own native size. */
export interface NativeStyleTranslation {
  xFraction?: number
  yFraction?: number
}
'''
    if "export interface NativeStyleTranslation" not in text:
        if variant not in text:
            raise SystemExit(f"{native_style}: NativeStyleVariant anchor missing")
        text = text.replace(variant, translation, 1)

    entry_anchor = "export interface NativeStyleManifestEntry extends NativeStyleVariant {\n"
    if "  translation?: NativeStyleTranslation\n" not in text:
        if entry_anchor not in text:
            raise SystemExit(f"{native_style}: manifest entry anchor missing")
        text = text.replace(entry_anchor, entry_anchor + "  translation?: NativeStyleTranslation\n", 1)

    text_transform_anchor = "export function resolveNativeClassTextTransform(\n"
    resolver = '''export function resolveNativeClassTranslation(
  className: string | undefined,
  classList: NativeClassList | undefined,
): NativeStyleTranslation | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: NativeStyleTranslation | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    if (!entry.translation) continue
    resolved = { ...resolved, ...entry.translation }
  }
  return resolved
}

export function applyNativeStyleTranslation(
  style: StyleDesc | undefined,
  translation: NativeStyleTranslation | undefined,
): StyleDesc | undefined {
  if (!style || !translation) return style
  const result: StyleDesc = { ...style }
  if (translation.xFraction !== undefined && typeof result.width === "number") {
    result.marginLeft = (result.marginLeft ?? 0) + result.width * translation.xFraction
  }
  if (translation.yFraction !== undefined && typeof result.height === "number") {
    result.marginTop = (result.marginTop ?? 0) + result.height * translation.yFraction
  }
  return result
}

'''
    if "export function resolveNativeClassTranslation" not in text:
        if text_transform_anchor not in text:
            raise SystemExit(f"{native_style}: text transform resolver anchor missing")
        text = text.replace(text_transform_anchor, resolver + text_transform_anchor, 1)
    native_style.write_text(text)

    index = Path(f"packages/{package}/src/index.ts")
    text = index.read_text()
    if "  applyNativeStyleTranslation,\n" not in text:
        anchor = "  clearNativeStyleManifest,\n"
        if anchor not in text:
            raise SystemExit(f"{index}: style export anchor missing")
        text = text.replace(anchor, "  applyNativeStyleTranslation,\n" + anchor, 1)
    if "  resolveNativeClassTranslation,\n" not in text:
        anchor = "  resolveNativeClassStyle,\n"
        if anchor not in text:
            raise SystemExit(f"{index}: class style export anchor missing")
        text = text.replace(anchor, anchor + "  resolveNativeClassTranslation,\n", 1)
    if "  NativeStyleTranslation,\n" not in text:
        anchor = "  NativeStyleManifestEntry,\n"
        if anchor not in text:
            raise SystemExit(f"{index}: style type export anchor missing")
        text = text.replace(anchor, anchor + "  NativeStyleTranslation,\n", 1)
    index.write_text(text)

universal = Path("packages/solid1/src/universal.ts")
text = universal.read_text()
if "  applyNativeStyleTranslation,\n" not in text:
    anchor = "import {\n  mergeNativeStyles,\n"
    if anchor not in text:
        raise SystemExit("solid1 universal: import anchor missing")
    text = text.replace(anchor, "import {\n  applyNativeStyleTranslation,\n  mergeNativeStyles,\n", 1)
if "  resolveNativeClassTranslation,\n" not in text:
    anchor = "  resolveNativeClassStyle,\n"
    if anchor not in text:
        raise SystemExit("solid1 universal: class style import anchor missing")
    text = text.replace(anchor, anchor + "  resolveNativeClassTranslation,\n", 1)
old_apply = '''  const classStyle = resolveNativeClassStyle(className, state.classList)
  const inheritedTextTransform = resolveInheritedTextTransform(node)
'''
new_apply = '''  const classStyle = resolveNativeClassStyle(className, state.classList)
  const classTranslation = resolveNativeClassTranslation(className, state.classList)
  const inheritedTextTransform = resolveInheritedTextTransform(node)
'''
if new_apply not in text:
    if old_apply not in text:
        raise SystemExit("solid1 universal: class style application anchor missing")
    text = text.replace(old_apply, new_apply, 1)
old_set = '''  setHostProperty(
    node,
    "style",
    mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle) ?? {},
  )
'''
new_set = '''  const mergedStyle = mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle)
  setHostProperty(
    node,
    "style",
    applyNativeStyleTranslation(mergedStyle, classTranslation) ?? {},
  )
'''
if new_set not in text:
    if old_set not in text:
        raise SystemExit("solid1 universal: merged style set anchor missing")
    text = text.replace(old_set, new_set, 1)
universal.write_text(text)

generator = Path("examples/solid1-daw/scripts/generate-native-tailwind.mjs")
text = generator.read_text()
old_entries = '''  ["right-1/2", { base: { right: 2 } }],
  ["translate-x-1/2", { base: {} }],
  // Bottom-panel resize handle is 16px tall and its center rail is 4px tall.
  // CSS top:50% + translateY(-50%) therefore lands at top:6px exactly.
  ["top-1/2", { base: { top: 6 } }],
  ["-translate-y-1/2", { base: {} }],
'''
new_entries = '''  ["right-1/2", { base: { right: 2 } }],
  ["translate-x-1/2", { base: {}, translation: { xFraction: 0.5 } }],
  ["-translate-x-1/2", { base: {}, translation: { xFraction: -0.5 } }],
  // Bottom-panel resize handle is 16px tall and its center rail is 4px tall.
  // CSS top:50% + translateY(-50%) therefore lands at top:6px exactly.
  ["top-1/2", { base: { top: 6 } }],
  ["translate-y-1/2", { base: {}, translation: { yFraction: 0.5 } }],
  ["-translate-y-1/2", { base: {}, translation: { yFraction: -0.5 } }],
'''
if new_entries not in text:
    if old_entries not in text:
        raise SystemExit("DAW generator: half translation compatibility anchor missing")
    text = text.replace(old_entries, new_entries, 1)
generator.write_text(text)

parity = Path("packages/solid1/scripts/check-host-parity.ts")
text = parity.read_text()
if "  applyNativeStyleTranslation,\n" not in text:
    anchor = "  clearNativeStyleManifest,\n"
    if anchor not in text:
        raise SystemExit("solid1 parity: clear style import anchor missing")
    text = text.replace(anchor, "  applyNativeStyleTranslation,\n" + anchor, 1)
if "  resolveNativeClassTranslation,\n" not in text:
    anchor = "  resolveNativeClassStyle,\n"
    if anchor not in text:
        raise SystemExit("solid1 parity: class style import anchor missing")
    text = text.replace(anchor, anchor + "  resolveNativeClassTranslation,\n", 1)
probe_anchor = 'if (selectorButton.dataset.trackId !== "track-7") throw new Error("dataset must expose data-* properties")\n'
probe = '''if (selectorButton.dataset.trackId !== "track-7") throw new Error("dataset must expose data-* properties")

configureNativeStyleManifest({
  classes: {
    "-translate-x-1/2": { translation: { xFraction: -0.5 } },
    "translate-y-1/2": { translation: { yFraction: 0.5 } },
  },
})
const translation = resolveNativeClassTranslation("-translate-x-1/2 translate-y-1/2", undefined)
const translatedStyle = applyNativeStyleTranslation({ width: 16, height: 12 }, translation)
clearNativeStyleManifest()
if (translatedStyle?.marginLeft !== -8 || translatedStyle.marginTop !== 6) {
  throw new Error(`fractional native translation must resolve against final own size: ${JSON.stringify(translatedStyle)}`)
}
'''
if "fractional native translation must resolve against final own size" not in text:
    if probe_anchor not in text:
        raise SystemExit("solid1 parity: dataset probe anchor missing")
    text = text.replace(probe_anchor, probe, 1)
parity.write_text(text)
