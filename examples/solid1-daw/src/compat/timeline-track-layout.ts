export type GroupClipOverviewSegment = {
  startSec: number
  endSec: number
  color: string
}

export type TimelineTrackLayoutRow = {
  topPx: number
  heightPx: number
  clipLaneHeightPx: number
  automationHeightPx: number
}

export type TimelineTrackLayout = {
  scrollingRows: TimelineTrackLayoutRow[]
  returnRows: TimelineTrackLayoutRow[]
}
