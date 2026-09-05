import type { Clip } from "../upstream/packages/timeline-core/types"

export type TrackStereoLevels = { left: number; right: number }
export type CompressorMeterFrame = { inputDb: number; outputDb: number; gainReductionDb: number; thresholdDb: number }
export type CompressorMeterListener = (frame: CompressorMeterFrame) => void
export type AudioStretchRenderState = { status: "idle" | "rendering" | "ready" | "failed"; error?: Error }

export const isStretchQualityWarning = (playbackRate: number) => playbackRate < 0.75 || playbackRate > 1.33

export interface AudioEngine {
  subscribeMasterCompressorMeter: (effectInstanceId: string, listener: CompressorMeterListener) => () => void
  subscribeTrackCompressorMeter: (trackId: string, effectInstanceId: string, listener: CompressorMeterListener) => () => void
  ensureStretchRender: (clip: Clip) => void
  getStretchRenderState: (clip: Clip) => AudioStretchRenderState
  subscribeStretchRenderState: (listener: () => void) => () => void
}

export function createDeterministicAudioEngine(): AudioEngine {
  const unsubscribe = () => {}
  return {
    subscribeMasterCompressorMeter: () => unsubscribe,
    subscribeTrackCompressorMeter: () => unsubscribe,
    ensureStretchRender: () => {},
    getStretchRenderState: () => ({ status: "ready" }),
    subscribeStretchRenderState: () => unsubscribe,
  }
}
