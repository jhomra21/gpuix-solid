from pathlib import Path


def replace_once(path: str, anchor: str, replacement: str) -> None:
    target = Path(path)
    text = target.read_text()
    if anchor not in text:
        raise SystemExit(f"closure anchor missing in {path}: {anchor[:100]!r}")
    target.write_text(text.replace(anchor, replacement, 1))


def replace_all(path: str, anchor: str, replacement: str) -> None:
    target = Path(path)
    text = target.read_text()
    if anchor not in text:
        raise SystemExit(f"closure anchor missing in {path}: {anchor[:100]!r}")
    target.write_text(text.replace(anchor, replacement))


generator = "examples/solid1-daw/scripts/generate-native-tailwind.mjs"

compat_anchor = 'const nativeCompatEntries = new Map([\n'
compat_entries = '''const nativeCompatEntries = new Map([
  // Custom classes below are owned by the pinned DAW src/index.css. Keep the
  // source class names intact and translate only the native representation.
  ["mixer-volume-slider", {
    base: { height: 20, borderWidth: 0.5 },
    light: { borderColor: "oklch(0.92 0.004 286.32)", backgroundColor: "oklch(0.552 0.016 285.938)" },
    dark: { borderColor: "oklch(0.274 0.006 286.033)", backgroundColor: "oklch(0.705 0.015 286.067)" },
  }],
  // The browser source layers an automation-range gradient over the volume
  // meter. GPUIX 0.7 publishes one background and cannot represent both
  // CSS-variable-driven layers; the exact source class remains registered.
  ["mixer-volume-slider-automated", { base: {} }],
  // The browser rules use inset/layered shadows. A one-pixel bottom border is
  // the native divider fallback; selected state still comes from the source
  // row background/color classes.
  ["track-row-divider", { base: { borderBottomWidth: 1, borderBottomColor: "rgb(38 38 38)" } }],
  ["track-row-selected-wash", { base: { borderBottomWidth: 1, borderBottomColor: "rgb(38 38 38)" } }],
  ["track-row-control-panel", { base: { width: 101 } }],
  ["track-row-control-stack", { base: { width: 81 } }],
  ["track-meter-strip", { base: { width: 12 } }],
  ["track-automation-indicator", { base: { boxShadow: { offsetX: 0, offsetY: 0, blurRadius: 6, spreadRadius: 0, color: "rgba(239, 68, 68, 0.75)" } } }],
  // GPUIX 0.7 only publishes equal-count grid tracks. Preserve the source
  // column count for the two three-column layouts; fixed control widths remain
  // source-owned by track-row-control-panel/stack/meter-strip above.
  ["track-expanded-row-grid", { base: { gridTemplateColumns: 3 } }],
  ["grid-cols-[minmax(72px,96px)_minmax(96px,1fr)_101px]", { base: { gridTemplateColumns: 3 } }],
  // This two-column source layout can be represented exactly as flex because
  // its children are one flexible div followed by one fixed 20px button.
  ["grid-cols-[minmax(0,1fr)_20px]", {
    base: { display: "flex", flexDirection: "row" },
    descendants: {
      ">div": { base: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 } },
      ">button": { base: { width: 20, flexShrink: 0 } },
    },
  }],
'''
replace_once(generator, compat_anchor, compat_entries)

shadow_anchor = '  ["shadow-black/50", "this only recolors the copied automation picker shadow-xl; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n'
replace_once(
    generator,
    shadow_anchor,
    shadow_anchor + '  ["shadow-black/30", "this only recolors the copied automation lane readout shadow-lg; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n',
)

replace_once(
    generator,
    'const classes = {}\nconst omissions = []\n',
    'const classes = {}\nconst omissions = []\nconst unknownCandidates = []\n',
)
replace_once(
    generator,
    '  const rule = findCandidateRule(root, candidate)\n  if (!rule) continue\n',
    '  const rule = findCandidateRule(root, candidate)\n  if (!rule) {\n    unknownCandidates.push(candidate)\n    continue\n  }\n',
)
replace_once(
    generator,
    'const omissionsComment = omissions.length === 0\n',
    'if (unknownCandidates.length > 0) {\n  throw new Error(`Source class candidates have no Tailwind rule or explicit native compatibility entry: ${unknownCandidates.map((candidate) => JSON.stringify(candidate)).join(", ")}`)\n}\n\nconst omissionsComment = omissions.length === 0\n',
)

cva_anchor = '''      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }
'''
replace_once(
    generator,
    cva_anchor,
    '''      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "cn" || node.expression.text === "clsx")) {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
        collectCvaCall(node, candidates)
        return
      }
''',
)

old_collector = '''function collectClassExpression(node, candidates) {
  if (!node) return

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    addClassString(node.text, candidates)
    return
  }

  if (ts.isTemplateExpression(node)) {
    addClassString(node.head.text, candidates)
    for (const span of node.templateSpans) {
      collectClassExpression(span.expression, candidates)
      addClassString(span.literal.text, candidates)
    }
    return
  }

  ts.forEachChild(node, (child) => collectClassExpression(child, candidates))
}
'''
new_collector = '''function collectClassExpression(node, candidates) {
  if (!node) return

  if (ts.isJsxExpression(node) || ts.isParenthesizedExpression(node)) {
    collectClassExpression(node.expression, candidates)
    return
  }

  if (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    addClassString(node.text, candidates)
    return
  }

  if (ts.isTemplateExpression(node)) {
    addClassString(node.head.text, candidates)
    for (const span of node.templateSpans) {
      collectClassExpression(span.expression, candidates)
      addClassString(span.literal.text, candidates)
    }
    return
  }

  if (ts.isConditionalExpression(node)) {
    collectClassExpression(node.whenTrue, candidates)
    collectClassExpression(node.whenFalse, candidates)
    return
  }

  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      collectClassExpression(node.right, candidates)
      return
    }
    if (
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      collectClassExpression(node.left, candidates)
      collectClassExpression(node.right, candidates)
    }
    return
  }

  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "cn" || node.expression.text === "clsx")) {
    for (const argument of node.arguments) collectClassExpression(argument, candidates)
    return
  }

  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements) collectClassExpression(element, candidates)
    return
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
        collectClassListKey(property.name, candidates)
      }
    }
  }
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text
  return undefined
}

function collectCvaCall(node, candidates) {
  collectClassExpression(node.arguments[0], candidates)
  const config = node.arguments[1]
  if (!config || !ts.isObjectLiteralExpression(config)) return

  for (const property of config.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = propertyNameText(property.name)
    if (name === "variants" && ts.isObjectLiteralExpression(property.initializer)) {
      for (const variant of property.initializer.properties) {
        if (!ts.isPropertyAssignment(variant) || !ts.isObjectLiteralExpression(variant.initializer)) continue
        for (const option of variant.initializer.properties) {
          if (ts.isPropertyAssignment(option)) collectClassExpression(option.initializer, candidates)
        }
      }
      continue
    }
    if (name === "compoundVariants" && ts.isArrayLiteralExpression(property.initializer)) {
      for (const compound of property.initializer.elements) {
        if (!ts.isObjectLiteralExpression(compound)) continue
        for (const entry of compound.properties) {
          if (!ts.isPropertyAssignment(entry)) continue
          const entryName = propertyNameText(entry.name)
          if (entryName === "class" || entryName === "className") collectClassExpression(entry.initializer, candidates)
        }
      }
    }
  }
}
'''
replace_once(generator, old_collector, new_collector)

# Let inline SVG children keep their exact SVG attributes while normal event
# props fall through to the host event system.
replace_once(
    "packages/solid1/jsx-runtime.d.ts",
    "type InlineSvgChildProps = NativeClassProps & {",
    "type InlineSvgChildProps = NativeClassProps & SolidJSX.DOMAttributes<SVGElement> & {",
)
svg_property_anchor = '''      if (semanticTag && isSvgMarkupTag(semanticTag)) {
        if (semanticTag !== "svg") {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
        if (isSvgMarkupAttribute(name)) {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
      }
'''
svg_property_replacement = '''      if (semanticTag && isSvgMarkupTag(semanticTag)) {
        if (semanticTag !== "svg") {
          if (isSvgMarkupAttribute(name)) {
            setSvgAttribute(node, name, value)
            refreshInlineSvg(node)
            return
          }
        } else if (isSvgMarkupAttribute(name)) {
          setSvgAttribute(node, name, value)
          refreshInlineSvg(node)
          return
        }
      }
'''
replace_once("packages/solid1/src/universal.ts", svg_property_anchor, svg_property_replacement)
replace_once("packages/solid/src/host/universal.ts", svg_property_anchor, svg_property_replacement)

# The fixture only exposes the real mixer volume automation target. Remove the
# old invented lane multiplicity; exact TrackSidebarRow now disables Add lane
# when no second upstream parameter exists.
replace_once("examples/solid1-daw/src/native/model.ts", "  automationLaneCount: number\n", "")
replace_all("examples/solid1-daw/src/native/model.ts", "    automationLaneCount: 1,\n", "")
replace_once(
    "examples/solid1-daw/src/native/Timeline.tsx",
    '''  const hideAutomationLane = (id: string): void => {
    updateTrack(id, (track) => track.automationLaneCount > 1
      ? { ...track, automationLaneCount: track.automationLaneCount - 1 }
      : { ...track, automationVisible: false })
  }
''',
    '''  const hideAutomationLane = (id: string): void => {
    updateTrack(id, (track) => ({ ...track, automationVisible: false }))
  }
''',
)
replace_once(
    "examples/solid1-daw/src/native/Timeline.tsx",
    '''          onAddAutomationLane: (id) => updateTrack(id, (track) => track.automationVisible && track.automationLaneCount < 3
            ? { ...track, automationLaneCount: track.automationLaneCount + 1 }
            : track),
''',
    "",
)
replace_once(
    "examples/solid1-daw/src/native/TimelineWorkspace.tsx",
    "  return clipLaneHeight + track.automationLaneCount * 48\n",
    "  return clipLaneHeight + 48\n",
)

# Lock the exact stylesheet that owns the copied components' non-Tailwind
# classes. The workflow downloads it at the pinned commit before this script.
parity = "examples/solid1-daw/scripts/check-upstream-source-parity.mjs"
replace_once(
    parity,
    "const copiedSources = [\n",
    'const copiedSources = [\n  ["src/upstream/index.css", "src/index.css", "49cd4caf64052b7bc042af98d83a4f550cb4f88e"],\n',
)
replace_once(
    "examples/solid1-daw/src/native-theme.css",
    "/* Mirrored from daw-browser-convex src/index.css at 3fb6ae9a10b8317feb23e77832e0894da7420f9b. */",
    "/* Theme tokens are derived from the exact pinned src/upstream/index.css source. */",
)

# Documentation count is updated in the same validated closure.
for doc_path in ["docs/upstream-parity.md", "examples/solid1-daw/UPSTREAM.md"]:
    path = Path(doc_path)
    if path.exists():
        text = path.read_text()
        text = text.replace("59 exact", "60 exact").replace("59 files", "60 files")
        path.write_text(text)
