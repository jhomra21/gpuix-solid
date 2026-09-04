from pathlib import Path
from urllib.request import urlopen
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
DAW = ROOT / "examples/solid1-daw"
REVISION = "2eaad47813b15aa8511bab8dc04625510c977b12"
RAW_ROOT = f"https://raw.githubusercontent.com/jhomra21/daw-browser-convex/{REVISION}/"

SOURCES = [
    ("src/upstream/components/timeline/SampleDetailPanel.tsx", "src/components/timeline/SampleDetailPanel.tsx", "0bff56a5d6ba7f2792c744c22c2b63de10a07f0a"),
    ("src/upstream/components/timeline/SampleClipPanel.tsx", "src/components/timeline/SampleClipPanel.tsx", "de98fc3e8c9fa372390b2e66e332b326d434062d"),
    ("src/upstream/components/timeline/SampleDetailWaveform.tsx", "src/components/timeline/SampleDetailWaveform.tsx", "9b219e2d2e318a8c08c0b91d07d052b0abee5ee1"),
    ("src/upstream/lib/audio-warp-patch.ts", "src/lib/audio-warp-patch.ts", "3dda1b964e078e4bf6270738fe7e66e660f12c5b"),
    ("src/upstream/lib/audio-waveform-layout.ts", "src/lib/audio-waveform-layout.ts", "c934e48ac108931aa81b2e0dafff4e7c555fc3ce"),
    ("src/upstream/packages/timeline-core/audio-clip-time-map.ts", "packages/timeline-core/src/audio-clip-time-map.ts", "6e9bbc5882e3acdca7612cfe54a64abd362c5a30"),
]


def git_blob_sha(content: bytes) -> str:
    header = f"blob {len(content)}\0".encode()
    return hashlib.sha1(header + content).hexdigest()


for local_path, upstream_path, expected_blob in SOURCES:
    content = urlopen(RAW_ROOT + upstream_path).read().replace(b"\r\n", b"\n")
    actual_blob = git_blob_sha(content)
    if actual_blob != expected_blob:
        raise SystemExit(f"pinned source mismatch for {upstream_path}: {actual_blob} != {expected_blob}")
    destination = DAW / local_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)

# Extend the fail-closed source parity list with the exact pinned files.
parity_path = DAW / "scripts/check-upstream-source-parity.mjs"
parity = parity_path.read_text()
parity_anchor = '  ["src/compat/timeline-view.ts", "src/lib/timeline-view.ts", "9457d9d86a9cea1a9931c9a4f4aa2137bd239976"],\n]'
parity_entries = "\n".join(
    f'  ["{local}", "{upstream}", "{blob}"],'
    for local, upstream, blob in SOURCES
)
if SOURCES[0][0] not in parity:
    if parity_anchor not in parity:
        raise SystemExit("source parity insertion anchor missing")
    parity = parity.replace(parity_anchor, parity_entries + "\n" + parity_anchor, 1)
    parity_path.write_text(parity)

# Make the strict Tailwind scanner see every exact Sample Detail component.
tailwind_sources_path = DAW / "native-tailwind.sources.json"
tailwind_sources = json.loads(tailwind_sources_path.read_text())
for source in [
    "src/upstream/components/timeline/SampleDetailPanel.tsx",
    "src/upstream/components/timeline/SampleClipPanel.tsx",
    "src/upstream/components/timeline/SampleDetailWaveform.tsx",
]:
    if source not in tailwind_sources:
        tailwind_sources.append(source)
tailwind_sources_path.write_text(json.dumps(tailwind_sources, indent=2) + "\n")

# Exact source continues to import its original module names. Route only the
# unavailable browser/backend boundaries beneath it.
tsconfig_path = DAW / "tsconfig.json"
tsconfig = json.loads(tsconfig_path.read_text())
paths = tsconfig["compilerOptions"]["paths"]
paths["@daw-browser/timeline-core/audio-clip-time-map"] = ["src/upstream/packages/timeline-core/audio-clip-time-map.ts"]
paths["~/lib/bpm-detection-service"] = ["src/compat/bpm-detection-service.ts"]
paths["~/lib/audio-warp-patch"] = ["src/upstream/lib/audio-warp-patch.ts"]
paths["~/lib/audio-waveform-layout"] = ["src/upstream/lib/audio-waveform-layout.ts"]
tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + "\n")

aliases_path = DAW / "kobalte-native-aliases.ts"
aliases = aliases_path.read_text()
if "@daw-browser\\/timeline-core\\/audio-clip-time-map" not in aliases:
    anchor = '  { find: /^@daw-browser\\/timeline-core\\/clip-placement$/, replacement: upstream("packages/timeline-core/clip-placement.ts") },\n'
    addition = '  { find: /^@daw-browser\\/timeline-core\\/audio-clip-time-map$/, replacement: upstream("packages/timeline-core/audio-clip-time-map.ts") },\n'
    if anchor not in aliases:
        raise SystemExit("timeline-core alias insertion anchor missing")
    aliases = aliases.replace(anchor, addition + anchor, 1)
if "~\\/lib\\/bpm-detection-service" not in aliases:
    anchor = '  { find: /^~\\/lib\\/clip-color$/, replacement: compat("clip-color.ts") },\n'
    addition = (
        '  { find: /^~\\/lib\\/bpm-detection-service$/, replacement: compat("bpm-detection-service.ts") },\n'
        '  { find: /^~\\/lib\\/audio-warp-patch$/, replacement: upstream("lib/audio-warp-patch.ts") },\n'
        '  { find: /^~\\/lib\\/audio-waveform-layout$/, replacement: upstream("lib/audio-waveform-layout.ts") },\n'
    )
    if anchor not in aliases:
        raise SystemExit("DAW lib alias insertion anchor missing")
    aliases = aliases.replace(anchor, addition + anchor, 1)
aliases_path.write_text(aliases)

# The pinned shared package is a browser/application dependency tree of its own.
# Keep only the exact math contract needed by the copied Sample Detail source at
# this existing compatibility boundary instead of pulling zod/browser storage in.
shared_path = DAW / "src/compat/daw-browser-shared.ts"
shared = shared_path.read_text()
if "export function createDefaultAudioWarp" not in shared:
    shared += '''\n\nconst MIN_WARP_BPM = 30\nconst MAX_WARP_BPM = 300\nconst MIN_SOURCE_BEAT_OFFSET = -16\nconst MAX_SOURCE_BEAT_OFFSET = 16\nconst SOURCE_BEAT_OFFSET_PRECISION = 1_000\n\nconst normalizeWarpBpm = (value: number | undefined) => (\n  value !== undefined && Number.isFinite(value)\n    ? Math.round(Math.min(MAX_WARP_BPM, Math.max(MIN_WARP_BPM, value)) * 100) / 100\n    : undefined\n)\n\nexport const normalizeSourceBeatOffsetValue = (value: number) => (\n  Math.round(Math.min(MAX_SOURCE_BEAT_OFFSET, Math.max(MIN_SOURCE_BEAT_OFFSET, value)) * SOURCE_BEAT_OFFSET_PRECISION)\n  / SOURCE_BEAT_OFFSET_PRECISION\n)\n\nexport function mapTimelineBeatToSourceBeat(markers: readonly AudioWarpMarker[], timelineBeat: number): number {\n  if (markers.length === 0) return timelineBeat\n  if (markers.length === 1) return timelineBeat + markers[0].sourceBeat - markers[0].timelineBeat\n  let left = markers[0]\n  let right = markers[1]\n  for (let index = 0; index < markers.length - 1; index += 1) {\n    const candidateRight = markers[index + 1]\n    if (timelineBeat <= candidateRight.timelineBeat || index === markers.length - 2) {\n      left = markers[index]\n      right = candidateRight\n      break\n    }\n  }\n  const timelineSpan = Math.max(1e-6, right.timelineBeat - left.timelineBeat)\n  return left.sourceBeat + (timelineBeat - left.timelineBeat) * ((right.sourceBeat - left.sourceBeat) / timelineSpan)\n}\n\nexport function mapSourceBeatToTimelineBeat(markers: readonly AudioWarpMarker[], sourceBeat: number): number {\n  if (markers.length === 0) return sourceBeat\n  if (markers.length === 1) return sourceBeat + markers[0].timelineBeat - markers[0].sourceBeat\n  let left = markers[0]\n  let right = markers[1]\n  for (let index = 0; index < markers.length - 1; index += 1) {\n    const candidateRight = markers[index + 1]\n    if (sourceBeat <= candidateRight.sourceBeat || index === markers.length - 2) {\n      left = markers[index]\n      right = candidateRight\n      break\n    }\n  }\n  const sourceSpan = Math.max(1e-6, right.sourceBeat - left.sourceBeat)\n  return left.timelineBeat + (sourceBeat - left.sourceBeat) * ((right.timelineBeat - left.timelineBeat) / sourceSpan)\n}\n\nexport const normalizeClipGain = (gain: number) => Math.min(2, Math.max(0, gain))\nexport const linearGainToDb = (gain: number) => gain <= 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(gain)\nexport const dbToLinearGain = (db: number) => Number.isFinite(db) ? normalizeClipGain(10 ** (db / 20)) : 0\n\nexport function createDefaultAudioWarp(projectBpm: number): AudioWarpPayload {\n  return { enabled: false, sourceBpm: normalizeWarpBpm(projectBpm), mode: "repitch" }\n}\n\nexport function normalizeAudioWarp(value: Partial<AudioWarpPayload> | undefined): AudioWarpPayload | undefined {\n  if (value === undefined) return undefined\n  const sourceBeatOffset = value.sourceBeatOffset === undefined ? undefined : normalizeSourceBeatOffsetValue(value.sourceBeatOffset)\n  return {\n    enabled: value.enabled === true,\n    sourceBpm: normalizeWarpBpm(value.sourceBpm),\n    sourceBeatOffset: sourceBeatOffset === 0 ? undefined : sourceBeatOffset,\n    markers: value.markers,\n    mode: value.mode === "stretch" ? "stretch" : "repitch",\n  }\n}\n'''
    shared_path.write_text(shared)

# Deterministic service boundary used by the exact panel. It preserves the source
# state machine while replacing only unavailable analysis/rendering backends.
bpm_path = DAW / "src/compat/bpm-detection-service.ts"
bpm_path.write_text('''import type { AudioWarp, Clip } from "../upstream/packages/timeline-core/types"\n\nexport type BpmDetectionResult = {\n  bpm: number\n  confidence: number\n  alternatives: { bpm: number; confidence: number }[]\n}\n\nexport type BpmSuggestionState =\n  | { status: "idle" }\n  | { status: "analyzing" }\n  | { status: "suggested"; result: BpmDetectionResult }\n  | { status: "applied"; result: BpmDetectionResult }\n  | { status: "failed"; message: string }\n\ntype Listener = () => void\ntype AnalyzeClipInput = {\n  clip: Pick<Clip, "id" | "audioWarp">\n  canWrite: boolean\n  autoApply: (audioWarp: AudioWarp) => Promise<boolean>\n}\n\nconst RESULT: BpmDetectionResult = {\n  bpm: 118,\n  confidence: 0.94,\n  alternatives: [\n    { bpm: 59, confidence: 0.62 },\n    { bpm: 236, confidence: 0.58 },\n  ],\n}\n\nexport function createBpmDetectionService() {\n  const states = new Map<string, BpmSuggestionState>()\n  const listeners = new Set<Listener>()\n  const notify = () => { for (const listener of listeners) listener() }\n  const setState = (clipId: string, state: BpmSuggestionState) => { states.set(clipId, state); notify() }\n\n  return {\n    analyzeClip: async (input: AnalyzeClipInput) => {\n      setState(input.clip.id, { status: "analyzing" })\n      await Promise.resolve()\n      if (input.canWrite) {\n        const applied = await input.autoApply({ enabled: true, sourceBpm: RESULT.bpm, mode: "stretch" })\n        setState(input.clip.id, applied ? { status: "applied", result: RESULT } : { status: "suggested", result: RESULT })\n      } else {\n        setState(input.clip.id, { status: "suggested", result: RESULT })\n      }\n      return RESULT\n    },\n    markApplied: (clipId: string) => {\n      const state = states.get(clipId)\n      if (state?.status === "suggested") setState(clipId, { status: "applied", result: state.result })\n    },\n    getState: (clipId: string): BpmSuggestionState => states.get(clipId) ?? { status: "idle" },\n    subscribe: (listener: Listener) => { listeners.add(listener); return () => listeners.delete(listener) },\n  }\n}\n\nexport type BpmDetectionService = ReturnType<typeof createBpmDetectionService>\n''')

audio_engine_path = DAW / "src/compat/audio-engine.ts"
audio_engine_path.write_text('''import type { Clip } from "../upstream/packages/timeline-core/types"\n\nexport type TrackStereoLevels = { left: number; right: number }\nexport type CompressorMeterFrame = { inputDb: number; outputDb: number; gainReductionDb: number; thresholdDb: number }\nexport type CompressorMeterListener = (frame: CompressorMeterFrame) => void\nexport type AudioStretchRenderState = { status: "idle" | "rendering" | "ready" | "failed"; error?: Error }\n\nexport const isStretchQualityWarning = (playbackRate: number) => playbackRate < 0.75 || playbackRate > 1.33\n\nexport interface AudioEngine {\n  subscribeMasterCompressorMeter: (effectInstanceId: string, listener: CompressorMeterListener) => () => void\n  subscribeTrackCompressorMeter: (trackId: string, effectInstanceId: string, listener: CompressorMeterListener) => () => void\n  ensureStretchRender: (clip: Clip) => void\n  getStretchRenderState: (clip: Clip) => AudioStretchRenderState\n  subscribeStretchRenderState: (listener: () => void) => () => void\n}\n\nexport function createDeterministicAudioEngine(): AudioEngine {\n  const unsubscribe = () => {}\n  return {\n    subscribeMasterCompressorMeter: () => unsubscribe,\n    subscribeTrackCompressorMeter: () => unsubscribe,\n    ensureStretchRender: () => {},\n    getStretchRenderState: () => ({ status: "ready" }),\n    subscribeStretchRenderState: () => unsubscribe,\n  }\n}\n''')
