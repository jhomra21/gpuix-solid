from pathlib import Path

ROOT = Path("examples/solid1-daw")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise SystemExit(f"missing {label}")
    return text.replace(old, new, 1)


# Browser-only waveform boundaries beneath exact source.
(ROOT / "src/compat/useClipWaveformViewModel.ts").write_text('''import type { RuntimeClip } from "../upstream/lib/timeline-runtime-types"\n\ntype Options = {\n  clip: () => RuntimeClip\n  cssWidthPx: () => number\n  projectBpm: () => number\n  ensureClipBuffer?: (clipId: string, sampleUrl?: string) => Promise<void>\n}\n\nexport function useClipWaveformViewModel(options: Options) {\n  return {\n    layout: () => {\n      const width = Math.max(0, Math.floor(options.cssWidthPx()))\n      return { padPx: 0, drawCols: width, audioStartPx: 0, audioEndPx: width }\n    },\n    peaks: (): Uint8Array | null => null,\n  }\n}\n''')

(ROOT / "src/compat/render-waveform.ts").write_text('''type WaveformRenderOptions = {\n  ctx: CanvasRenderingContext2D\n  peaks: Uint8Array\n  drawCols: number\n  padPx: number\n  topY: number\n  contentH: number\n  cssW: number\n  cssH: number\n  fillStyle: string\n  boundaryStyle: string\n  maxHeightFraction: number\n  amplitudeScaleAtColumn?: (column: number) => number\n}\n\nexport function drawWaveformPeaks(_options: WaveformRenderOptions): void {\n  // GPUIX 0.7 has no Canvas 2D surface. Exact source feature-detects this through getContext().\n}\n''')

# TypeScript path aliases use exact pure upstream contracts.
tsconfig = ROOT / "tsconfig.json"
text = tsconfig.read_text()
for old, new in {
    '"src/compat/timeline-core-types.ts"': '"src/upstream/packages/timeline-core/types.ts"',
    '"src/compat/clip-fades.ts"': '"src/upstream/packages/timeline-core/clip-fades.ts"',
    '"src/compat/timeline-range-selection.ts"': '"src/upstream/lib/timeline-range-selection.ts"',
}.items():
    text = text.replace(old, new)
anchor = '      "solid-js/web": [\n        "src/compat/solid-web.ts"\n      ],\n'
additions = '''      "@daw-browser/waveforms/render-waveform": [
        "src/compat/render-waveform.ts"
      ],
      "~/hooks/useClipWaveformViewModel": [
        "src/compat/useClipWaveformViewModel.ts"
      ],
      "~/lib/timeline-runtime-types": [
        "src/upstream/lib/timeline-runtime-types.ts"
      ],
'''
if '"@daw-browser/waveforms/render-waveform"' not in text:
    if anchor not in text:
        raise SystemExit("tsconfig alias anchor missing")
    text = text.replace(anchor, anchor + additions, 1)
tsconfig.write_text(text)

# Vite aliases mirror TypeScript aliases.
aliases = ROOT / "kobalte-native-aliases.ts"
text = aliases.read_text()
text = text.replace('compat("timeline-core-types.ts")', 'upstream("packages/timeline-core/types.ts")')
text = text.replace('compat("clip-fades.ts")', 'upstream("packages/timeline-core/clip-fades.ts")')
text = text.replace('compat("timeline-range-selection.ts")', 'upstream("lib/timeline-range-selection.ts")')
anchor = '  { find: /^@daw-browser\\/shared$/, replacement: compat("daw-browser-shared.ts") },\n'
additions = '''  { find: /^@daw-browser\\/waveforms\\/render-waveform$/, replacement: compat("render-waveform.ts") },
  { find: /^~\\/hooks\\/useClipWaveformViewModel$/, replacement: compat("useClipWaveformViewModel.ts") },
  { find: /^~\\/lib\\/timeline-runtime-types$/, replacement: upstream("lib/timeline-runtime-types.ts") },
'''
if 'waveforms\\/render-waveform' not in text:
    if anchor not in text:
        raise SystemExit("Vite alias anchor missing")
    text = text.replace(anchor, anchor + additions, 1)
aliases.write_text(text)

# Hash-lock the complete active clip dependency closure.
checker = ROOT / "scripts/check-upstream-source-parity.mjs"
text = checker.read_text()
track_lane = '  ["src/upstream/components/timeline/TrackLane.tsx", "src/components/timeline/TrackLane.tsx", "82850963b07f67a3655068d8fe14122e290ece96"],\n'
clip_entries = '''  ["src/upstream/components/timeline/ClipComponent.tsx", "src/components/timeline/ClipComponent.tsx", "c3a04366bba4de6bc4b64973d859bb62e154b3af"],
  ["src/upstream/components/timeline/ClipFadeOverlay.tsx", "src/components/timeline/ClipFadeOverlay.tsx", "a59881604bc1bef7199946883e2d763df957df8d"],
  ["src/upstream/components/timeline/clip-fade-interaction.ts", "src/components/timeline/clip-fade-interaction.ts", "732e2355096848ce3a84f3bd5e42dd6b50d0c5e9"],
'''
if 'c3a04366bba4de6bc4b64973d859bb62e154b3af' not in text:
    if track_lane not in text:
        raise SystemExit("source checker TrackLane anchor missing")
    text = text.replace(track_lane, track_lane + clip_entries, 1)
lib_anchor = '  ["src/upstream/lib/timeline-utils.ts", "src/lib/timeline-utils.ts", "4ddf52866d6f616ffe6b9da2e8c1362dfe9dad39"],\n'
lib_entries = '''  ["src/upstream/lib/timeline-runtime-types.ts", "src/lib/timeline-runtime-types.ts", "7b5c026817b3a22428862999815e93501e9d75bc"],
  ["src/upstream/lib/timeline-range-selection.ts", "src/lib/timeline-range-selection.ts", "d197450a36b15e1f909f5ab3713d6535f1a60217"],
'''
if '7b5c026817b3a22428862999815e93501e9d75bc' not in text:
    if lib_anchor not in text:
        raise SystemExit("source checker timeline-utils anchor missing")
    text = text.replace(lib_anchor, lib_anchor + lib_entries, 1)
checker.write_text(text)

# Native state adapters satisfy the canonical exact Track<TBuffer> schema.
for rel in ("TimelineWorkspace.tsx", "TrackLane.tsx"):
    path = ROOT / "src/native" / rel
    source = path.read_text()
    if "    volume: track.volume,\n" not in source:
        source = replace_once(source, "    name: track.name,\n", "    name: track.name,\n    volume: track.volume,\n", f"{rel} sourceTrack volume anchor")
    path.write_text(source)

# Keep one canonical Clip/Track schema for native adapters too.
(ROOT / "src/compat/timeline-core-types.ts").write_text('''import type { Clip as CoreClip, Track as CoreTrack } from "../upstream/packages/timeline-core/types"\n\nexport type { TrackId, TrackChannelRole, TrackSend, TrackRouting } from "../upstream/packages/timeline-core/types"\nexport type RuntimeClip = CoreClip<AudioBuffer>\nexport type Clip = RuntimeClip\nexport type Track = CoreTrack<AudioBuffer>\n''')

# Solid 1 JSX needs exact source SVG/canvas surface declarations.
jsx = Path("packages/solid1/jsx-runtime.d.ts")
text = jsx.read_text()
if '"vector-effect"?: string | undefined' not in text:
    text = replace_once(
        text,
        '  "clip-path"?: string | undefined\n',
        '  "clip-path"?: string | undefined\n  "vector-effect"?: string | undefined\n  "data-fade-hover-side"?: string | undefined\n  "on:pointerenter"?: ((event: PointerEvent) => void) | undefined\n  "on:pointerleave"?: ((event: PointerEvent) => void) | undefined\n',
        "Solid1 SVG compatibility anchor",
    )
text = text.replace('    canvas: JSXProps<HostProps>\n', '    canvas: DomCompatibleProps<HostProps, SolidJSX.CanvasHTMLAttributes<HTMLCanvasElement>>\n', 1)
jsx.write_text(text)

# Reusable host truthfully reports Canvas 2D as unavailable on GPUIX 0.7.
for package in ("solid", "solid1"):
    nodes = Path(f"packages/{package}/src/host/nodes.ts")
    text = nodes.read_text()
    if "getContext(_contextId: string): null" not in text:
        text = replace_once(
            text,
            "  get clientWidth(): number {\n",
            "  getContext(_contextId: string): null {\n    // GPUIX 0.7 does not expose Canvas 2D; browser-source code can feature-detect a null context.\n    return null\n  }\n\n  get clientWidth(): number {\n",
            f"{package} canvas compatibility anchor",
        )
    nodes.write_text(text)
