import { For, Show, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import UpstreamArrangementOverview from "../upstream/components/timeline/ArrangementOverview"
import UpstreamTimelineRuler from "../upstream/components/timeline/TimelineRuler"
import type { Track } from "../compat/timeline-core-types"
import { TimelineLeftBrowser, type TimelineLeftBrowserProps } from "./TimelineLeftBrowser"
import TrackLane from "./TrackLane"
import TrackSidebar, { type TrackSidebarProps } from "./TrackSidebar"
import type { NativeTrack } from "./model"
import { dawTheme, layout, textXs } from "./theme"

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
  onClipMouseDown: (trackId: string, clipId: string, event: EventPayload) => void
  dragging: boolean
  onDragMove: (event: EventPayload) => void
  onDragEnd: () => void
}

function sourceTrack(track: NativeTrack): Track {
  return {
    id: track.id,
    name: track.name,
    kind: track.kind === "midi" ? "instrument" : track.kind,
    channelRole: track.kind === "return" ? "return" : track.kind === "group" ? "group" : "track",
    collapsed: track.collapsed,
    color: track.color,
    clips: track.clips.map((clip) => ({
      ...clip,
      color: clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio),
      ...(clip.kind === "midi" ? { midi: { notes: [] } } : {}),
    })),
  }
}

const timelineDuration = (tracks: NativeTrack[]): number => Math.max(
  12,
  ...tracks.flatMap((track) => track.clips.map((clip) => clip.startSec + clip.duration)),
)

const TimelineWorkspace = (props: TimelineWorkspaceProps): JSX.Element => {
  const durationSec = () => timelineDuration(props.tracks)
  const arrangementWidth = () => durationSec() * props.pixelsPerSecond

  return (
    <div testId="timeline-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex", backgroundColor: dawTheme.timelineBackground, position: "relative" }}>
      <TimelineLeftBrowser {...props.browser} />

      <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}>
        <div testId="timeline-surface" style={{ flexGrow: 1, minWidth: 0, minHeight: 0, position: "relative", overflow: "hidden", backgroundColor: dawTheme.timelineBackground }}>
          <div style={{ height: layout.overviewHeight, minHeight: layout.overviewHeight, overflow: "hidden" }}>
            <UpstreamArrangementOverview
              durationSec={durationSec()}
              width={arrangementWidth()}
              tracks={props.tracks.map(sourceTrack)}
              visibleRange={{ startSec: 0, endSec: durationSec() }}
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
              visibleRange={{ startSec: 0, endSec: durationSec() }}
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
                  onSelectClip={props.onSelectClip}
                  onClipMouseDown={props.onClipMouseDown}
                />
              )}
            </For>
            <div style={{ minHeight: 58, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.timelineSurfaceMuted }}>
              <text style={{ ...textXs, margin: 8, color: dawTheme.mutedForeground }}>Drop files here to create a new track</text>
            </div>
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
