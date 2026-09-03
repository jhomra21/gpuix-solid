from pathlib import Path


def replace_once(path: str, anchor: str, replacement: str) -> None:
    target = Path(path)
    text = target.read_text()
    if anchor not in text:
        raise SystemExit(f"probe anchor missing in {path}")
    target.write_text(text.replace(anchor, replacement, 1))


shadow_anchor = '  ["shadow-black/50", "this only recolors the copied automation picker shadow-xl; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n'
replace_once(
    "examples/solid1-daw/scripts/generate-native-tailwind.mjs",
    shadow_anchor,
    shadow_anchor + '  ["shadow-black/30", "this only recolors the copied automation lane readout shadow-lg; GPUIX 0.7 cannot represent that layered source shadow exactly"],\n',
)

compat_anchor = 'const nativeCompatEntries = new Map([\n'
replace_once(
    "examples/solid1-daw/scripts/generate-native-tailwind.mjs",
    compat_anchor,
    compat_anchor
    + '  // Probe only: the final implementation must translate the pinned index.css rules rather than leave these selectors empty.\n'
    + '  ["mixer-volume-slider", { base: {} }],\n'
    + '  ["mixer-volume-slider-automated", { base: {} }],\n',
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
