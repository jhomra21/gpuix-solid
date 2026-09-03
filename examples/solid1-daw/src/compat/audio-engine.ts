export type TrackStereoLevels = {
  left: number
  right: number
}


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
