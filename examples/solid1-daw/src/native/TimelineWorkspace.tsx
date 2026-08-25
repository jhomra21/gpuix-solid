import { For, Show, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import { TimelineLeftBrowser, type TimelineLeftBrowserProps } from "./TimelineLeftBrowser"
import TrackLane from "./TrackLane"
import TrackSidebar, { type TrackSidebarProps } from "./TrackSidebar"
import type { NativeTrack } from "./model"
import { dawTheme, layout, text2xs, textXs } from "./theme"

export interface TimelineWorkspaceProps {
  browser: TimelineLeftBrowserProps
  tracks: NativeTrack[]
  selectedClipId: string
  selectedTrackId: string
  pixelsPerSecond: number
  gridEnabled: boolean
  playheadSec: number
  sidebar: Omit<TrackSidebarProps, "tracks" | "selectedTrackId">
  onSelectClip: (trackId: string, clipId: string) => void
  onClipMouseDown: (trackId: string, clipId: string, event: EventPayload) => void
  dragging: boolean
  onDragMove: (event: EventPayload) => void
  onDragEnd: () => void
}

const ArrangementOverview = (): JSX.Element => (
  <div style={{ height: layout.overviewHeight, minHeight: layout.overviewHeight, position: "relative", overflow: "hidden", backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border }}>
    <For each={[0,1,2,3,4,5,6,7,8,9,10,11,12]}>
      {(index) => (
        <div style={{ position: "absolute", left: 12 + index * 74, top: index % 3 === 0 ? 6 : 10, width: index % 3 === 0 ? 58 : 38, height: index % 3 === 0 ? 4 : 3, backgroundColor: index % 3 === 0 ? dawTheme.timelineSurfaceMuted : dawTheme.timelineGridMajor, borderRadius: 2 }} />
      )}
    </For>
  </div>
)

const TimelineRuler = (props: { playheadSec: number; pixelsPerSecond: number }): JSX.Element => (
  <div style={{ height: layout.rulerHeight, minHeight: layout.rulerHeight, position: "relative", overflow: "hidden", backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border }}>
    <For each={[1,2,3,4,5,6,7,8,9,10,11,12]}>
      {(bar) => (
        <div style={{ position: "absolute", left: (bar - 1) * 144, top: 0, width: 1, height: layout.rulerHeight, backgroundColor: dawTheme.timelineGridMajor }}>
          <text style={{ ...text2xs, marginLeft: 5, marginTop: 5, color: dawTheme.mutedForeground }}>{String(bar)}</text>
        </div>
      )}
    </For>
    <div style={{ position: "absolute", left: props.playheadSec * props.pixelsPerSecond, top: 0, width: 1, height: layout.rulerHeight, backgroundColor: dawTheme.timelinePlayhead }} />
  </div>
)

const TimelineWorkspace = (props: TimelineWorkspaceProps): JSX.Element => (
  <div testId="timeline-workspace" style={{ flexGrow: 1, minHeight: 0, display: "flex", backgroundColor: dawTheme.timelineBackground, position: "relative" }}>
    <TimelineLeftBrowser {...props.browser} />

    <div style={{ flexGrow: 1, minWidth: 0, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}>
      <div testId="timeline-surface" style={{ flexGrow: 1, minWidth: 0, minHeight: 0, position: "relative", overflow: "hidden", backgroundColor: dawTheme.timelineBackground }}>
        <ArrangementOverview />
        <TimelineRuler playheadSec={props.playheadSec} pixelsPerSecond={props.pixelsPerSecond} />
        <div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto", position: "relative" }}>
          <For each={props.tracks}>
            {(track) => (
              <TrackLane
                track={track}
                selectedClipId={props.selectedClipId}
                pixelsPerSecond={props.pixelsPerSecond}
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

export default TimelineWorkspace
