import type { RuntimeClip } from "./timeline-core-types"

export type TimelineRangeSelection = {
  trackIds: string[]
  startSec: number
  endSec: number
}

export type ClipRangeOverlap = {
  startSec: number
  endSec: number
}

export function clipRangeOverlap(
  _clip: RuntimeClip,
  _selection: TimelineRangeSelection | null,
): ClipRangeOverlap | null {
  return null
}
