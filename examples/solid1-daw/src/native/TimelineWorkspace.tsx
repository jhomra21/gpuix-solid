import { createMemo, For, Show, type JSX } from "solid-js"
import UpstreamTimelineRuler from "../upstream/components/timeline/TimelineRuler"
import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import { timelineDurationSec } from "../compat/timeline-utils"
import { selectTimelineGridIntervals } from "../compat/timeline-view"
import { TimelineLeftBrowser, type TimelineLeftBrowserProps } from "./TimelineLeftBrowser"
import ArrangementOverview from "./ArrangementOverview"
import TrackLane from "./TrackLane"
import TrackSidebar, { type TrackSidebarProps } from "./TrackSidebar"
import type { NativeTrack } from "./model"
import { dawTheme, layout } from "./theme"

export interface TimelineWorkspaceProps {
  browser: TimelineLeftBrowserProps
  tracks: NativeTrack[]
  selectedClipId: string
  selectedTrackId: string
  pixelsPerSecond: number
  gridEnabled: boolean
  playheadSec: number
  bpm: number
  gridDenominator: number
  loopEnabled: boolean
  loopStartSec: number
  loopEndSec: number
  bottomPanelOffsetPx: number
  onSetLoopRegion: (startSec: number, endSec: number) => void
  onRulerScrub: (sec: number) => void
  sidebar: Omit<TrackSidebarProps, "tracks" | "selectedTrackId" | "bottomPanelOffsetPx">
  onSelectClip: (trackId: string, clipId: string) => void
  onOpenClip: (trackId: string, clipId: string) => void
  onClipMouseDown: (trackId: string, clipId: string, event: PointerEvent) => void
  dragging: boolean
}

interface GridLine {
  left: number
  major: boolean
}

function trackRowHeight(track: NativeTrack): number {
  const clipLaneHeight = track.collapsed ? layout.collapsedLaneHeight : layout.laneHeight
  if (track.collapsed || !track.automationVisible) return clipLaneHeight
  return clipLaneHeight + track.automationLaneCount * 48
}

function sourceClip(clip: NativeTrack["clips"][number]): RuntimeClip {
  const runtimeClip: RuntimeClip = {
    ...clip,
    color: clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio),
  }
  if (clip.kind === "midi") runtimeClip.midi = { notes: [] }
  return runtimeClip
}

function sourceTrack(track: NativeTrack): Track {
  return {
    id: track.id,
    name: track.name,
    kind: track.kind === "midi" ? "instrument" : track.kind,
    channelRole: track.kind === "return" ? "return" : track.kind === "group" ? "group" : "track",
    collapsed: track.collapsed,
    color: track.color,
    clips: track.clips.map(sourceClip),
  }
}

function TimelineGrid(props: {
  durationSec: number
  pixelsPerSecond: number
  bpm: number
  denominator: number
  enabled: boolean
  height: number
}): JSX.Element {
  const lines = createMemo<GridLine[]>(() => {
    if (!props.enabled) return []
    const intervals = selectTimelineGridIntervals(props.pixelsPerSecond, props.bpm, props.denominator, true)
    if (!(intervals.minorSec > 0 && intervals.majorSec > 0)) return []
    const minorSec = intervals.minorSec
    const majorSec = intervals.majorSec
    const majorEvery = Math.max(1, Math.round(majorSec / minorSec))
    const count = Math.ceil(props.durationSec / minorSec)
    return Array.from({ length: count + 1 }, (_, index) => ({
      left: index * minorSec * props.pixelsPerSecond,
      major: index % majorEvery === 0,
    }))
  })

  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" }}>
      <For each={lines()}>
        {(line) => (
          <div
            style={{
              position: "absolute",
              left: line.left,
              top: 0,
              width: line.major ? 2 : 1,
              height: props.height,
              backgroundColor: line.major ? dawTheme.timelineGridMajor : dawTheme.timelineGridMinor,
            }}
          />
        )}
      </For>
    </div>
  )
}

const TimelineWorkspace = (props: TimelineWorkspaceProps): JSX.Element => {
  const durationSec = () => timelineDurationSec(props.tracks)
  const sourceTracks = createMemo(() => props.tracks.map(sourceTrack))
  const scrollingTracks = createMemo(() => props.tracks.filter((track) => track.kind !== "return"))
  const returnTracks = createMemo(() => props.tracks.filter((track) => track.kind === "return"))
  const returnAreaHeight = () => returnTracks().reduce((height, track) => height + trackRowHeight(track), 0)
  const stickyFooterHeight = () => returnAreaHeight() + layout.laneHeight
  const scrollingBottom = () => props.bottomPanelOffsetPx + stickyFooterHeight()
  const timelineViewportWidth = () => Math.max(
    360,
    layout.windowWidth - (props.browser.open ? layout.browserWidth : 0) - layout.sidebarWidth,
  )
  const visibleRange = () => ({
    startSec: 0,
    endSec: Math.min(durationSec(), timelineViewportWidth() / props.pixelsPerSecond),
  })

  const renderTrackLane = (track: NativeTrack) => (
    <TrackLane
      track={track}
      selectedClipId={props.selectedClipId}
      pixelsPerSecond={props.pixelsPerSecond}
      bpm={props.bpm}
      gridEnabled={props.gridEnabled}
      gridDenominator={props.gridDenominator}
      durationSec={durationSec()}
      onSelectClip={props.onSelectClip}
      onOpenClip={props.onOpenClip}
      onClipMouseDown={props.onClipMouseDown}
    />
  )

  return (
    <div testId="timeline-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex", backgroundColor: dawTheme.timelineBackground, position: "relative" }}>
      <TimelineLeftBrowser {...props.browser} />

      <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}>
        <div testId="timeline-surface" style={{ flexGrow: 1, minWidth: 0, minHeight: 0, position: "relative", overflow: "hidden", backgroundColor: dawTheme.timelineBackground }}>
          <div style={{ height: layout.overviewHeight, minHeight: layout.overviewHeight, overflow: "hidden" }}>
            <ArrangementOverview
              durationSec={durationSec()}
              width={timelineViewportWidth()}
              tracks={sourceTracks()}
              visibleRange={visibleRange()}
              onPreviewVisibleRange={() => {}}
              onCommitVisibleRange={() => {}}
            />
          </div>
          <div style={{ height: layout.rulerHeight, minHeight: layout.rulerHeight, overflow: "hidden" }}>
            <UpstreamTimelineRuler
              durationSec={durationSec()}
              bpm={props.bpm}
              denom={props.gridDenominator}
              gridEnabled={props.gridEnabled}
              pixelsPerSecond={props.pixelsPerSecond}
              visibleRange={visibleRange()}
              loopEnabled={props.loopEnabled}
              loopStartSec={props.loopStartSec}
              loopEndSec={props.loopEndSec}
              onSetLoopRegion={props.onSetLoopRegion}
              onPointerDown={(event) => {
                const rect = event.currentTarget instanceof HTMLElement
                  ? event.currentTarget.getBoundingClientRect()
                  : { left: 0 }
                props.onRulerScrub(Math.max(0, Math.min(durationSec(), (event.clientX - rect.left) / props.pixelsPerSecond)))
              }}
            />
          </div>

          <div
            testId="timeline-scrolling-tracks"
            style={{
              position: "absolute",
              top: layout.headerHeight,
              right: 0,
              bottom: scrollingBottom(),
              left: 0,
              overflowY: "auto",
              backgroundColor: dawTheme.timelineBackground,
            }}
          >
            <For each={scrollingTracks()}>{renderTrackLane}</For>
          </div>

          <div
            testId="timeline-sticky-footer"
            style={{
              position: "absolute",
              right: 0,
              bottom: props.bottomPanelOffsetPx,
              left: 0,
              height: stickyFooterHeight(),
              overflow: "hidden",
              backgroundColor: dawTheme.timelineBackground,
              borderTopWidth: 1,
              borderColor: dawTheme.border,
            }}
          >
            <div testId="timeline-return-tracks" style={{ height: returnAreaHeight(), overflow: "hidden", position: "relative" }}>
              <For each={returnTracks()}>{renderTrackLane}</For>
            </div>
            <div
              testId="master-timeline"
              style={{
                height: layout.laneHeight,
                minHeight: layout.laneHeight,
                position: "relative",
                overflow: "hidden",
                backgroundColor: dawTheme.timelineBackground,
                borderBottomWidth: 1,
                borderColor: dawTheme.timelineSurfaceMuted,
              }}
            >
              <TimelineGrid
                durationSec={durationSec()}
                pixelsPerSecond={props.pixelsPerSecond}
                bpm={props.bpm}
                denominator={props.gridDenominator}
                enabled={props.gridEnabled}
                height={layout.laneHeight}
              />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: props.playheadSec * props.pixelsPerSecond,
              top: layout.headerHeight,
              bottom: scrollingBottom(),
              width: 1,
              backgroundColor: dawTheme.timelinePlayhead,
              pointerEvents: "none",
            }}
          />
        </div>

        <TrackSidebar
          tracks={props.tracks}
          selectedTrackId={props.selectedTrackId}
          bottomPanelOffsetPx={props.bottomPanelOffsetPx}
          {...props.sidebar}
        />
      </div>

      <Show when={props.dragging}>
        <div
          testId="timeline-drag-layer"
          style={{
            position: "absolute",
            top: layout.headerHeight,
            right: layout.sidebarWidth,
            bottom: scrollingBottom(),
            left: props.browser.open ? layout.browserWidth : 0,
            backgroundColor: "#00000001",
            cursor: "grabbing",
          }}
        />
      </Show>
    </div>
  )
}

export default TimelineWorkspace