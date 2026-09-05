import type { RuntimeClip } from "../upstream/lib/timeline-runtime-types"

type Options = {
  clip: () => RuntimeClip
  cssWidthPx: () => number
  projectBpm: () => number
  ensureClipBuffer?: (clipId: string, sampleUrl?: string) => Promise<void>
}

export function useClipWaveformViewModel(options: Options) {
  let cachedKey = ""
  let cachedPeaks: Uint8Array | null = null

  return {
    layout: () => {
      const width = Math.max(0, Math.floor(options.cssWidthPx()))
      return { padPx: 0, drawCols: width, audioStartPx: 0, audioEndPx: width }
    },
    peaks: (): Uint8Array | null => {
      const clip = options.clip()
      const width = Math.max(0, Math.floor(options.cssWidthPx()))
      if (width <= 0 || clip.mediaStatus === "missing" || clip.mediaStatus === "permission-denied") return null
      const key = `${clip.id}:${clip.name}:${width}`
      if (key === cachedKey) return cachedPeaks
      cachedKey = key
      cachedPeaks = createDeterministicPeakPairs(key, width)
      return cachedPeaks
    },
  }
}

function createDeterministicPeakPairs(key: string, bins: number): Uint8Array {
  const data = new Uint8Array(Math.max(1, bins) * 2)
  let state = hashString(key) || 0x9e3779b9
  const phase = (state % 6283) / 1000
  for (let index = 0; index < bins; index++) {
    state = xorshift32(state)
    const noise = (state >>> 0) / 0xffffffff
    const slow = 0.5 + 0.5 * Math.sin(index * 0.085 + phase)
    const fast = 0.5 + 0.5 * Math.sin(index * 0.31 + phase * 1.7)
    const envelope = 0.16 + 0.78 * (0.48 * slow + 0.32 * fast + 0.2 * noise)
    const positive = Math.min(0.96, envelope)
    const negative = Math.min(0.96, positive * (0.74 + 0.2 * ((state >>> 8) & 0xff) / 255))
    data[index * 2] = quantizePeak(-negative)
    data[index * 2 + 1] = quantizePeak(positive)
  }
  return data
}

function quantizePeak(value: number): number {
  return Math.max(0, Math.min(255, Math.round((Math.max(-1, Math.min(1, value)) + 1) * 127.5)))
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function xorshift32(value: number): number {
  let next = value | 0
  next ^= next << 13
  next ^= next >>> 17
  next ^= next << 5
  return next >>> 0
}
