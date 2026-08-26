export type TimelineRange = {
  startSec: number
  endSec: number
}

export type TimelineGridIntervals = {
  majorSec: number
  minorSec: number
}

export function musicalBarLabelAtTime(timeSec: number, bpm: number): string {
  const beats = timeSec / (60 / Math.max(1, bpm))
  return String(Math.floor(beats / 4) + 1)
}

export function selectTimelineGridIntervals(
  pixelsPerSecond: number,
  bpm: number,
  denominator: number,
  gridEnabled: boolean,
): TimelineGridIntervals {
  if (!gridEnabled) return { majorSec: 5, minorSec: 1 }
  const beatSec = 60 / Math.max(1, bpm)
  const gridSec = beatSec * 4 / Math.max(1, denominator)
  const targetMajorPx = 96
  const steps = Math.max(1, Math.round(targetMajorPx / Math.max(1, gridSec * pixelsPerSecond)))
  return { majorSec: gridSec * steps, minorSec: gridSec }
}
