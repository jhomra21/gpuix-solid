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

export const AUTOMATION_TARGET_KEY_V2_PREFIX = "automation:v2:"

export const automationTargetKey = (target: AutomationTarget, parameterId: string): string => (
  `${AUTOMATION_TARGET_KEY_V2_PREFIX}${JSON.stringify([
    target.kind,
    target.kind === "track" ? target.trackId : null,
    target.effectInstanceId ?? null,
    parameterId,
  ])}`
)

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
