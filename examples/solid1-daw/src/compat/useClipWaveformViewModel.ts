import type { RuntimeClip } from "../upstream/lib/timeline-runtime-types"

type Options = {
  clip: () => RuntimeClip
  cssWidthPx: () => number
  projectBpm: () => number
  ensureClipBuffer?: (clipId: string, sampleUrl?: string) => Promise<void>
}

export function useClipWaveformViewModel(options: Options) {
  return {
    layout: () => {
      const width = Math.max(0, Math.floor(options.cssWidthPx()))
      return { padPx: 0, drawCols: width, audioStartPx: 0, audioEndPx: width }
    },
    peaks: (): Uint8Array | null => null,
  }
}
