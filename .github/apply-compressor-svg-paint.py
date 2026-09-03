from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:160]!r}")
    file.write_text(text.replace(old, new, 1))


generator = "examples/solid1-daw/scripts/generate-native-tailwind.mjs"

# Tailwind SVG paint utilities belong in serialized SVG markup, not GPUIX
# StyleDesc. Preserve the source class and compile base stroke/fill paint into a
# separate manifest channel. Stateful SVG paint remains fail-closed until the
# host has an explicit pseudo-state contract for serialized markup.
replace_once(
    generator,
    '''  const base = {}
  const hover = {}
  const active = {}
  const focus = {}
  let lineHeightMultiplier
''',
    '''  const base = {}
  const hover = {}
  const active = {}
  const focus = {}
  const svgPaint = {}
  let lineHeightMultiplier
''',
)
replace_once(
    generator,
    '''    const relativeLineHeight = declaration.prop === "line-height" ? lineHeightMultiplierValue(value) : undefined
    if (relativeLineHeight !== undefined) {
''',
    '''    if (declaration.prop === "stroke" || declaration.prop === "fill") {
      if (state !== "base") throw new Error(`Stateful SVG paint is not supported for ${JSON.stringify(candidate)}`)
      svgPaint[declaration.prop] = colorValue(value, declaration.prop, candidate)
      return
    }
    const relativeLineHeight = declaration.prop === "line-height" ? lineHeightMultiplierValue(value) : undefined
    if (relativeLineHeight !== undefined) {
''',
)
replace_once(
    generator,
    '''  if (Object.keys(result).length === 0 && Object.keys(focus).length === 0 && lineHeightMultiplier === undefined) {
    throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)
  }
  return { style: result, focus, lineHeightMultiplier }
''',
    '''  if (Object.keys(result).length === 0 && Object.keys(focus).length === 0 && lineHeightMultiplier === undefined && Object.keys(svgPaint).length === 0) {
    throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)
  }
  return { style: result, focus, lineHeightMultiplier, svgPaint }
''',
)
replace_once(
    generator,
    '''  const lineHeightMetadata = lightCompiled.lineHeightMultiplier === undefined
    ? {}
    : { lineHeightMultiplier: lightCompiled.lineHeightMultiplier }

  if (descendant && focus) throw new Error(`Unsupported focused descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  if (descendant && lightCompiled.lineHeightMultiplier !== undefined) throw new Error(`Unsupported relative line-height descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  classes[candidate] = descendant
    ? { descendants: { [descendant]: variant } }
    : focus ? { ...variant, focus, ...lineHeightMetadata } : { ...variant, ...lineHeightMetadata }
''',
    '''  const lineHeightMetadata = lightCompiled.lineHeightMultiplier === undefined
    ? {}
    : { lineHeightMultiplier: lightCompiled.lineHeightMultiplier }
  const hasSvgPaint = Object.keys(lightCompiled.svgPaint).length > 0 || Object.keys(darkCompiled.svgPaint).length > 0
  const svg = hasSvgPaint
    ? JSON.stringify(lightCompiled.svgPaint) === JSON.stringify(darkCompiled.svgPaint)
      ? { base: lightCompiled.svgPaint }
      : { light: lightCompiled.svgPaint, dark: darkCompiled.svgPaint }
    : undefined

  if (descendant && focus) throw new Error(`Unsupported focused descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  if (descendant && lightCompiled.lineHeightMultiplier !== undefined) throw new Error(`Unsupported relative line-height descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  if (descendant && svg) throw new Error(`Unsupported SVG paint descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  if (descendant) {
    classes[candidate] = { descendants: { [descendant]: variant } }
  } else {
    const entry = { ...variant, ...lineHeightMetadata }
    if (focus) entry.focus = focus
    if (svg) entry.svg = svg
    classes[candidate] = entry
  }
''',
)

native_style = "packages/solid1/src/native-style.ts"
replace_once(
    native_style,
    '''export interface NativeStyleVariant {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
}
''',
    '''export interface NativeStyleVariant {
  base?: StyleDesc
  light?: StyleDesc
  dark?: StyleDesc
}

export interface NativeSvgPaint {
  fill?: string
  stroke?: string
}

export interface NativeSvgPaintVariant {
  base?: NativeSvgPaint
  light?: NativeSvgPaint
  dark?: NativeSvgPaint
}
''',
)
replace_once(
    native_style,
    '''  attributeVariants?: Record<string, Record<string, NativeStyleVariant>>
  lineHeightMultiplier?: number
  textTransform?: NativeTextTransform
''',
    '''  attributeVariants?: Record<string, Record<string, NativeStyleVariant>>
  lineHeightMultiplier?: number
  svg?: NativeSvgPaintVariant
  textTransform?: NativeTextTransform
''',
)
replace_once(
    native_style,
    '''export function resolveNativeClassAttributeStyle(
''',
    '''export function resolveNativeClassSvgPaint(
  className: string | undefined,
  classList: NativeClassList | undefined,
): NativeSvgPaint | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: NativeSvgPaint | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    const paint = resolveSvgPaintVariant(entry.svg)
    if (!paint) continue
    resolved = { ...resolved, ...paint }
  }
  return resolved
}

export function resolveNativeClassAttributeStyle(
''',
)
replace_once(
    native_style,
    '''function requireManifest(): NativeStyleManifest {
''',
    '''function resolveSvgPaintVariant(variant: NativeSvgPaintVariant | undefined): NativeSvgPaint | undefined {
  if (!variant) return undefined
  const themed = colorMode === "dark" ? variant.dark : variant.light
  const paint = { ...variant.base, ...themed }
  if (paint.fill !== undefined) paint.fill = normalizePublishedNativeColor(paint.fill)
  if (paint.stroke !== undefined) paint.stroke = normalizePublishedNativeColor(paint.stroke)
  return Object.keys(paint).length > 0 ? paint : undefined
}

function requireManifest(): NativeStyleManifest {
''',
)

index_path = "packages/solid1/src/index.ts"
replace_once(
    index_path,
    '''  resolveNativeClassAttributeStyle,
  resolveNativeClassParentPosition,
''',
    '''  resolveNativeClassAttributeStyle,
  resolveNativeClassSvgPaint,
  resolveNativeClassParentPosition,
''',
)

universal = "packages/solid1/src/universal.ts"
replace_once(
    universal,
    '''  resolveNativeClassAttributeStyle,
  resolveNativeClassParentPosition,
''',
    '''  resolveNativeClassAttributeStyle,
  resolveNativeClassSvgPaint,
  resolveNativeClassParentPosition,
''',
)
replace_once(
    universal,
    '''    reapplyNativeStyleSubtree(node)
  }
})
''',
    '''    reapplyNativeStyleSubtree(node)
    refreshInlineSvg(node)
  }
})
''',
)
replace_once(
    universal,
    '''      if (name === "class") {
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
''',
    '''      if (name === "class") {
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
''',
)
replace_once(
    universal,
    '''  const attributes = new Map(svgAttributes.get(node) ?? [])
  if (root && !attributes.has("xmlns")) attributes.set("xmlns", "http://www.w3.org/2000/svg")
''',
    '''  const attributes = new Map(svgAttributes.get(node) ?? [])
  const state = styleStates.get(node)
  if (state && hasNativeClasses(state)) {
    const paint = resolveNativeClassSvgPaint(combinedClassName(state), state.classList)
    if (paint?.fill !== undefined) attributes.set("fill", paint.fill)
    if (paint?.stroke !== undefined) attributes.set("stroke", paint.stroke)
  }
  if (root && !attributes.has("xmlns")) attributes.set("xmlns", "http://www.w3.org/2000/svg")
''',
)

# Change detector: source SVG paint classes must become normalized sRGB
# presentation paint rather than disappearing into a native StyleDesc no-op.
test_path = "examples/solid1-daw/src/test.tsx"
replace_once(
    test_path,
    '''  resolveNativeClassAttributeStyle,
  resolveNativeDescendantClassStyle,
''',
    '''  resolveNativeClassAttributeStyle,
  resolveNativeClassSvgPaint,
  resolveNativeDescendantClassStyle,
''',
)
replace_once(
    test_path,
    '''  const collapsedEffectShell = resolveNativeClassAttributeStyle(
''',
    '''  const knobBorderPaint = resolveNativeClassSvgPaint("stroke-border", undefined)
  requireCondition(
    knobBorderPaint?.stroke !== undefined && (knobBorderPaint.stroke.startsWith("#") || knobBorderPaint.stroke.startsWith("rgba(")),
    `stroke-border should compile to normalized native SVG paint, got ${JSON.stringify(knobBorderPaint)}`,
  )
  const knobActivePaint = resolveNativeClassSvgPaint("stroke-cyan-400", undefined)
  requireCondition(
    knobActivePaint?.stroke !== undefined && knobActivePaint.stroke !== knobBorderPaint?.stroke,
    "source knob accent stroke should remain distinct from the border stroke",
  )

  const collapsedEffectShell = resolveNativeClassAttributeStyle(
''',
)
