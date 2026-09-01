import { For, type JSX, onCleanup } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import { useAppPreferences } from "../compat/app-preferences"
import { resolveClipColor } from "../compat/clip-color"
import type { Track } from "../compat/timeline-core-types"
import type { TimelineRange } from "../compat/timeline-view"
import { dawTheme, layout } from "./theme"

export interface ArrangementOverviewProps {
  durationSec: number
  width: number
  tracks: Track[]
  visibleRange: TimelineRange
  onPreviewVisibleRange: (range: TimelineRange) => void
  onCommitVisibleRange: (range: TimelineRange) => void
}

type DragMode = "pan" | "start" | "end" | null

interface OverviewClipRect {
  id: string
  color: string
  left: number
  top: number
  width: number
  height: number
}

export default function ArrangementOverview(props: ArrangementOverviewProps): JSX.Element {
  const appPreferences = useAppPreferences()
  let root: HTMLDivElement | undefined
  let pointerId: number | undefined
  let dragMode: DragMode = null
  let baseline: TimelineRange | undefined
  let startX = 0
  let rootLeft = 0

  const duration = () => Math.max(1, props.durationSec)
  const rows = () => props.tracks.filter((track) => track.channelRole !== "return")
  const clipRects = (): OverviewClipRect[] => {
    const trackRows = rows()
    const rowCount = Math.max(1, trackRows.length)
    const tokens = appPreferences.appearance.themeTokens()
    const result: OverviewClipRect[] = []

    for (let index = 0; index < trackRows.length; index++) {
      const track = trackRows[index]
      const sourceY = 2 + index * 36 / rowCount
      const sourceHeight = Math.max(1, 32 / rowCount)
      for (const clip of track.clips) {
        result.push({
          id: clip.id,
          color: resolveClipColor(clip.color, tokens),
          left: clip.startSec / duration() * props.width,
          top: sourceY / 40 * layout.overviewHeight,
          width: Math.max(0, clip.duration / duration() * props.width),
          height: sourceHeight / 40 * layout.overviewHeight,
        })
      }
    }
    return result
  }
  const rangeX = () => props.visibleRange.startSec / duration() * props.width
  const rangeWidth = () => Math.max(4, (props.visibleRange.endSec - props.visibleRange.startSec) / duration() * props.width)
  const pointToTime = (clientX: number) => {
    if (props.width <= 0) return 0
    return Math.min(duration(), Math.max(0, (clientX - rootLeft) / props.width * duration()))
  }
  const finish = () => {
    const capturedPointerId = pointerId
    pointerId = undefined
    dragMode = null
    baseline = undefined
    rootLeft = 0
    if (root && capturedPointerId !== undefined && root.hasPointerCapture(capturedPointerId)) {
      root.releasePointerCapture(capturedPointerId)
    }
  }
  const onPointerDown = (event: EventPayload) => {
    event.stopPropagation?.()
    const clientX = event.clientX
    const nextPointerId = event.pointerId
    if (pointerId !== undefined || event.button !== 0 || !root || clientX === undefined || nextPointerId === undefined) return
    rootLeft = root.getBoundingClientRect().left
    const x = clientX - rootLeft
    const left = rangeX()
    const right = left + rangeWidth()
    const edge = 6
    baseline = props.visibleRange
    startX = x
    pointerId = nextPointerId
    root.setPointerCapture(nextPointerId)
    if (Math.abs(x - left) <= edge) dragMode = "start"
    else if (Math.abs(x - right) <= edge) dragMode = "end"
    else if (x > left && x < right) dragMode = "pan"
    else {
      const visibleDuration = baseline.endSec - baseline.startSec
      const center = pointToTime(clientX)
      props.onCommitVisibleRange({ startSec: center - visibleDuration / 2, endSec: center + visibleDuration / 2 })
      finish()
    }
    event.preventDefault?.()
  }
  const onPointerMove = (event: EventPayload) => {
    event.stopPropagation?.()
    const clientX = event.clientX
    if (event.pointerId !== pointerId || clientX === undefined || !baseline || !dragMode || props.width <= 0) return
    const deltaSec = (clientX - rootLeft - startX) / props.width * duration()
    if (dragMode === "pan") props.onPreviewVisibleRange({ startSec: baseline.startSec + deltaSec, endSec: baseline.endSec + deltaSec })
    if (dragMode === "start") props.onPreviewVisibleRange({ startSec: baseline.startSec + deltaSec, endSec: baseline.endSec })
    if (dragMode === "end") props.onPreviewVisibleRange({ startSec: baseline.startSec, endSec: baseline.endSec + deltaSec })
  }
  const onPointerUp = (event: EventPayload) => {
    event.stopPropagation?.()
    if (event.pointerId !== pointerId) return
    if (baseline) props.onCommitVisibleRange(props.visibleRange)
    finish()
  }
  const onPointerCancel = (event: EventPayload) => {
    event.stopPropagation?.()
    if (event.pointerId !== pointerId) return
    if (baseline) props.onPreviewVisibleRange(baseline)
    finish()
  }

  onCleanup(finish)

  return (
    <div
      ref={(element) => { root = element }}
      testId="arrangement-overview"
      style={{
        width: props.width,
        height: layout.overviewHeight,
        minWidth: props.width,
        minHeight: layout.overviewHeight,
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
        cursor: "pointer",
        backgroundColor: dawTheme.timelineSurface,
        borderBottomWidth: 1,
        borderColor: dawTheme.border,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
    >
      <For each={clipRects()}>
        {(clip) => (
          <div
            testId={`overview-clip-${clip.id}`}
            style={{
              position: "absolute",
              left: clip.left,
              top: clip.top,
              width: clip.width,
              height: clip.height,
              backgroundColor: clip.color,
              pointerEvents: "none",
            }}
          />
        )}
      </For>
      <div
        testId="arrangement-visible-range"
        style={{
          position: "absolute",
          left: rangeX(),
          top: 0,
          width: rangeWidth(),
          height: layout.overviewHeight,
          borderWidth: 1,
          borderColor: "#d4d4d8cc",
          cursor: "grab",
          backgroundColor: "#00000000",
        }}
      >
        <div style={{ position: "absolute", left: -6, top: 0, width: 12, height: layout.overviewHeight, cursor: "ew-resize" }} />
        <div style={{ position: "absolute", right: -6, top: 0, width: 12, height: layout.overviewHeight, cursor: "ew-resize" }} />
      </div>
    </div>
  )
}
