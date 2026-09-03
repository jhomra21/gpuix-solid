from pathlib import Path


def replace_once(path: str, anchor: str, replacement: str) -> None:
    target = Path(path)
    text = target.read_text()
    if anchor not in text:
        raise SystemExit(f"probe anchor missing in {path}")
    target.write_text(text.replace(anchor, replacement, 1))


generator = "examples/solid1-daw/scripts/generate-native-tailwind.mjs"
shadow_anchor = '  ["shadow-black/50", "this only recolors the copied automation picker shadow-xl; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n'
replace_once(
    generator,
    shadow_anchor,
    shadow_anchor + '  ["shadow-black/30", "this only recolors the copied automation lane readout shadow-lg; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n',
)

compat_anchor = 'const nativeCompatEntries = new Map([\n'
replace_once(
    generator,
    compat_anchor,
    compat_anchor
    + '  // Probe only: final entries must translate the pinned index.css rules or document a real native limitation.\n'
    + '  ["mixer-volume-slider", { base: {} }],\n'
    + '  ["mixer-volume-slider-automated", { base: {} }],\n'
    + '  ["track-row-divider", { base: {} }],\n'
    + '  ["track-row-selected-wash", { base: {} }],\n',
)

cva_anchor = '''      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cva") {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }
'''
replace_once(
    generator,
    cva_anchor,
    '''      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === "cn" || node.expression.text === "clsx" || node.expression.text === "cva")) {
        for (const argument of node.arguments) collectClassExpression(argument, candidates)
        return
      }
''',
)

replace_once(
    generator,
    '  const rule = findCandidateRule(root, candidate)\n  if (!rule) continue\n',
    '  const rule = findCandidateRule(root, candidate)\n  if (!rule) throw new Error(`Source class candidate ${JSON.stringify(candidate)} has no Tailwind rule or explicit native compatibility entry`)\n',
)

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
