import { createMemo, For, Show, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import UpstreamTimelineRuler from "../upstream/components/timeline/TimelineRuler"
import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import { timelineDurationSec } from "../compat/timeline-utils"
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
  onSetLoopRegion: (startSec: number, endSec: number) => void
  onRulerScrub: (sec: number) => void
  sidebar: Omit<TrackSidebarProps, "tracks" | "selectedTrackId">
  onSelectClip: (trackId: string, clipId: string) => void
  onClipMouseDown: (trackId: string, clipId: string, event: PointerEvent) => void
  dragging: boolean
  onDragMove: (event: EventPayload) => void
  onDragEnd: () => void
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

const TimelineWorkspace = (props: TimelineWorkspaceProps): JSX.Element => {
  const durationSec = () => timelineDurationSec(props.tracks)
  const sourceTracks = createMemo(() => props.tracks.map(sourceTrack))
  const timelineViewportWidth = () => Math.max(
    360,
    layout.windowWidth - (props.browser.open ? layout.browserWidth : 0) - layout.sidebarWidth,
  )
  const visibleRange = () => ({
    startSec: 0,
    endSec: Math.min(durationSec(), timelineViewportWidth() / props.pixelsPerSecond),
  })

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
          <div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto", position: "relative" }}>
            <For each={props.tracks}>
              {(track) => (
                <TrackLane
                  track={track}
                  selectedClipId={props.selectedClipId}
                  pixelsPerSecond={props.pixelsPerSecond}
                  bpm={props.bpm}
                  gridEnabled={props.gridEnabled}
                  gridDenominator={props.gridDenominator}
                  durationSec={durationSec()}
                  onSelectClip={props.onSelectClip}
                  onClipMouseDown={props.onClipMouseDown}
                />
              )}
            </For>
          </div>

          <div style={{ position: "absolute", left: props.playheadSec * props.pixelsPerSecond, top: layout.headerHeight, bottom: 0, width: 1, backgroundColor: dawTheme.timelinePlayhead, pointerEvents: "none" }} />
        </div>

        <TrackSidebar tracks={props.tracks} selectedTrackId={props.selectedTrackId} {...props.sidebar} />
      </div>

      <Show when={props.dragging}>
        <div
          testId="timeline-drag-layer"
          onMouseMove={props.onDragMove}
          onMouseUp={props.onDragEnd}
          style={{ position: "absolute", top: layout.headerHeight, right: layout.sidebarWidth, bottom: 0, left: props.browser.open ? layout.browserWidth : 0, backgroundColor: "#00000001", cursor: "grabbing" }}
        />
      </Show>
    </div>
  )
}

export default TimelineWorkspace
