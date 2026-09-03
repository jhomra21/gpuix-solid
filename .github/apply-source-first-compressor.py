from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if old not in text:
        raise SystemExit(f"anchor missing in {path}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


# Keep the planner helper inferred so anti-slop preserves the concrete evidence.
replace_once(
    "examples/solid1-daw/src/native/Timeline.tsx",
    "function nextGroupIdentity(tracks: readonly NativeTrack[]): { id: string; name: string } {",
    "function nextGroupIdentity(tracks: readonly NativeTrack[]) {",
)

# Compressor's exact graph uses <pattern>. This is generic inline-SVG support,
# so add it to both host generations rather than special-casing the DAW.
for path in [
    "packages/solid1/src/universal.ts",
    "packages/solid/src/host/universal.ts",
]:
    replace_once(
        path,
        '  "path", "g", "defs", "linearGradient", "radialGradient", "stop", "rect", "circle",\n',
        '  "path", "g", "defs", "pattern", "linearGradient", "radialGradient", "stop", "rect", "circle",\n',
    )

for path in [
    "packages/solid1/jsx-runtime.d.ts",
    "packages/solid/jsx-runtime.d.ts",
]:
    replace_once(
        path,
        "    defs: InlineSvgChildProps\n",
        "    defs: InlineSvgChildProps\n    pattern: InlineSvgChildProps\n",
    )

# Mirror the already-validated Solid1 SVG child event fallthrough into Solid2.
replace_once(
    "packages/solid/src/host/universal.ts",
    '''    if (semanticTag !== "svg") {
      setSvgAttribute(node, name, value)
      refreshInlineSvg(node)
      return
    }
''',
    '''    if (semanticTag !== "svg" && isSvgMarkupAttribute(name)) {
      setSvgAttribute(node, name, value)
      refreshInlineSvg(node)
      return
    }
''',
)

replace_once(
    "packages/solid/jsx-runtime.d.ts",
    '''  onClick?: HostEventHandler | undefined
  onPointerDown?: HostEventHandler | undefined
  onPointerUp?: HostEventHandler | undefined
''',
    '''  onClick?: HostEventHandler | undefined
  onPointerDown?: HostEventHandler | undefined
  onPointerMove?: HostEventHandler | undefined
  onPointerUp?: HostEventHandler | undefined
  onPointerCancel?: HostEventHandler | undefined
  onPointerEnter?: HostEventHandler | undefined
  onPointerLeave?: HostEventHandler | undefined
  onDblClick?: HostEventHandler | undefined
  onContextMenu?: HostEventHandler | undefined
  onKeyDown?: HostEventHandler | undefined
''',
)

# The exact device's engine is optional. Publish only the meter contract it
# imports; the deterministic fixture deliberately supplies no audio engine.
audio_engine_path = "examples/solid1-daw/src/compat/audio-engine.ts"
audio_engine = read(audio_engine_path)
if "export type CompressorMeterFrame" not in audio_engine:
    audio_engine += '''

export type CompressorMeterFrame = {
  inputDb: number
  outputDb: number
  gainReductionDb: number
  thresholdDb: number
}

export type CompressorMeterListener = (frame: CompressorMeterFrame) => void

export interface AudioEngine {
  subscribeMasterCompressorMeter: (effectInstanceId: string, listener: CompressorMeterListener) => () => void
  subscribeTrackCompressorMeter: (trackId: string, effectInstanceId: string, listener: CompressorMeterListener) => () => void
}
'''
    write(audio_engine_path, audio_engine)

# Exact compressor parameter contract/math used by the copied component. This
# lives at the @daw-browser/shared compatibility boundary because the full
# upstream shared package brings unrelated persistence/spectral dependencies.
shared_path = "examples/solid1-daw/src/compat/daw-browser-shared.ts"
shared = read(shared_path)
if "export type CompressorDetectorMode" not in shared:
    shared += '''

export type CompressorDetectorMode = "peak" | "rms"
export type CompressorDynamicsMode = "compress" | "expand"
export type CompressorEnvelopeCurve = "log" | "linear"
export type CompressorSidechainFilterType = "lowpass" | "highpass" | "bandpass"

export type CompressorSidechainParams = {
  enabled: boolean
  filterType: CompressorSidechainFilterType
  frequencyHz: number
  q: number
}

export type CompressorParams = {
  enabled: boolean
  thresholdDb: number
  ratio: number
  attackMs: number
  releaseMs: number
  autoRelease: boolean
  makeupDb: number
  outputDb: number
  dryWet: number
  kneeDb: number
  lookaheadMs: number
  detectorMode: CompressorDetectorMode
  dynamicsMode: CompressorDynamicsMode
  envelopeCurve: CompressorEnvelopeCurve
  sidechain: CompressorSidechainParams
}

export type CompressorParamsInput = Partial<Omit<CompressorParams, "sidechain">> & {
  sidechain?: Partial<CompressorSidechainParams>
}

export const COMPRESSOR_THRESHOLD_DB_MIN = -60
export const COMPRESSOR_THRESHOLD_DB_MAX = 0
export const COMPRESSOR_RATIO_MIN = 1
export const COMPRESSOR_RATIO_MAX = 100
export const COMPRESSOR_ATTACK_MS_MIN = 0.1
export const COMPRESSOR_ATTACK_MS_MAX = 100
export const COMPRESSOR_RELEASE_MS_MIN = 5
export const COMPRESSOR_RELEASE_MS_MAX = 1000
export const COMPRESSOR_GAIN_DB_MIN = -36
export const COMPRESSOR_GAIN_DB_MAX = 36
export const COMPRESSOR_DRY_WET_MIN = 0
export const COMPRESSOR_DRY_WET_MAX = 1
export const COMPRESSOR_KNEE_DB_MIN = 0
export const COMPRESSOR_KNEE_DB_MAX = 24
export const COMPRESSOR_LOOKAHEAD_MS_MIN = 0
export const COMPRESSOR_LOOKAHEAD_MS_MAX = 10
export const COMPRESSOR_SIDECHAIN_FREQUENCY_HZ_MIN = 20
export const COMPRESSOR_SIDECHAIN_FREQUENCY_HZ_MAX = 20000
export const COMPRESSOR_SIDECHAIN_Q_MIN = 0.1
export const COMPRESSOR_SIDECHAIN_Q_MAX = 18

const defaultCompressorSidechainParams: CompressorSidechainParams = {
  enabled: false,
  filterType: "highpass",
  frequencyHz: 120,
  q: 0.707,
}

const defaultCompressorParams: CompressorParams = {
  enabled: true,
  thresholdDb: -24,
  ratio: 4,
  attackMs: 10,
  releaseMs: 120,
  autoRelease: true,
  makeupDb: 0,
  outputDb: 0,
  dryWet: 1,
  kneeDb: 6,
  lookaheadMs: 0,
  detectorMode: "rms",
  dynamicsMode: "compress",
  envelopeCurve: "log",
  sidechain: defaultCompressorSidechainParams,
}

const clampCompressorValue = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function createDefaultCompressorParams(): CompressorParams {
  return {
    ...defaultCompressorParams,
    sidechain: { ...defaultCompressorSidechainParams },
  }
}

function normalizeCompressorParams(input: CompressorParamsInput = {}): CompressorParams {
  const sidechain = input.sidechain
  return {
    enabled: input.enabled ?? defaultCompressorParams.enabled,
    thresholdDb: clampCompressorValue(input.thresholdDb ?? defaultCompressorParams.thresholdDb, COMPRESSOR_THRESHOLD_DB_MIN, COMPRESSOR_THRESHOLD_DB_MAX),
    ratio: clampCompressorValue(input.ratio ?? defaultCompressorParams.ratio, COMPRESSOR_RATIO_MIN, COMPRESSOR_RATIO_MAX),
    attackMs: clampCompressorValue(input.attackMs ?? defaultCompressorParams.attackMs, COMPRESSOR_ATTACK_MS_MIN, COMPRESSOR_ATTACK_MS_MAX),
    releaseMs: clampCompressorValue(input.releaseMs ?? defaultCompressorParams.releaseMs, COMPRESSOR_RELEASE_MS_MIN, COMPRESSOR_RELEASE_MS_MAX),
    autoRelease: input.autoRelease ?? defaultCompressorParams.autoRelease,
    makeupDb: clampCompressorValue(input.makeupDb ?? defaultCompressorParams.makeupDb, COMPRESSOR_GAIN_DB_MIN, COMPRESSOR_GAIN_DB_MAX),
    outputDb: clampCompressorValue(input.outputDb ?? defaultCompressorParams.outputDb, COMPRESSOR_GAIN_DB_MIN, COMPRESSOR_GAIN_DB_MAX),
    dryWet: clampCompressorValue(input.dryWet ?? defaultCompressorParams.dryWet, COMPRESSOR_DRY_WET_MIN, COMPRESSOR_DRY_WET_MAX),
    kneeDb: clampCompressorValue(input.kneeDb ?? defaultCompressorParams.kneeDb, COMPRESSOR_KNEE_DB_MIN, COMPRESSOR_KNEE_DB_MAX),
    lookaheadMs: clampCompressorValue(input.lookaheadMs ?? defaultCompressorParams.lookaheadMs, COMPRESSOR_LOOKAHEAD_MS_MIN, COMPRESSOR_LOOKAHEAD_MS_MAX),
    detectorMode: input.detectorMode === "peak" ? "peak" : "rms",
    dynamicsMode: input.dynamicsMode === "expand" ? "expand" : "compress",
    envelopeCurve: input.envelopeCurve === "linear" ? "linear" : "log",
    sidechain: {
      enabled: sidechain?.enabled ?? defaultCompressorSidechainParams.enabled,
      filterType: sidechain?.filterType === "lowpass" || sidechain?.filterType === "bandpass" ? sidechain.filterType : "highpass",
      frequencyHz: clampCompressorValue(sidechain?.frequencyHz ?? defaultCompressorSidechainParams.frequencyHz, COMPRESSOR_SIDECHAIN_FREQUENCY_HZ_MIN, COMPRESSOR_SIDECHAIN_FREQUENCY_HZ_MAX),
      q: clampCompressorValue(sidechain?.q ?? defaultCompressorSidechainParams.q, COMPRESSOR_SIDECHAIN_Q_MIN, COMPRESSOR_SIDECHAIN_Q_MAX),
    },
  }
}

export function computeCompressorStaticCurveDb(inputDb: number, params: CompressorParamsInput = {}): number {
  const normalized = normalizeCompressorParams(params)
  const threshold = normalized.thresholdDb
  const ratio = normalized.ratio
  const knee = normalized.kneeDb
  if (normalized.dynamicsMode === "expand") {
    if (inputDb >= threshold) return inputDb
    const expanded = threshold + (inputDb - threshold) * ratio
    if (knee <= 0 || inputDb <= threshold - knee / 2) return expanded
    const distance = threshold - inputDb
    return inputDb - (2 * (ratio - 1) * distance * distance) / knee
  }
  const compressed = threshold + (inputDb - threshold) / ratio
  if (knee <= 0) return inputDb <= threshold ? inputDb : compressed
  const lower = threshold - knee / 2
  const upper = threshold + knee / 2
  if (inputDb <= lower) return inputDb
  if (inputDb >= upper) return compressed
  const x = inputDb - lower
  return inputDb + ((1 / ratio - 1) * x * x) / (2 * knee)
}
'''
    write(shared_path, shared)

# Lock every copied dependency to the exact pinned DAW Git blob.
parity_path = "examples/solid1-daw/scripts/check-upstream-source-parity.mjs"
parity = read(parity_path)
anchor = '  ["src/upstream/components/effects/eq-filter-type-select.tsx", "src/components/effects/eq-filter-type-select.tsx", "5dd5b8ff0bf426b29c0c4c9cbb247c08e534580b"],\n'
entries = '''  ["src/upstream/components/effects/Compressor.tsx", "src/components/effects/Compressor.tsx", "9ef86711b844b93cc647ef9a9d9c98c82441cba6"],
  ["src/upstream/components/effects/EffectShell.tsx", "src/components/effects/EffectShell.tsx", "bf2d4642b623d683099c430201daffac4f7b61cf"],
  ["src/upstream/components/ui/device-control.tsx", "src/components/ui/device-control.tsx", "dc2695685384e3db17ad216e18a3f7e21d3f0613"],
  ["src/upstream/components/ui/knob.tsx", "src/components/ui/knob.tsx", "78eae9b67c603e0f25154241aa3dcb806a7d7c64"],
  ["src/upstream/hooks/useSteppedValueControl.ts", "src/hooks/useSteppedValueControl.ts", "2a9c056f1632d258c62f099c3e65bdbda3286179"],
  ["src/upstream/hooks/useDrag.ts", "src/hooks/useDrag.ts", "a0fa4e76b10dd504a3ca3204cf9135ff50e73243"],
  ["src/upstream/components/timeline/create-effects-panel-device-collapse.tsx", "src/components/timeline/create-effects-panel-device-collapse.tsx", "98cd13fcb1464ea5c47d5e7c63b3416dc05d297c"],
  ["src/upstream/components/timeline/device-interaction.ts", "src/components/timeline/device-interaction.ts", "8d017592bce6f3a4b47688c79c6306822c37872d"],
'''
if "src/upstream/components/effects/Compressor.tsx" not in parity:
    if anchor not in parity:
        raise SystemExit("parity insertion anchor missing")
    parity = parity.replace(anchor, anchor + entries, 1)
    write(parity_path, parity)

# Scan every copied file that owns classes so unknown source styles fail closed.
sources_path = "examples/solid1-daw/native-tailwind.sources.json"
sources = read(sources_path)
source_anchor = '  "src/upstream/components/effects/eq-filter-type-select.tsx",\n'
source_entries = '''  "src/upstream/components/effects/Compressor.tsx",
  "src/upstream/components/effects/EffectShell.tsx",
  "src/upstream/components/ui/device-control.tsx",
  "src/upstream/components/ui/knob.tsx",
'''
if '"src/upstream/components/effects/Compressor.tsx"' not in sources:
    if source_anchor not in sources:
        raise SystemExit("native Tailwind source insertion anchor missing")
    sources = sources.replace(source_anchor, source_anchor + source_entries, 1)
    write(sources_path, sources)
