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

export type EqChannelMode = "stereo" | "mono"

export type EqParams = {
  bands: EqBandParams[]
  enabled: boolean
  channelMode: EqChannelMode
}

export const EQ_FREQUENCY_MIN = 20
export const EQ_FREQUENCY_MAX = 20000
export const EQ_GAIN_DB_MIN = -24
export const EQ_GAIN_DB_MAX = 24
export const EQ_Q_MIN = 0.2
export const EQ_Q_MAX = 18

const DEFAULT_EQ_FREQUENCIES = [40, 100, 200, 500, 1000, 2500, 6000, 12000]

function getDefaultEqBandType(index: number): EqBandType {
  if (index === 0) return "lowshelf"
  if (index === DEFAULT_EQ_FREQUENCIES.length - 1) return "highshelf"
  return "peaking"
}

export function createDefaultEqBand(index: number): EqBandParams {
  return {
    id: `b${index + 1}`,
    frequency: DEFAULT_EQ_FREQUENCIES[index] ?? 1000,
    gainDb: 0,
    q: 1,
    enabled: true,
    type: getDefaultEqBandType(index),
  }
}

export function createDefaultEqParams(): EqParams {
  return {
    bands: DEFAULT_EQ_FREQUENCIES.map((_, index) => createDefaultEqBand(index)),
    enabled: true,
    channelMode: "stereo",
  }
}

export const createEqBandParameterId = (
  bandId: string,
  property: "frequencyHz" | "gainDb" | "q",
): string => `eq.${bandId}.${property}`

export function supportsGain(type: EqBandType): boolean {
  return type === "peaking" || type === "lowshelf" || type === "highshelf"
}
