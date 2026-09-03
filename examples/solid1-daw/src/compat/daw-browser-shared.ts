export * from "../upstream/packages/shared/master-volume"
export * from "../upstream/packages/shared/track-routing-core"
export * from "../upstream/packages/shared/track-tree"
export * from "../upstream/packages/shared/clip-color"

export type AudioSourceKind = "upload" | "url" | "recording"
export type AudioWarpMode = "repitch" | "stretch"
export type AudioWarpMarker = { id: string; sourceBeat: number; timelineBeat: number }
export type AudioWarpPayload = {
  enabled: boolean
  sourceBpm?: number
  sourceBeatOffset?: number
  markers?: AudioWarpMarker[]
  mode: AudioWarpMode
}
export type MidiClip = { notes?: readonly unknown[] }

type LocalIdKind = "project" | "track" | "clip" | "asset"

export const isLocalId = (kind: LocalIdKind, value: string) => value.startsWith(`${kind}:`)

export function assertDefined<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message)
  return value
}

export type AutomationInterpolation = "linear" | "hold"
export type AutomationTargetKind = "track" | "master"
export type AutomationPoint = {
  id: string
  timeSec: number
  value: number
  interpolation: AutomationInterpolation
}
export type AutomationTarget =
  | { kind: "track"; trackId: string; effectInstanceId?: string }
  | { kind: "master"; effectInstanceId?: string }
export type AutomationEnvelope = {
  id: string
  projectId: string
  target: AutomationTarget
  targetKey: string
  parameterId: string
  enabled: boolean
  points: AutomationPoint[]
  updatedAt: number
}
export type AutomationParameterSelection = {
  parameterId: string
  effectInstanceId?: string
}
export type AutomationExternalParameter = {
  id: number
  title: string
  unit: string
  readOnly: boolean
  hidden: boolean
}
export type AutomationTargetDeviceInstance = {
  id: string
  kind: string
  name?: string
  parameters?: readonly AutomationExternalParameter[]
}
export type AutomationTargetParameterOption = AutomationParameterSelection & {
  id: string
  label: string
  group: string
  device: string
}
export type AutomationParameterDescriptor = {
  id: string
  label: string
  group: string
  device: string
  owner: string
  targetKinds: AutomationTargetKind[]
  min: number
  max: number
  defaultValue: number
  scale: "linear" | "log"
  interpolation?: AutomationInterpolation
  valueKind?: "continuous" | "integer"
  unit?: "db" | "hz" | "percent" | "seconds" | "milliseconds" | "semitones" | "cents" | "octaves"
}

export const AUTOMATION_TARGET_KEY_V2_PREFIX = "automation:v2:"

export const automationTargetKey = (target: AutomationTarget, parameterId: string): string => (
  `${AUTOMATION_TARGET_KEY_V2_PREFIX}${JSON.stringify([
    target.kind,
    target.kind === "track" ? target.trackId : null,
    target.effectInstanceId ?? null,
    parameterId,
  ])}`
)

const clampAutomationValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const volumeAutomationDescriptor: AutomationParameterDescriptor = {
  id: "volume",
  label: "Volume",
  group: "Mixer",
  device: "Mixer",
  owner: "mixer",
  targetKinds: ["track", "master"],
  min: 0,
  max: 2,
  defaultValue: 1,
  scale: "linear",
  unit: "percent",
}

export const normalizeAutomationValue = (
  value: number,
  descriptor: AutomationParameterDescriptor,
): number => {
  const clamped = clampAutomationValue(value, descriptor.min, descriptor.max)
  return descriptor.valueKind === "integer" ? Math.round(clamped) : clamped
}

export const getAutomationParameterDescriptor = (
  parameterId: string,
): AutomationParameterDescriptor | undefined => parameterId === volumeAutomationDescriptor.id
  ? volumeAutomationDescriptor
  : undefined

export const automationValueToRatio = (
  descriptor: AutomationParameterDescriptor,
  value: number,
): number => {
  const clamped = clampAutomationValue(value, descriptor.min, descriptor.max)
  if (descriptor.scale === "log") {
    const min = Math.max(Number.MIN_VALUE, descriptor.min)
    const max = Math.max(min, descriptor.max)
    return clampAutomationValue(Math.log(clamped / min) / Math.log(max / min), 0, 1)
  }
  return clampAutomationValue((clamped - descriptor.min) / (descriptor.max - descriptor.min), 0, 1)
}

export const automationRatioToValue = (
  descriptor: AutomationParameterDescriptor,
  ratio: number,
): number => {
  const clamped = clampAutomationValue(ratio, 0, 1)
  if (descriptor.scale === "log") {
    const min = Math.max(Number.MIN_VALUE, descriptor.min)
    const max = Math.max(min, descriptor.max)
    return min * ((max / min) ** clamped)
  }
  return descriptor.min + clamped * (descriptor.max - descriptor.min)
}

const isAutomationInterpolation = (value: string): value is AutomationInterpolation => value === "linear" || value === "hold"

export const normalizeAutomationPoints = (
  points: AutomationPoint[],
  descriptor: AutomationParameterDescriptor,
): AutomationPoint[] => {
  const byTime = new Map<number, AutomationPoint>()
  for (const point of points) {
    if (!Number.isFinite(point.timeSec) || !Number.isFinite(point.value) || !point.id) continue
    const timeSec = Math.max(0, point.timeSec)
    byTime.set(timeSec, {
      id: point.id,
      timeSec,
      value: normalizeAutomationValue(point.value, descriptor),
      interpolation: descriptor.interpolation === "hold"
        ? "hold"
        : isAutomationInterpolation(point.interpolation) ? point.interpolation : "linear",
    })
  }
  return [...byTime.values()].sort((a, b) => a.timeSec - b.timeSec || a.id.localeCompare(b.id))
}

export const valueAtAutomationTime = (
  points: readonly AutomationPoint[],
  timeSec: number,
  fallbackValue: number,
): number => {
  if (points.length === 0) return fallbackValue
  const first = points[0]
  if (!first || timeSec <= first.timeSec) return first?.value ?? fallbackValue
  let low = 1
  let high = points.length - 1
  let nextIndex = points.length
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const point = points[middle]
    if (!point) {
      high = middle - 1
      continue
    }
    if (timeSec <= point.timeSec) {
      nextIndex = middle
      high = middle - 1
    } else {
      low = middle + 1
    }
  }
  if (nextIndex >= points.length) return points[points.length - 1]?.value ?? fallbackValue
  const previous = points[nextIndex - 1]
  const next = points[nextIndex]
  if (!previous || !next) return fallbackValue
  if (timeSec === next.timeSec) return next.value
  if (previous.interpolation === "hold") return previous.value
  const span = next.timeSec - previous.timeSec
  if (span <= 0) return next.value
  const progress = (timeSec - previous.timeSec) / span
  return previous.value + ((next.value - previous.value) * progress)
}

export const automationEnvelopeValueRange = (
  envelope: AutomationEnvelope | undefined,
  bounds?: { min: number; max: number },
): { min: number; max: number } | undefined => {
  if (!envelope || envelope.points.length === 0) return undefined
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const point of envelope.points) {
    min = Math.min(min, point.value)
    max = Math.max(max, point.value)
  }
  if (!bounds) return { min, max }
  return {
    min: Math.max(bounds.min, Math.min(bounds.max, min)),
    max: Math.max(bounds.min, Math.min(bounds.max, max)),
  }
}

export const getAutomationParameterOptionsForTarget = (
  effects: readonly AutomationTargetDeviceInstance[],
  _trackId?: string,
): AutomationTargetParameterOption[] => [
  { id: "volume", parameterId: "volume", label: "Volume", group: "Mixer", device: "Mixer" },
  ...effects.flatMap((effect) => {
    if (effect.kind !== "external" || !effect.parameters) return []
    return effect.parameters
      .filter((parameter) => !parameter.hidden)
      .map((parameter) => {
        const parameterId = `vst3:${effect.id}:${parameter.id}`
        return {
          id: parameterId,
          parameterId,
          label: parameter.title,
          group: "VST3",
          device: effect.name ?? "VST3",
          effectInstanceId: effect.id,
        }
      })
  }),
]

export type EqBandType =
  | "lowpass"
  | "highpass"
  | "bandpass"
  | "lowshelf"
  | "highshelf"
  | "peaking"
  | "notch"
  | "allpass"

export type EqBandParams = {
  id: string
  frequency: number
  gainDb: number
  q: number
  enabled: boolean
  type: EqBandType
}


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
