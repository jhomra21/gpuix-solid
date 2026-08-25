import { Show, type JSX } from "solid-js"
import type { NativeTrack } from "./model"
import { dawTheme, layout, text2xs, text3xs, textSm, textXs } from "./theme"

export interface TrackSidebarRowProps {
  track: NativeTrack
  selected: boolean
  onSelect: () => void
  onToggleMute: () => void
  onToggleSolo: () => void
  onToggleArm: () => void
  onVolumeChange: (next: number) => void
}

function meterColor(level: number): string {
  if (level > 0.9) return dawTheme.meterClipping
  if (level > 0.75) return dawTheme.meterWarning
  return dawTheme.meterSafe
}

const TrackSidebarRow = (props: TrackSidebarRowProps): JSX.Element => {
  const meter = () => Math.max(0, Math.min(1, props.track.volume * (props.track.muted ? 0.08 : 0.86)))
  const rowBackground = () => props.selected ? dawTheme.timelineSurfaceMuted : dawTheme.timelineSurface
  const roleLabel = () => props.track.kind === "midi" ? "MIDI" : props.track.kind === "return" ? "Return" : props.track.kind === "group" ? "Group" : "Audio"

  return (
    <div
      testId={`track-${props.track.id}`}
      onClick={props.onSelect}
      style={{
        width: layout.sidebarWidth,
        minWidth: layout.sidebarWidth,
        height: layout.laneHeight,
        minHeight: layout.laneHeight,
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: 8,
        backgroundColor: rowBackground(),
        borderWidth: 1,
        borderColor: dawTheme.border,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 100, minWidth: 100, display: "flex", gap: 4, overflow: "hidden" }}>
        <div style={{ width: 4, minWidth: 4, height: 79, backgroundColor: props.track.color ?? dawTheme.timelineSurfaceMuted }} />
        <div style={{ flexGrow: 1, minWidth: 0, gap: 5 }}>
          <div style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", gap: 4 }}>
            <text style={{ ...textXs, width: 14, color: dawTheme.mutedForeground }}>▼</text>
            <text style={{ ...textSm, flexGrow: 1, color: dawTheme.foreground, fontWeight: 650, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.name}</text>
          </div>
          <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{roleLabel()}</text>
        </div>
      </div>

      <div style={{ width: 104, minWidth: 104, gap: 4 }}>
        <div style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border }}>
          <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.outputTarget}</text>
          <text style={{ ...text2xs, color: dawTheme.mutedForeground }}>⌄</text>
        </div>
        <Show when={props.track.kind !== "return" && props.track.kind !== "group"}>
          <div style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border }}>
            <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.sendTarget}</text>
            <text style={{ ...text2xs, color: dawTheme.mutedForeground }}>⌄</text>
          </div>
        </Show>
      </div>

      <div style={{ width: 101, minWidth: 101, gap: 4 }}>
        <div style={{ display: "flex", gap: 4, height: 20 }}>
          <div
            testId={`track-${props.track.id}-mute`}
            onClick={props.onToggleMute}
            style={{ display: "flex", flexDirection: "row", width: 55, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: props.track.muted ? dawTheme.timelineSurfaceMuted : dawTheme.amber, cursor: "pointer" }}
          >
            <text style={{ ...textXs, color: props.track.muted ? dawTheme.mutedForeground : "#111111", fontWeight: 800 }}>{String(props.track.number)}</text>
          </div>
          <div
            testId={`track-${props.track.id}-solo`}
            onClick={props.onToggleSolo}
            style={{ display: "flex", flexDirection: "row", width: 19, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: props.track.soloed ? "#93c5fd" : dawTheme.border, backgroundColor: props.track.soloed ? "#3b82f6" : dawTheme.timelineSurfaceMuted, cursor: "pointer" }}
          >
            <text style={{ ...textXs, color: props.track.soloed ? "#050505" : dawTheme.foreground, fontWeight: 700 }}>S</text>
          </div>
          <div
            testId={`track-${props.track.id}-arm`}
            onClick={props.onToggleArm}
            style={{ display: "flex", flexDirection: "row", width: 19, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.red, backgroundColor: props.track.armed ? dawTheme.red : dawTheme.timelineSurface, cursor: "pointer" }}
          >
            <text style={{ ...textXs, color: props.track.armed ? "#09090b" : "#f87171", fontWeight: 700 }}>R</text>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
          <div
            testId={`track-${props.track.id}-volume`}
            onClick={() => props.onVolumeChange(Math.min(1, props.track.volume + 0.05))}
            style={{ width: 74, height: 6, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border, position: "relative", cursor: "pointer" }}
          >
            <div style={{ position: "absolute", top: 1, left: 1, height: 2, width: Math.round(props.track.volume * 70), backgroundColor: dawTheme.foreground }} />
          </div>
          <text style={{ ...text3xs, width: 23, color: dawTheme.mutedForeground, textAlign: "right" }}>{`${Math.round(props.track.volume * 100)}%`}</text>
        </div>

        <div style={{ display: "flex", gap: 5, alignItems: "center", height: 20 }}>
          <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{props.track.pan === 0 ? "C" : props.track.pan < 0 ? `${Math.abs(props.track.pan)}L` : `${props.track.pan}R`}</text>
          <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{`${Math.round(props.track.send * 100)}%`}</text>
          <div style={{ marginLeft: 3, width: 34, height: 4, backgroundColor: dawTheme.timelineBackground, position: "relative" }}>
            <div style={{ width: Math.round(meter() * 34), height: 4, backgroundColor: meterColor(meter()) }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrackSidebarRow