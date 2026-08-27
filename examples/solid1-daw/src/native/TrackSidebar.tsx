import { createMemo, For, type JSX } from "solid-js"
import type { NativeTrack } from "./model"
import MasterSidebarRow from "./MasterSidebarRow"
import TrackSidebarRow from "./TrackSidebarRow"
import { dawTheme, layout } from "./theme"

export interface TrackSidebarProps {
  tracks: NativeTrack[]
  selectedTrackId: string
  bottomPanelOffsetPx: number
  masterVolume: number
  onSelectTrack: (id: string) => void
  onSelectMaster: () => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  onToggleArm: (id: string) => void
  onVolumeChange: (id: string, value: number) => void
  onMasterVolumeChange: (value: number) => void
}

const TrackSidebar = (props: TrackSidebarProps): JSX.Element => {
  const scrollingTracks = createMemo(() => props.tracks.filter((track) => track.kind !== "return"))
  const returnTracks = createMemo(() => props.tracks.filter((track) => track.kind === "return"))
  const returnAreaHeight = () => returnTracks().length * layout.laneHeight
  const stickyFooterHeight = () => returnAreaHeight() + layout.laneHeight
  const scrollingBottom = () => props.bottomPanelOffsetPx + stickyFooterHeight()

  const renderTrackRow = (track: NativeTrack) => (
    <TrackSidebarRow
      track={track}
      selected={props.selectedTrackId === track.id}
      onSelect={() => props.onSelectTrack(track.id)}
      onToggleMute={() => props.onToggleMute(track.id)}
      onToggleSolo={() => props.onToggleSolo(track.id)}
      onToggleArm={() => props.onToggleArm(track.id)}
      onVolumeChange={(value) => props.onVolumeChange(track.id, value)}
    />
  )

  return (
    <div
      testId="track-sidebar"
      style={{
        width: layout.sidebarWidth,
        minWidth: layout.sidebarWidth,
        height: "100%",
        backgroundColor: dawTheme.timelineSurface,
        borderLeftWidth: 1,
        borderColor: dawTheme.border,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div style={{ height: layout.overviewHeight, minHeight: layout.overviewHeight, backgroundColor: dawTheme.timelineSurface, borderBottomWidth: 1, borderColor: dawTheme.border }} />
      <div style={{ height: layout.rulerHeight, minHeight: layout.rulerHeight, backgroundColor: dawTheme.timelineSurface, borderBottomWidth: 1, borderColor: dawTheme.border }} />

      <div
        testId="track-sidebar-scrolling"
        style={{
          position: "absolute",
          top: layout.headerHeight,
          right: 0,
          bottom: scrollingBottom(),
          left: 0,
          overflowY: "auto",
          backgroundColor: dawTheme.timelineSurface,
        }}
      >
        <For each={scrollingTracks()}>{renderTrackRow}</For>
        <div style={{ minHeight: 24, flexGrow: 1, backgroundColor: dawTheme.timelineSurface }} />
      </div>

      <div
        testId="track-sidebar-sticky-footer"
        style={{
          position: "absolute",
          right: 0,
          bottom: props.bottomPanelOffsetPx,
          left: 0,
          height: stickyFooterHeight(),
          backgroundColor: dawTheme.timelineSurface,
          borderTopWidth: 1,
          borderColor: dawTheme.border,
          overflow: "hidden",
        }}
      >
        <div testId="track-sidebar-returns" style={{ height: returnAreaHeight(), overflow: "hidden" }}>
          <For each={returnTracks()}>{renderTrackRow}</For>
        </div>
        <MasterSidebarRow
          selected={props.selectedTrackId === "master"}
          volume={props.masterVolume}
          onSelect={props.onSelectMaster}
          onVolumeChange={props.onMasterVolumeChange}
        />
      </div>
    </div>
  )
}

export default TrackSidebar
