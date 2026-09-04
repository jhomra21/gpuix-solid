from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact replacement target, found {count}")
    file.write_text(text.replace(old, new, 1))


host_old = '''function nativeStyleFor(
  node: HostElementNode,
  pointerEvents = effectivePointerEvents(node),
): StyleDesc {
  // Browser range inputs have an intrinsic hit surface even without author CSS.
  // GPUIX intentionally backs them with a div, so preserve a small intrinsic
  // height and let normal flex layout determine the available width.
  const style = isRangeInput(node)
    ? { minHeight: 16, height: 16, width: 129, minWidth: 129, ...node.style }
    : node.style
  if (node.style.pointerEvents !== undefined || pointerEvents === undefined) return style
  return { ...style, pointerEvents }
}
'''

host_new = '''function nativeStyleFor(
  node: HostElementNode,
  pointerEvents = effectivePointerEvents(node),
): StyleDesc {
  // Semantic buttons are backed by native divs, so supply the browser control's
  // centered content baseline unless source styles explicitly override it.
  const buttonStyle: StyleDesc = node.localName === "button"
    ? { display: "flex", alignItems: "center", justifyContent: "center" }
    : {}

  // Browser range inputs have an intrinsic width only when the source does not
  // author one. A source width such as w-full must be allowed to shrink inside
  // fractional grid/flex tracks rather than retaining the browser 129px minimum.
  const rangeStyle: StyleDesc = isRangeInput(node)
    ? node.style.width === undefined
      ? { minHeight: 16, height: 16, width: 129, minWidth: 129 }
      : { minHeight: 16, height: 16, minWidth: 0 }
    : {}
  const style = { ...buttonStyle, ...rangeStyle, ...node.style }
  if (node.style.pointerEvents !== undefined || pointerEvents === undefined) return style
  return { ...style, pointerEvents }
}
'''

for host_path in [
    "packages/solid/src/host/nodes.ts",
    "packages/solid1/src/host/nodes.ts",
]:
    replace_once(host_path, host_old, host_new)

solid_color_old = '''function normalizePublishedNativeColor(value: string): string {
  const trimmed = value.trim()
  const oklch = parseOklch(trimmed)
'''
solid_color_new = '''function normalizePublishedNativeColor(value: string): string {
  const trimmed = value.trim()
  const transparentMix = normalizeTransparentOklchMix(trimmed)
  const normalized = transparentMix ?? trimmed
  const oklch = parseOklch(normalized)
'''

solid_color_tail_old = '''  const hsl = parseHsl(trimmed)
'''
solid_color_tail_new = '''  const hsl = parseHsl(normalized)
'''
solid_rgb_old = '''  const rgb = parseRgb(trimmed)
'''
solid_rgb_new = '''  const rgb = parseRgb(normalized)
'''

mix_helper = r'''
function normalizeTransparentOklchMix(value: string): string | undefined {
  const match = value.match(
    /^color-mix\(in oklab,\s*(oklch\([^)]*\))\s+(\d+(?:\.\d+)?)%,\s*transparent\s*\)$/i,
  )
  const color = match?.[1]
  const alpha = match?.[2]
  if (!color || !alpha || color.includes("/")) return undefined
  return color.replace(/\)$/, ` / ${alpha}%)`)
}

'''

for style_path in [
    "packages/solid/src/native-style.ts",
    "packages/solid1/src/native-style.ts",
]:
    replace_once(style_path, solid_color_old, solid_color_new)
    replace_once(style_path, solid_color_tail_old, solid_color_tail_new)
    replace_once(style_path, solid_rgb_old, solid_rgb_new)
    replace_once(style_path, "interface ParsedOklch", mix_helper + "interface ParsedOklch")

canvas_old = '''    case "svg":
    case "canvas":
    case "input":
'''
canvas_new = '''    case "svg":
    case "input":
'''
replace_once("packages/solid1/src/universal.ts", canvas_old, canvas_new)
replace_once(
    "packages/solid1/src/universal.ts",
    '''    case "virtual-list":
      return tagName
    default:
''',
    '''    case "virtual-list":
      return tagName
    case "canvas":
      // GPUIX 0.7 has no Canvas2D element. Preserve semantic canvas identity on
      // a supported layout box so browser source can feature-detect getContext().
      return "div"
    default:
''',
)

parity_color_anchor = '''if (combinedClassListStyle?.backgroundColor !== "#111111" || combinedClassListStyle.color !== "#eeeeee") {
  throw new Error("Solid 1 native classList must split multi-class keys before manifest lookup")
}

installDomEventEnvironment()
'''
parity_color_replacement = '''if (combinedClassListStyle?.backgroundColor !== "#111111" || combinedClassListStyle.color !== "#eeeeee") {
  throw new Error("Solid 1 native classList must split multi-class keys before manifest lookup")
}

configureNativeStyleManifest({
  classes: {
    translucentBlue: {
      base: {
        backgroundColor: "color-mix(in oklab, oklch(62.3% 0.214 259.815) 90%, transparent)",
      },
    },
  },
})
const translucentBlue = resolveNativeClassStyle("translucentBlue", undefined)
clearNativeStyleManifest()
if (!translucentBlue?.backgroundColor?.startsWith("rgba(") || !translucentBlue.backgroundColor.endsWith(", 0.9)")) {
  throw new Error(`transparent Tailwind color-mix must normalize to native sRGB alpha: ${JSON.stringify(translucentBlue)}`)
}

installDomEventEnvironment()
'''
replace_once("packages/solid1/scripts/check-host-parity.ts", parity_color_anchor, parity_color_replacement)

canvas_test_anchor = '''if (repitchOption.style.display !== "none" || stretchOption.style.display === "none") {
  throw new Error(`semantic select value update must swap the painted option: ${JSON.stringify({ repitch: repitchOption.style, stretch: stretchOption.style })}`)
}

const semanticButton = createHostElement("div", "button")
'''
canvas_test_replacement = '''if (repitchOption.style.display !== "none" || stretchOption.style.display === "none") {
  throw new Error(`semantic select value update must swap the painted option: ${JSON.stringify({ repitch: repitchOption.style, stretch: stretchOption.style })}`)
}

const semanticCanvas = createSemanticElement("canvas")
if (semanticCanvas.kind !== "element" || semanticCanvas.nativeType !== "div" || semanticCanvas.localName !== "canvas") {
  throw new Error(`semantic canvas must use a supported native layout box: ${JSON.stringify(semanticCanvas)}`)
}
if (semanticCanvas.getContext("2d") !== null) throw new Error("semantic canvas must preserve browser feature detection")

const semanticButton = createHostElement("div", "button")
'''
replace_once("packages/solid1/scripts/check-host-parity.ts", canvas_test_anchor, canvas_test_replacement)

daw_geometry_anchor = '''  const visibleMixerControl = app.renderer.boundsCustomProps(muteOn)
  requireCondition(
    visibleMixerControl.x >= 0 && right(visibleMixerControl) <= viewportWidth,
    `exact source mixer controls should be visible before interaction, got ${JSON.stringify(visibleMixerControl)}`,
  )

  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
'''
daw_geometry_replacement = '''  const visibleMixerControl = app.renderer.boundsCustomProps(muteOn)
  requireCondition(
    visibleMixerControl.x >= 0 && right(visibleMixerControl) <= viewportWidth,
    `exact source mixer controls should be visible before interaction, got ${JSON.stringify(visibleMixerControl)}`,
  )
  const soloBounds = app.renderer.boundsCustomProps(soloOff)
  const armBounds = app.renderer.boundsCustomProps(armOff)
  const volumeBounds = app.renderer.boundsCustomProps(volume)
  requireCondition(
    visibleMixerControl.width >= soloBounds.width * 2.5 && visibleMixerControl.width <= soloBounds.width * 3.5,
    `source 3fr/1fr mixer geometry should keep the track button roughly three times Solo width: ${JSON.stringify({ mute: visibleMixerControl, solo: soloBounds })}`,
  )
  requireCondition(
    Math.abs(soloBounds.width - armBounds.width) <= 2 && soloBounds.width <= 20 && armBounds.width <= 20,
    `source Solo/Record 1fr controls should stay compact and equal width: ${JSON.stringify({ solo: soloBounds, arm: armBounds })}`,
  )
  requireCondition(
    volumeBounds.width >= soloBounds.width * 2.5 && volumeBounds.width < 70,
    `source mixer volume should shrink into its 3fr column instead of retaining intrinsic range width: ${JSON.stringify(volumeBounds)}`,
  )

  const muteBackground = app.renderer.styleCustomProps(muteOn).backgroundColor
'''
replace_once("examples/solid1-daw/src/test.tsx", daw_geometry_anchor, daw_geometry_replacement)

solo_anchor = '''  app.renderer.clickCustomProps(soloOff)
  requireCondition(app.renderer.hasCustomProps(soloOn), "exact source solo should expose Unsolo after activation")
  app.renderer.clickCustomProps(soloOn)
'''
solo_replacement = '''  app.renderer.clickCustomProps(soloOff)
  requireCondition(app.renderer.hasCustomProps(soloOn), "exact source solo should expose Unsolo after activation")
  const soloActiveBackground = app.renderer.styleCustomProps(soloOn).backgroundColor ?? ""
  requireCondition(
    soloActiveBackground.startsWith("rgba(") && soloActiveBackground.endsWith(", 0.9)"),
    `exact source bg-blue-500/90 Solo state should reach native as translucent sRGB, got ${JSON.stringify(soloActiveBackground)}`,
  )
  app.renderer.clickCustomProps(soloOn)
'''
replace_once("examples/solid1-daw/src/test.tsx", solo_anchor, solo_replacement)

print("DAW visual-fidelity compatibility patch applied")
