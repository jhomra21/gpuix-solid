import { For, type JSX } from "solid-js"
import type { NativeTrack } from "./model"
import TrackSidebarRow from "./TrackSidebarRow"
import { dawTheme, layout, text2xs } from "./theme"

export interface TrackSidebarProps {
  tracks: NativeTrack[]
  selectedTrackId: string
  onSelectTrack: (id: string) => void
  onToggleMute: (id: string) => void
  onToggleSolo: (id: string) => void
  onToggleArm: (id: string) => void
  onVolumeChange: (id: string, value: number) => void
}

const TrackSidebar = (props: TrackSidebarProps): JSX.Element => (
  <div
    testId="track-sidebar"
    style={{
      width: layout.sidebarWidth,
      minWidth: layout.sidebarWidth,
      height: "100%",
      backgroundColor: dawTheme.timelineSurface,
      borderWidth: 1,
      borderColor: dawTheme.border,
      overflow: "hidden",
    }}
  >
    <div style={{ height: layout.overviewHeight, minHeight: layout.overviewHeight, backgroundColor: dawTheme.timelineSurface, borderWidth: 1, borderColor: dawTheme.border }} />
    <div style={{ height: layout.rulerHeight, minHeight: layout.rulerHeight, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 8, backgroundColor: dawTheme.timelineSurface, borderWidth: 1, borderColor: dawTheme.border }}>
      <text style={{ ...text2xs, color: dawTheme.mutedForeground }}>TRACKS</text>
      <text style={{ ...text2xs, color: dawTheme.mutedForeground }}>MIXER</text>
    </div>
    <div style={{ flexGrow: 1, minHeight: 0, overflowY: "auto" }}>
      <For each={props.tracks}>
        {(track) => (
          <TrackSidebarRow
            track={track}
            selected={props.selectedTrackId === track.id}
            onSelect={() => props.onSelectTrack(track.id)}
            onToggleMute={() => props.onToggleMute(track.id)}
            onToggleSolo={() => props.onToggleSolo(track.id)}
            onToggleArm={() => props.onToggleArm(track.id)}
            onVolumeChange={(value) => props.onVolumeChange(track.id, value)}
          />
        )}
      </For>
    </div>
  </div>
)

export default TrackSidebar
