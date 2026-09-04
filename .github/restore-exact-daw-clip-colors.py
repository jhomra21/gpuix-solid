from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact replacement target, found {count}")
    file.write_text(text.replace(old, new, 1))


def replace_regex_once(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex replacement target, found {count}")
    file.write_text(updated)


clip_color_source = """import type { Clip } from '@daw-browser/timeline-core/types'\nimport { parseHexColor } from '~/lib/color'\nimport type { ResolvedThemeTokens } from '~/lib/theme/theme-resolver'\n\ntype ClipThemeTokens = Pick<ResolvedThemeTokens, 'clip-audio' | 'clip-midi' | 'clip-recording'>\n\nexport const getDefaultClipColor = (clip: Pick<Clip, 'sourceKind' | 'midi'>) => {\n  if (clip.sourceKind === 'recording') return 'clip-recording'\n  return clip.midi ? 'clip-midi' : 'clip-audio'\n}\n\nexport const trackColorForClip = (color: string | undefined) =>\n  parseHexColor(color, '') || undefined\n\nexport const resolveClipColor = (color: string | undefined, tokens: ClipThemeTokens) => {\n  if (color === 'clip-audio') return tokens['clip-audio']\n  if (color === 'clip-midi') return tokens['clip-midi']\n  if (color === 'clip-recording') return tokens['clip-recording']\n  return parseHexColor(color, tokens['clip-audio'])\n}\n\nexport const createClipVisualColors = (color: string, selected: boolean, ghost: boolean) => {\n  const backgroundPercent = ghost ? 20 : selected ? 30 : 20\n  const borderPercent = ghost ? 60 : selected ? 85 : 60\n  return {\n    'background-color': `color-mix(in srgb, ${color} ${backgroundPercent}%, transparent)`,\n    'border-color': `color-mix(in srgb, ${color} ${borderPercent}%, transparent)`,\n  }\n}\n"""

upstream_clip_color = Path("examples/solid1-daw/src/upstream/lib/clip-color.ts")
upstream_clip_color.parent.mkdir(parents=True, exist_ok=True)
upstream_clip_color.write_text(clip_color_source)

Path("examples/solid1-daw/src/compat/theme-resolver.ts").write_text(
    'export type ResolvedThemeTokens = {\n'
    '  "clip-audio": string\n'
    '  "clip-midi": string\n'
    '  "clip-recording": string\n'
    '}\n'
)

replace_once(
    "examples/solid1-daw/kobalte-native-aliases.ts",
    '  { find: /^~\\/lib\\/clip-color$/, replacement: compat("clip-color.ts") },\n',
    '  { find: /^~\\/lib\\/clip-color$/, replacement: upstream("lib/clip-color.ts") },\n'
    '  { find: /^~\\/lib\\/theme\\/theme-resolver$/, replacement: compat("theme-resolver.ts") },\n',
)

replace_once(
    "examples/solid1-daw/tsconfig.json",
    '      "~/lib/clip-color": [\n        "src/compat/clip-color.ts"\n      ],\n',
    '      "~/lib/clip-color": [\n        "src/upstream/lib/clip-color.ts"\n      ],\n'
    '      "~/lib/theme/theme-resolver": [\n        "src/compat/theme-resolver.ts"\n      ],\n',
)

replace_once(
    "examples/solid1-daw/scripts/check-upstream-source-parity.mjs",
    '  ["src/upstream/lib/color.ts", "src/lib/color.ts", "45aeae66c920ae4aecc7241a396cb054c0ec027b"],\n',
    '  ["src/upstream/lib/color.ts", "src/lib/color.ts", "45aeae66c920ae4aecc7241a396cb054c0ec027b"],\n'
    '  ["src/upstream/lib/clip-color.ts", "src/lib/clip-color.ts", "227b11ddf401770a0b7fdf2a89ec6bdb17ff5f01"],\n',
)

compat_clip_color = Path("examples/solid1-daw/src/compat/clip-color.ts")
if not compat_clip_color.exists():
    raise SystemExit("expected handmade clip-color compatibility adapter")
compat_clip_color.unlink()

mix_helper = r'''function normalizeTransparentColorMix(value: string): string | undefined {
  const match = value.match(
    /^color-mix\(in\s+(?:srgb|oklab),\s*(.+)\s+(\d+(?:\.\d+)?)%,\s*transparent\s*\)$/i,
  )
  const color = match?.[1]?.trim()
  const percent = match?.[2]
  if (!color || percent === undefined) return undefined

  const mixAlpha = Number(percent) / 100
  if (!Number.isFinite(mixAlpha)) return undefined
  const alpha = clamp(mixAlpha, 0, 1)

  const oklch = parseOklch(color)
  if (oklch) {
    const [red, green, blue] = oklchToSrgb(oklch.lightness, oklch.chroma, oklch.hue)
    return formatSrgbColor(red, green, blue, oklch.alpha * alpha)
  }

  const hsl = parseHsl(color)
  if (hsl) {
    const [red, green, blue] = hslToSrgb(hsl.hue, hsl.saturation, hsl.lightness)
    return formatSrgbColor(red, green, blue, hsl.alpha * alpha)
  }

  const rgb = parseRgb(color)
  if (rgb) return formatSrgbColor(rgb.red, rgb.green, rgb.blue, rgb.alpha * alpha)

  const hex = parseHexSrgb(color)
  if (hex) return formatSrgbColor(hex.red, hex.green, hex.blue, hex.alpha * alpha)
  return undefined
}

function parseHexSrgb(value: string): ParsedRgb | undefined {
  const match = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  const source = match?.[1]
  if (!source) return undefined
  const expanded = source.length <= 4
    ? [...source].map((digit) => `${digit}${digit}`).join("")
    : source
  const red = Number.parseInt(expanded.slice(0, 2), 16)
  const green = Number.parseInt(expanded.slice(2, 4), 16)
  const blue = Number.parseInt(expanded.slice(4, 6), 16)
  const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1
  if (![red, green, blue, alpha].every(Number.isFinite)) return undefined
  return { red, green, blue, alpha }
}

'''

for native_style_path in [
    "packages/solid/src/native-style.ts",
    "packages/solid1/src/native-style.ts",
]:
    file = Path(native_style_path)
    text = file.read_text()
    if text.count("normalizePublishedNativeColors") < 2:
        raise SystemExit(f"{native_style_path}: expected existing native color normalizer")
    text = text.replace("normalizePublishedNativeColors", "normalizeNativeStyleColors")
    text = text.replace(
        "function normalizeNativeStyleColors(style: StyleDesc | undefined): StyleDesc | undefined {",
        "export function normalizeNativeStyleColors(style: StyleDesc | undefined): StyleDesc | undefined {",
        1,
    )
    text = text.replace(
        "  const transparentMix = normalizeTransparentOklchMix(trimmed)\n  const normalized = transparentMix ?? trimmed\n",
        "  const transparentMix = normalizeTransparentColorMix(trimmed)\n  if (transparentMix !== undefined) return transparentMix\n  const normalized = trimmed\n",
        1,
    )
    updated, count = re.subn(
        r"function normalizeTransparentOklchMix\(value: string\): string \| undefined \{.*?\n\}\n\n(?=interface ParsedOklch)",
        mix_helper,
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise SystemExit(f"{native_style_path}: expected one transparent color-mix helper")
    file.write_text(updated)

replace_once(
    "packages/solid/src/host/universal.ts",
    '  mergeNativeStyles,\n  onNativeStyleEnvironmentChange,\n',
    '  mergeNativeStyles,\n  normalizeNativeStyleColors,\n  onNativeStyleEnvironmentChange,\n',
)
replace_once(
    "packages/solid/src/host/universal.ts",
    '  if (parsedColumnGap !== undefined) normalized.columnGap = parsedColumnGap\n  return normalized\n}\n',
    '  if (parsedColumnGap !== undefined) normalized.columnGap = parsedColumnGap\n  return normalizeNativeStyleColors(normalized) ?? normalized\n}\n',
)

replace_once(
    "packages/solid1/src/universal.ts",
    '  mergeNativeStyles,\n  onNativeStyleEnvironmentChange,\n',
    '  mergeNativeStyles,\n  normalizeNativeStyleColors,\n  onNativeStyleEnvironmentChange,\n',
)
replace_once(
    "packages/solid1/src/universal.ts",
    '  if (parsedColumnGap !== undefined) normalized.columnGap = parsedColumnGap\n\n  return normalized\n}\n',
    '  if (parsedColumnGap !== undefined) normalized.columnGap = parsedColumnGap\n\n  return normalizeNativeStyleColors(normalized) ?? normalized\n}\n',
)

replace_once(
    "packages/solid1/scripts/check-host-parity.ts",
    'if (!translucentBlue?.backgroundColor?.startsWith("rgba(") || !translucentBlue.backgroundColor.endsWith(", 0.9)")) {\n'
    '  throw new Error(`transparent Tailwind color-mix must normalize to native sRGB alpha: ${JSON.stringify(translucentBlue)}`)\n'
    '}\n\n',
    'if (!translucentBlue?.backgroundColor?.startsWith("rgba(") || !translucentBlue.backgroundColor.endsWith(", 0.9)")) {\n'
    '  throw new Error(`transparent Tailwind color-mix must normalize to native sRGB alpha: ${JSON.stringify(translucentBlue)}`)\n'
    '}\n\n'
    'configureNativeStyleManifest({\n'
    '  classes: {\n'
    '    sourceClip: { base: { backgroundColor: "color-mix(in srgb, #00a76c 20%, transparent)" } },\n'
    '  },\n'
    '})\n'
    'const sourceClip = resolveNativeClassStyle("sourceClip", undefined)\n'
    'clearNativeStyleManifest()\n'
    'if (sourceClip?.backgroundColor !== "rgba(0, 167, 108, 0.2)") {\n'
    '  throw new Error(`source sRGB color-mix must normalize to native alpha: ${JSON.stringify(sourceClip)}`)\n'
    '}\n\n',
)

replace_once(
    "packages/solid/test/source-style-parity.test.ts",
    '  clearNativeStyleManifest,\n  configureNativeStyleManifest,\n',
    '  clearNativeStyleManifest,\n  configureNativeStyleManifest,\n  resolveNativeClassStyle,\n',
)
replace_once(
    "packages/solid/test/source-style-parity.test.ts",
    '  it("serializes copied inline SVG markup into the native svg source", () => {\n',
    '  it("normalizes source sRGB transparent color mixes", () => {\n'
    '    configureNativeStyleManifest({\n'
    '      classes: {\n'
    '        clip: { base: { backgroundColor: "color-mix(in srgb, #00a76c 20%, transparent)" } },\n'
    '      },\n'
    '    })\n'
    '    try {\n'
    '      expect(resolveNativeClassStyle("clip", undefined)?.backgroundColor).toBe("rgba(0, 167, 108, 0.2)")\n'
    '    } finally {\n'
    '      clearNativeStyleManifest()\n'
    '    }\n'
    '  })\n\n'
    '  it("serializes copied inline SVG markup into the native svg source", () => {\n',
)

replace_once(
    "examples/solid1-daw/src/test.tsx",
    '  app.renderer.clickCustomProps(armOff)\n'
    '  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")\n'
    '  app.renderer.clickCustomProps(armOn)\n',
    '  const armInactiveBackground = app.renderer.styleCustomProps(armOff).backgroundColor ?? ""\n'
    '  app.renderer.clickCustomProps(armOff)\n'
    '  requireCondition(app.renderer.hasCustomProps(armOn), "exact source record arm should expose Disarm after activation")\n'
    '  const armActiveBackground = app.renderer.styleCustomProps(armOn).backgroundColor ?? ""\n'
    '  requireCondition(\n'
    '    armActiveBackground !== "" && armActiveBackground !== armInactiveBackground,\n'
    '    `exact source record-arm bg-red-500 state should change native paint, got ${JSON.stringify({ inactive: armInactiveBackground, active: armActiveBackground })}`,\n'
    '  )\n'
    '  app.renderer.clickCustomProps(armOn)\n',
)

print("exact DAW clip color and native color-mix compatibility patch applied")
