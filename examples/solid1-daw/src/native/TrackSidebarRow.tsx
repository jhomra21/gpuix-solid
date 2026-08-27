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
  if (level > 0.98) return dawTheme.meterClipping
  return dawTheme.meterSafe
}

const TrackSidebarRow = (props: TrackSidebarRowProps): JSX.Element => {
  const meterLeft = () => Math.max(0, Math.min(1, props.track.volume * (props.track.muted ? 0.04 : 0.88)))
  const meterRight = () => Math.max(0, Math.min(1, props.track.volume * (props.track.muted ? 0.03 : 0.81)))
  const rowBackground = () => props.track.color ?? (props.selected ? dawTheme.timelineSurfaceMuted : dawTheme.timelineSurface)
  const isRecordDisabled = () => props.track.kind === "return" || props.track.kind === "group"

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
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 4,
        backgroundColor: rowBackground(),
        borderBottomWidth: 1,
        borderColor: dawTheme.border,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 94, minWidth: 94, display: "flex", alignItems: "flex-start", gap: 4, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "row", width: 16, minWidth: 16, height: 28, alignItems: "center", justifyContent: "center" }}>
          <text style={{ ...textXs, color: dawTheme.mutedForeground }}>▼</text>
        </div>
        <div style={{ flexGrow: 1, minWidth: 0, height: 28, display: "flex", alignItems: "center" }}>
          <text style={{ ...textSm, color: dawTheme.foreground, fontWeight: 650, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.name}</text>
        </div>
      </div>

      <div style={{ width: 113, minWidth: 113, display: "flex", flexDirection: "column", gap: 4 }}>
        <Show when={props.track.kind !== "group"} fallback={<div style={{ height: 28 }} />}>
          <div style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border }}>
            <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.outputTarget}</text>
            <text style={{ ...text2xs, color: dawTheme.mutedForeground }}>⌄</text>
          </div>
        </Show>
        <Show when={props.track.kind !== "return" && props.track.kind !== "group"}>
          <div style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border }}>
            <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.sendTarget}</text>
            <text style={{ ...text2xs, color: dawTheme.mutedForeground }}>⌄</text>
          </div>
        </Show>
      </div>

      <div style={{ width: 101, minWidth: 101, height: 80, display: "flex", gap: 5 }}>
        <div style={{ width: 86, minWidth: 86, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 4, height: 20 }}>
            <div
              testId={`track-${props.track.id}-mute`}
              onClick={props.onToggleMute}
              style={{ display: "flex", flexDirection: "row", width: 50, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: props.track.muted ? dawTheme.timelineSurfaceMuted : dawTheme.amber, cursor: "pointer" }}
            >
              <text style={{ ...textXs, color: props.track.muted ? dawTheme.mutedForeground : "#111111", fontWeight: 800 }}>{String(props.track.number)}</text>
            </div>
            <div
              testId={`track-${props.track.id}-solo`}
              onClick={props.onToggleSolo}
              style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: props.track.soloed ? "#93c5fd" : dawTheme.border, backgroundColor: props.track.soloed ? "#3b82f6" : dawTheme.timelineSurfaceMuted, cursor: "pointer" }}
            >
              <text style={{ ...textXs, color: props.track.soloed ? "#050505" : dawTheme.foreground, fontWeight: 700 }}>S</text>
            </div>
            <div
              testId={`track-${props.track.id}-arm`}
              onClick={() => { if (!isRecordDisabled()) props.onToggleArm() }}
              style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isRecordDisabled() ? "#7f1d1d" : dawTheme.red, backgroundColor: props.track.armed ? dawTheme.red : dawTheme.timelineSurface, opacity: isRecordDisabled() ? 0.55 : 1, cursor: isRecordDisabled() ? "default" : "pointer" }}
            >
              <text style={{ ...textXs, color: props.track.armed ? "#09090b" : "#f87171", fontWeight: 700 }}>R</text>
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
            <div
              testId={`track-${props.track.id}-volume`}
              onClick={() => props.onVolumeChange(Math.min(1, props.track.volume + 0.05))}
              style={{ width: 50, height: 6, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border, position: "relative", cursor: "pointer" }}
            >
              <div style={{ position: "absolute", top: 1, left: 1, height: 2, width: Math.round(props.track.volume * 46), backgroundColor: dawTheme.foreground }} />
            </div>
            <div style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurfaceMuted }}>
              <text style={{ ...text3xs, color: "#fca5a5", fontWeight: 700 }}>A</text>
            </div>
            <div style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface }}>
              <text style={{ ...text3xs, color: dawTheme.mutedForeground, fontWeight: 700 }}>+</text>
            </div>
          </div>
        </div>

        <div style={{ width: 10, minWidth: 10, height: 80, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
          <div style={{ width: 4, height: 80, position: "relative", overflow: "hidden", backgroundColor: dawTheme.border }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: Math.round(meterLeft() * 80), backgroundColor: meterColor(meterLeft()) }} />
          </div>
          <div style={{ width: 4, height: 80, position: "relative", overflow: "hidden", backgroundColor: dawTheme.border }}>
            <div style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: Math.round(meterRight() * 80), backgroundColor: meterColor(meterRight()) }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrackSidebarRow
