from pathlib import Path


for package in ("solid", "solid1"):
    types = Path(f"packages/{package}/src/host/types.ts")
    text = types.read_text()
    old = '''  position?: string
  top?: number
  right?: number
  bottom?: number
  left?: number
'''
    new = '''  position?: string
  top?: DimensionValue
  right?: DimensionValue
  bottom?: DimensionValue
  left?: DimensionValue
'''
    if new not in text:
        if old not in text:
            raise SystemExit(f"{types}: position type anchor missing")
        text = text.replace(old, new, 1)
    types.write_text(text)

    native_style = Path(f"packages/{package}/src/native-style.ts")
    text = native_style.read_text()
    old_import = 'import type { LinearGradientBackground, StyleDesc } from "./host/types.js"\n'
    new_import = 'import type { DimensionValue, LinearGradientBackground, StyleDesc } from "./host/types.js"\n'
    if new_import not in text:
        if old_import not in text:
            raise SystemExit(f"{native_style}: import anchor missing")
        text = text.replace(old_import, new_import, 1)

    translation_interface = '''export interface NativeStyleTranslation {
  xFraction?: number
  yFraction?: number
}
'''
    position_interface = '''export interface NativeStyleTranslation {
  xFraction?: number
  yFraction?: number
}

/** Parent-relative offsets used by percentage positioning utilities such as left-1/2. */
export interface NativeStyleParentPosition {
  leftFraction?: number
  rightFraction?: number
  topFraction?: number
  bottomFraction?: number
}
'''
    if "export interface NativeStyleParentPosition" not in text:
        if translation_interface not in text:
            raise SystemExit(f"{native_style}: translation interface anchor missing")
        text = text.replace(translation_interface, position_interface, 1)

    entry_anchor = "  translation?: NativeStyleTranslation\n"
    if "  parentPosition?: NativeStyleParentPosition\n" not in text:
        if entry_anchor not in text:
            raise SystemExit(f"{native_style}: manifest translation entry missing")
        text = text.replace(entry_anchor, entry_anchor + "  parentPosition?: NativeStyleParentPosition\n", 1)

    resolver_anchor = "export function resolveNativeClassTranslation(\n"
    resolver = '''export function resolveNativeClassParentPosition(
  className: string | undefined,
  classList: NativeClassList | undefined,
): NativeStyleParentPosition | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: NativeStyleParentPosition | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    if (!entry.parentPosition) continue
    resolved = { ...resolved, ...entry.parentPosition }
  }
  return resolved
}

export function applyNativeStyleParentPosition(
  style: StyleDesc | undefined,
  position: NativeStyleParentPosition | undefined,
  parentWidth: number | undefined,
  parentHeight: number | undefined,
): StyleDesc | undefined {
  if (!style) return style
  const result: StyleDesc = { ...style }

  result.left = resolveRelativePosition(result.left, position?.leftFraction, parentWidth)
  result.right = resolveRelativePosition(result.right, position?.rightFraction, parentWidth)
  result.top = resolveRelativePosition(result.top, position?.topFraction, parentHeight)
  result.bottom = resolveRelativePosition(result.bottom, position?.bottomFraction, parentHeight)
  return result
}

function resolveRelativePosition(
  value: DimensionValue | undefined,
  classFraction: number | undefined,
  parentSize: number | undefined,
): DimensionValue | undefined {
  if (classFraction !== undefined && parentSize !== undefined) return parentSize * classFraction
  if (value === undefined || parentSize === undefined || typeof value === "number") return value
  const percentage = value.trim().match(/^(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))%$/)
  if (!percentage) return value
  return parentSize * Number(percentage[1]) / 100
}

'''
    if "export function resolveNativeClassParentPosition" not in text:
        if resolver_anchor not in text:
            raise SystemExit(f"{native_style}: translation resolver anchor missing")
        text = text.replace(resolver_anchor, resolver + resolver_anchor, 1)

    old_translation = '''export function applyNativeStyleTranslation(
  style: StyleDesc | undefined,
  translation: NativeStyleTranslation | undefined,
): StyleDesc | undefined {
  if (!style || !translation) return style
  const result: StyleDesc = { ...style }
  const width = result.width === undefined ? undefined : Number(result.width)
  const height = result.height === undefined ? undefined : Number(result.height)
  if (translation.xFraction !== undefined && width !== undefined && Number.isFinite(width)) {
    result.marginLeft = (result.marginLeft ?? 0) + width * translation.xFraction
  }
  if (translation.yFraction !== undefined && height !== undefined && Number.isFinite(height)) {
    result.marginTop = (result.marginTop ?? 0) + height * translation.yFraction
  }
  return result
}
'''
    new_translation = '''export function applyNativeStyleTranslation(
  style: StyleDesc | undefined,
  translation: NativeStyleTranslation | undefined,
): StyleDesc | undefined {
  if (!style || !translation) return style
  const result: StyleDesc = { ...style }
  const width = numericStyleLength(result.width)
  const height = numericStyleLength(result.height)
  if (translation.xFraction !== undefined && width !== undefined) {
    const offset = width * translation.xFraction
    const left = numericStyleLength(result.left)
    const right = numericStyleLength(result.right)
    if (left !== undefined) result.left = left + offset
    else if (right !== undefined) result.right = right - offset
    else result.marginLeft = (result.marginLeft ?? 0) + offset
  }
  if (translation.yFraction !== undefined && height !== undefined) {
    const offset = height * translation.yFraction
    const top = numericStyleLength(result.top)
    const bottom = numericStyleLength(result.bottom)
    if (top !== undefined) result.top = top + offset
    else if (bottom !== undefined) result.bottom = bottom - offset
    else result.marginTop = (result.marginTop ?? 0) + offset
  }
  return result
}

function numericStyleLength(value: DimensionValue | undefined): number | undefined {
  if (value === undefined) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
'''
    if new_translation not in text:
        if old_translation not in text:
            raise SystemExit(f"{native_style}: translation application anchor missing")
        text = text.replace(old_translation, new_translation, 1)
    native_style.write_text(text)

    index = Path(f"packages/{package}/src/index.ts")
    text = index.read_text()
    if "  applyNativeStyleParentPosition,\n" not in text:
        anchor = "  applyNativeStyleTranslation,\n"
        if anchor not in text:
            raise SystemExit(f"{index}: translation export anchor missing")
        text = text.replace(anchor, "  applyNativeStyleParentPosition,\n" + anchor, 1)
    if "  resolveNativeClassParentPosition,\n" not in text:
        anchor = "  resolveNativeClassStyle,\n"
        if anchor not in text:
            raise SystemExit(f"{index}: class style export anchor missing")
        text = text.replace(anchor, anchor + "  resolveNativeClassParentPosition,\n", 1)
    if "  NativeStyleParentPosition,\n" not in text:
        anchor = "  NativeStyleManifestEntry,\n"
        if anchor not in text:
            raise SystemExit(f"{index}: native style type export anchor missing")
        text = text.replace(anchor, anchor + "  NativeStyleParentPosition,\n", 1)
    index.write_text(text)

universal = Path("packages/solid1/src/universal.ts")
text = universal.read_text()
if "  applyNativeStyleParentPosition,\n" not in text:
    anchor = "  applyNativeStyleTranslation,\n"
    if anchor not in text:
        raise SystemExit("solid1 universal: translation import anchor missing")
    text = text.replace(anchor, "  applyNativeStyleParentPosition,\n" + anchor, 1)
if "  resolveNativeClassParentPosition,\n" not in text:
    anchor = "  resolveNativeClassStyle,\n"
    if anchor not in text:
        raise SystemExit("solid1 universal: style resolver import anchor missing")
    text = text.replace(anchor, anchor + "  resolveNativeClassParentPosition,\n", 1)

old_input = 'type NativeInlineStyleInput = Omit<StyleDesc, "gap" | "rowGap" | "columnGap"> & {\n'
new_input = 'type NativeInlineStyleInput = Omit<StyleDesc, "gap" | "rowGap" | "columnGap" | "top" | "right" | "bottom" | "left"> & {\n  top?: DimensionValue\n  right?: DimensionValue\n  bottom?: DimensionValue\n  left?: DimensionValue\n'
if new_input not in text:
    if old_input not in text:
        raise SystemExit("solid1 universal: inline style type anchor missing")
    text = text.replace(old_input, new_input, 1)

position_destructure = '''    gap,
    rowGap,
    columnGap,
'''
position_destructure_new = '''    gap,
    rowGap,
    columnGap,
    top,
    right,
    bottom,
    left,
'''
if position_destructure_new not in text:
    if position_destructure not in text:
        raise SystemExit("solid1 universal: inline destructure anchor missing")
    text = text.replace(position_destructure, position_destructure_new, 1)

size_anchor = '''  if (style.width !== undefined) normalized.width = normalizeInlineDimension(style.width)
  if (style.height !== undefined) normalized.height = normalizeInlineDimension(style.height)
'''
size_new = '''  if (style.width !== undefined) normalized.width = normalizeInlineDimension(style.width)
  if (style.height !== undefined) normalized.height = normalizeInlineDimension(style.height)
  if (top !== undefined) normalized.top = normalizeInlineDimension(top)
  if (right !== undefined) normalized.right = normalizeInlineDimension(right)
  if (bottom !== undefined) normalized.bottom = normalizeInlineDimension(bottom)
  if (left !== undefined) normalized.left = normalizeInlineDimension(left)
'''
if size_new not in text:
    if size_anchor not in text:
        raise SystemExit("solid1 universal: inline position normalization anchor missing")
    text = text.replace(size_anchor, size_new, 1)

old_apply = '''  const classStyle = resolveNativeClassStyle(className, state.classList)
  const classTranslation = resolveNativeClassTranslation(className, state.classList)
  const inheritedTextTransform = resolveInheritedTextTransform(node)
'''
new_apply = '''  const classStyle = resolveNativeClassStyle(className, state.classList)
  const classParentPosition = resolveNativeClassParentPosition(className, state.classList)
  const classTranslation = resolveNativeClassTranslation(className, state.classList)
  const inheritedTextTransform = resolveInheritedTextTransform(node)
'''
if new_apply not in text:
    if old_apply not in text:
        raise SystemExit("solid1 universal: class geometry anchor missing")
    text = text.replace(old_apply, new_apply, 1)

old_set = '''  const mergedStyle = mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle)
  setHostProperty(
    node,
    "style",
    applyNativeStyleTranslation(mergedStyle, classTranslation) ?? {},
  )
'''
new_set = '''  const mergedStyle = mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle)
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
'''
if new_set not in text:
    if old_set not in text:
        raise SystemExit("solid1 universal: translated style set anchor missing")
    text = text.replace(old_set, new_set, 1)

append_anchor = '''function resolveInheritedTextTransform(node: HostElementNode): NativeTextTransform | undefined {
'''
size_helpers = '''function resolvedNativeNodeSize(parent: HostParent | null, axis: "x" | "y"): number | undefined {
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
  if (typeof value === "number") return value
  const trimmed = value.trim()
  const percentage = trimmed.match(/^(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))%$/)
  if (percentage && parentSize !== undefined) return parentSize * Number(percentage[1]) / 100
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : undefined
}

function resolvedNativePosition(value: DimensionValue | undefined, parentSize: number): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === "number") return value
  const percentage = value.trim().match(/^(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))%$/)
  if (percentage) return parentSize * Number(percentage[1]) / 100
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

'''
if "function resolvedNativeNodeSize(" not in text:
    if append_anchor not in text:
        raise SystemExit("solid1 universal: helper insertion anchor missing")
    text = text.replace(append_anchor, size_helpers + append_anchor, 1)
universal.write_text(text)

generator = Path("examples/solid1-daw/scripts/generate-native-tailwind.mjs")
text = generator.read_text()
old_right = '  ["right-1/2", { base: { right: 2 } }],\n'
new_right = '  ["right-1/2", { base: {}, parentPosition: { rightFraction: 0.5 } }],\n'
if new_right not in text:
    if old_right not in text:
        raise SystemExit("DAW generator: right-1/2 anchor missing")
    text = text.replace(old_right, new_right, 1)
old_top = '  ["top-1/2", { base: { top: 6 } }],\n'
new_top = '  ["top-1/2", { base: {}, parentPosition: { topFraction: 0.5 } }],\n'
if new_top not in text:
    if old_top not in text:
        raise SystemExit("DAW generator: top-1/2 anchor missing")
    text = text.replace(old_top, new_top, 1)
left_line = '  ["left-1/2", { base: {}, parentPosition: { leftFraction: 0.5 } }],\n'
compat_anchor = "const nativeCompatEntries = new Map([\n"
if left_line not in text:
    if compat_anchor not in text:
        raise SystemExit("DAW generator: compat anchor missing")
    text = text.replace(compat_anchor, compat_anchor + left_line, 1)
generator.write_text(text)

parity = Path("packages/solid1/scripts/check-host-parity.ts")
text = parity.read_text()
if "  applyNativeStyleParentPosition,\n" not in text:
    anchor = "  applyNativeStyleTranslation,\n"
    if anchor not in text:
        raise SystemExit("solid1 parity: translation import anchor missing")
    text = text.replace(anchor, "  applyNativeStyleParentPosition,\n" + anchor, 1)
if "  resolveNativeClassParentPosition,\n" not in text:
    anchor = "  resolveNativeClassStyle,\n"
    if anchor not in text:
        raise SystemExit("solid1 parity: class resolver import anchor missing")
    text = text.replace(anchor, anchor + "  resolveNativeClassParentPosition,\n", 1)
probe_anchor = '''const translatedStyle = applyNativeStyleTranslation({ width: 16, height: 12 }, translation)
clearNativeStyleManifest()
'''
probe_new = '''const translatedStyle = applyNativeStyleTranslation({ width: 16, height: 12 }, translation)
configureNativeStyleManifest({ classes: { "left-1/2": { parentPosition: { leftFraction: 0.5 } } } })
const parentPosition = resolveNativeClassParentPosition("left-1/2", undefined)
const centeredStyle = applyNativeStyleParentPosition({ width: 6 }, parentPosition, 16, 20)
clearNativeStyleManifest()
'''
if "const centeredStyle = applyNativeStyleParentPosition" not in text:
    if probe_anchor not in text:
        raise SystemExit("solid1 parity: translation probe anchor missing")
    text = text.replace(probe_anchor, probe_new, 1)
assert_anchor = '''if (translatedStyle?.marginLeft !== -8 || translatedStyle.marginTop !== 6) {
  throw new Error(`fractional native translation must resolve against final own size: ${JSON.stringify(translatedStyle)}`)
}
'''
assert_new = '''if (translatedStyle?.marginLeft !== -8 || translatedStyle.marginTop !== 6) {
  throw new Error(`fractional native translation must resolve against final own size: ${JSON.stringify(translatedStyle)}`)
}
if (centeredStyle?.left !== 8) {
  throw new Error(`parent-relative native position must resolve against parent size: ${JSON.stringify(centeredStyle)}`)
}
'''
if "parent-relative native position must resolve against parent size" not in text:
    if assert_anchor not in text:
        raise SystemExit("solid1 parity: translation assertion anchor missing")
    text = text.replace(assert_anchor, assert_new, 1)
parity.write_text(text)
