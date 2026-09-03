from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:140]!r}")
    file.write_text(text.replace(old, new, 1))


generator = "examples/solid1-daw/scripts/generate-native-tailwind.mjs"

# The source stylesheet owns the EffectShell collapsed geometry. Represent the
# exact data-attribute state beneath the copied component rather than adding a
# native wrapper or treating the class as an empty semantic marker.
replace_once(
    generator,
    '''const nativeCompatEntries = new Map([\n''',
    '''const nativeCompatEntries = new Map([
  ["effect-shell", {
    base: {},
    attributeVariants: {
      "data-device-collapsed": {
        "true": { base: { width: 26, minWidth: 26, maxWidth: 26, flexGrow: 0, flexShrink: 0, flexBasis: 26 } },
      },
    },
  }],
''',
)

# These two custom classes only participate in source transform selectors.
# GPUIX 0.7 has no general transform field, so keep the limitation explicit
# and candidate-specific instead of silently registering empty custom CSS.
replace_once(
    generator,
    '''const explicitlyIgnored = new Map([\n''',
    '''const explicitlyIgnored = new Map([
  ["effect-shell-chevron", "the source class is only a selector anchor for chevron transform state; GPUIX 0.7 has no general CSS transform field"],
  ["effect-shell-chevron-icon", "the source rotates this icon with CSS transform; GPUIX 0.7 has no general CSS transform field"],
''',
)
replace_once(
    generator,
    '''  ["leading-none", "relative line-height needs merged font-size context before it can be represented exactly"],\n''',
    '''''',
)

# Preserve unitless/ratio line-height as manifest metadata. Tailwind utilities
# such as leading-tight are intentionally independent from font-size utilities;
# resolving them inside a single candidate loses the CSS computed-value model.
replace_once(
    generator,
    '''  const base = {}
  const hover = {}
  const active = {}
  const focus = {}

  rule.walkDecls((declaration) => {
''',
    '''  const base = {}
  const hover = {}
  const active = {}
  const focus = {}
  let lineHeightMultiplier

  rule.walkDecls((declaration) => {
''',
)
replace_once(
    generator,
    '''    const target = state === "hover" ? hover : state === "active" ? active : state === "focus" ? focus : base
    const value = resolveCssValue(declaration.value, { ...themeVariables, ...localVariables })
    mapDeclaration(target, declaration.prop, value, candidate)
  })

  const result = { ...base }
''',
    '''    const target = state === "hover" ? hover : state === "active" ? active : state === "focus" ? focus : base
    const value = resolveCssValue(declaration.value, { ...themeVariables, ...localVariables })
    const relativeLineHeight = declaration.prop === "line-height" ? lineHeightMultiplierValue(value) : undefined
    if (relativeLineHeight !== undefined) {
      if (state !== "base") throw new Error(`Relative line-height state variants are not supported for ${JSON.stringify(candidate)}`)
      lineHeightMultiplier = relativeLineHeight
      return
    }
    mapDeclaration(target, declaration.prop, value, candidate)
  })

  const result = { ...base }
''',
)
replace_once(
    generator,
    '''  if (Object.keys(result).length === 0 && Object.keys(focus).length === 0) {
    throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)
  }
  return { style: result, focus }
}
''',
    '''  if (Object.keys(result).length === 0 && Object.keys(focus).length === 0 && lineHeightMultiplier === undefined) {
    throw new Error(`Tailwind candidate ${JSON.stringify(candidate)} produced no native styles`)
  }
  return { style: result, focus, lineHeightMultiplier }
}
''',
)
replace_once(
    generator,
    '''  const hasFocus = Object.keys(lightCompiled.focus).length > 0 || Object.keys(darkCompiled.focus).length > 0
  const focus = hasFocus
    ? JSON.stringify(lightCompiled.focus) === JSON.stringify(darkCompiled.focus)
      ? { base: lightCompiled.focus }
      : { light: lightCompiled.focus, dark: darkCompiled.focus }
    : undefined

  if (descendant && focus) throw new Error(`Unsupported focused descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  classes[candidate] = descendant
    ? { descendants: { [descendant]: variant } }
    : focus ? { ...variant, focus } : variant
''',
    '''  const hasFocus = Object.keys(lightCompiled.focus).length > 0 || Object.keys(darkCompiled.focus).length > 0
  const focus = hasFocus
    ? JSON.stringify(lightCompiled.focus) === JSON.stringify(darkCompiled.focus)
      ? { base: lightCompiled.focus }
      : { light: lightCompiled.focus, dark: darkCompiled.focus }
    : undefined
  if (lightCompiled.lineHeightMultiplier !== darkCompiled.lineHeightMultiplier) {
    throw new Error(`Theme-dependent relative line-height is unsupported for ${JSON.stringify(candidate)}`)
  }
  const lineHeightMetadata = lightCompiled.lineHeightMultiplier === undefined
    ? {}
    : { lineHeightMultiplier: lightCompiled.lineHeightMultiplier }

  if (descendant && focus) throw new Error(`Unsupported focused descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  if (descendant && lightCompiled.lineHeightMultiplier !== undefined) throw new Error(`Unsupported relative line-height descendant native Tailwind candidate ${JSON.stringify(candidate)}`)
  classes[candidate] = descendant
    ? { descendants: { [descendant]: variant } }
    : focus ? { ...variant, focus, ...lineHeightMetadata } : { ...variant, ...lineHeightMetadata }
''',
)
replace_once(
    generator,
    '''function lineHeightValue(value, fontSize, property, candidate) {
  const unitless = value.match(/^(-?\\d+(?:\\.\\d+)?)$/)
  if (unitless) return relativeLineHeight(Number(unitless[1]), fontSize, candidate)

  const ratio = value.match(/^calc\\(\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\/\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\)$/)
  if (ratio) {
    const denominator = Number(ratio[2])
    if (denominator === 0) throw new Error(`Unsupported line-height division by zero from ${JSON.stringify(candidate)}: ${value}`)
    return relativeLineHeight(Number(ratio[1]) / denominator, fontSize, candidate)
  }

  return lengthValue(value, property, candidate)
}
''',
    '''function lineHeightMultiplierValue(value) {
  const unitless = value.match(/^(-?\\d+(?:\\.\\d+)?)$/)
  if (unitless) {
    const multiplier = Number(unitless[1])
    return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : undefined
  }

  const ratio = value.match(/^calc\\(\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\/\\s*(-?\\d+(?:\\.\\d+)?)\\s*\\)$/)
  if (!ratio) return undefined
  const denominator = Number(ratio[2])
  if (denominator === 0) return undefined
  const multiplier = Number(ratio[1]) / denominator
  return Number.isFinite(multiplier) && multiplier > 0 ? multiplier : undefined
}

function lineHeightValue(value, fontSize, property, candidate) {
  const multiplier = lineHeightMultiplierValue(value)
  if (multiplier !== undefined) return relativeLineHeight(multiplier, fontSize, candidate)
  return lengthValue(value, property, candidate)
}
''',
)

native_style = "packages/solid1/src/native-style.ts"
replace_once(
    native_style,
    '''  descendants?: Record<string, NativeStyleVariant>
  textTransform?: NativeTextTransform
''',
    '''  descendants?: Record<string, NativeStyleVariant>
  attributeVariants?: Record<string, Record<string, NativeStyleVariant>>
  lineHeightMultiplier?: number
  textTransform?: NativeTextTransform
''',
)
replace_once(
    native_style,
    '''export function resolveNativeClassStyle(
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
''',
    '''export function resolveNativeClassStyle(
  className: string | undefined,
  classList: NativeClassList | undefined,
  contextFontSize?: number,
): StyleDesc | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: StyleDesc | undefined
  let lineHeightMultiplier: number | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    resolved = mergeNativeStyles(resolved, resolveVariant(entry))
    if (entry.lineHeightMultiplier !== undefined) lineHeightMultiplier = entry.lineHeightMultiplier
  }
  const fontSize = resolved?.fontSize ?? contextFontSize
  if (lineHeightMultiplier !== undefined && fontSize !== undefined) {
    resolved = mergeNativeStyles(resolved, { lineHeight: lineHeightMultiplier * fontSize })
  }
  return resolved
}

export function resolveNativeClassAttributeStyle(
  className: string | undefined,
  classList: NativeClassList | undefined,
  attributes: ReadonlyMap<string, unknown>,
): StyleDesc | undefined {
  const candidates = classCandidates(className, classList)
  if (candidates.length === 0) return undefined
  const activeManifest = requireManifest()

  let resolved: StyleDesc | undefined
  for (const candidate of candidates) {
    const entry = activeManifest.classes[candidate]
    if (!entry) throw missingCandidate(candidate)
    if (!entry.attributeVariants) continue
    for (const [attributeName, values] of Object.entries(entry.attributeVariants)) {
      const attributeValue = attributes.get(attributeName)
      if (attributeValue === undefined || attributeValue === null) continue
      resolved = mergeNativeStyles(resolved, resolveVariant(values[String(attributeValue)]))
    }
  }
  return resolved
}
''',
)

universal = "packages/solid1/src/universal.ts"
replace_once(
    universal,
    '''  resolveNativeClassStyle,
  resolveNativeClassParentPosition,
''',
    '''  resolveNativeClassStyle,
  resolveNativeClassAttributeStyle,
  resolveNativeClassParentPosition,
''',
)
replace_once(
    universal,
    '''  const inheritedStyle = resolveInheritedNativeStyle(node)
  const ancestorStyle = resolveAncestorDescendantStyle(node)
  const classStyle = resolveNativeClassStyle(className, state.classList)
  const classParentPosition = resolveNativeClassParentPosition(className, state.classList)
''',
    '''  const inheritedStyle = resolveInheritedNativeStyle(node)
  const ancestorStyle = resolveAncestorDescendantStyle(node)
  const preClassStyle = mergeNativeStyles(inheritedStyle, ancestorStyle)
  const classStyle = resolveNativeClassStyle(className, state.classList, state.inlineStyle?.fontSize ?? preClassStyle?.fontSize)
  const classAttributeStyle = resolveNativeClassAttributeStyle(className, state.classList, node.props)
  const classParentPosition = resolveNativeClassParentPosition(className, state.classList)
''',
)
replace_once(
    universal,
    '''  const mergedStyle = mergeNativeStyles(inheritedStyle, ancestorStyle, classStyle, state.inlineStyle)
''',
    '''  const mergedStyle = mergeNativeStyles(preClassStyle, classStyle, classAttributeStyle, state.inlineStyle)
''',
)
replace_once(
    universal,
    '''    setHostProperty(node, name, value, previous)
  },
''',
    '''    setHostProperty(node, name, value, previous)
    if (node.kind === "element" && (name.startsWith("data-") || name.startsWith("aria-"))) {
      reapplyNativeStyleSubtree(node)
    }
  },
''',
)

index_path = "packages/solid1/src/index.ts"
replace_once(
    index_path,
    '''  resolveNativeClassStyle,
  resolveNativeClassParentPosition,
''',
    '''  resolveNativeClassStyle,
  resolveNativeClassAttributeStyle,
  resolveNativeClassParentPosition,
''',
)

# Change detectors for both generic contracts. The typography assertion proves
# leading-tight is computed from text-2xs (10px * 1.25), and leading-none can
# resolve against inherited font size. The attribute assertion proves the exact
# pinned EffectShell collapsed width/flex CSS is represented by host metadata.
test_path = "examples/solid1-daw/src/test.tsx"
replace_once(
    test_path,
    '''  resolveNativeClassStyle,
  resolveNativeDescendantClassStyle,
''',
    '''  resolveNativeClassStyle,
  resolveNativeClassAttributeStyle,
  resolveNativeDescendantClassStyle,
''',
)
replace_once(
    test_path,
    '''  requireCondition(compressorColumnRight?.width === 96 && compressorColumnRight.minWidth === 96, "positional descendant compatibility should preserve the source 96px Compressor right column")

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
''',
    '''  requireCondition(compressorColumnRight?.width === 96 && compressorColumnRight.minWidth === 96, "positional descendant compatibility should preserve the source 96px Compressor right column")

  const compressorStatusTypography = resolveNativeClassStyle("text-2xs leading-tight", undefined)
  requireCondition(compressorStatusTypography?.fontSize === 10, "text-2xs should preserve the source 10px Compressor status size")
  requireCondition(compressorStatusTypography?.lineHeight === 12.5, "leading-tight should resolve against the merged 10px source font size")
  const inheritedLeadingNone = resolveNativeClassStyle("leading-none", undefined, 12)
  requireCondition(inheritedLeadingNone?.lineHeight === 12, "leading-none should resolve against inherited native font size")

  const collapsedEffectShell = resolveNativeClassAttributeStyle(
    "effect-shell",
    undefined,
    new Map([["data-device-collapsed", "true"]]),
  )
  requireCondition(
    collapsedEffectShell?.width === 26 &&
      collapsedEffectShell.minWidth === 26 &&
      collapsedEffectShell.maxWidth === 26 &&
      collapsedEffectShell.flexGrow === 0 &&
      collapsedEffectShell.flexShrink === 0 &&
      collapsedEffectShell.flexBasis === 26,
    "attribute-conditioned native styles should preserve the exact 26px collapsed EffectShell flex contract",
  )

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
''',
)
