import type { JSX } from "solid-js"
import { dawTheme, layout, textSm, textXs } from "./theme"

export interface MasterSidebarRowProps {
  selected: boolean
  volume: number
  onSelect: () => void
  onVolumeChange: (next: number) => void
}

const MasterSidebarRow = (props: MasterSidebarRowProps): JSX.Element => {
  const meterLeft = () => Math.max(0, Math.min(1, props.volume * 0.84))
  const meterRight = () => Math.max(0, Math.min(1, props.volume * 0.78))

  return (
    <div
      testId="master-sidebar"
      onClick={props.onSelect}
      style={{
        width: layout.sidebarWidth,
        minWidth: layout.sidebarWidth,
        height: layout.laneHeight,
        minHeight: layout.laneHeight,
        display: "flex",
        alignItems: "center",
        gap: 16,
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 4,
        backgroundColor: props.selected ? dawTheme.timelineSurfaceMuted : dawTheme.timelineSurface,
        borderBottomWidth: 1,
        borderColor: dawTheme.border,
        cursor: "pointer",
      }}
    >
      <div style={{ width: 95, minWidth: 95, height: 80, display: "flex", alignItems: "flex-start", gap: 4 }}>
        <div style={{ width: 16, minWidth: 16, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <text style={{ ...textXs, color: dawTheme.mutedForeground }}>▼</text>
        </div>
        <div style={{ flexGrow: 1, minWidth: 0, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border }}>
          <text style={{ ...textSm, color: dawTheme.foreground, fontWeight: 650 }}>Master</text>
        </div>
      </div>

      <div style={{ width: 96, minWidth: 96, height: 80 }}>
        <div style={{ width: 96, height: 28, display: "flex", alignItems: "center", paddingLeft: 8, paddingRight: 8, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineBackground }}>
          <text style={{ ...textXs, color: dawTheme.foreground }}>Master Out</text>
        </div>
      </div>

      <div style={{ width: 101, minWidth: 101, height: 80, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 83, minWidth: 83, height: 64, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ width: 83, height: 28, display: "flex", gap: 4 }}>
            <div style={{ width: 39.5, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurfaceMuted }}>
              <text style={{ ...textXs, color: "#fca5a5", fontWeight: 700 }}>A</text>
            </div>
            <div style={{ width: 39.5, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface }}>
              <text style={{ ...textXs, color: dawTheme.mutedForeground, fontWeight: 700 }}>+</text>
            </div>
          </div>
          <div
            testId="master-volume"
            onClick={() => props.onVolumeChange(Math.min(1, props.volume + 0.05))}
            style={{ width: 83, height: 28, display: "flex", alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ width: 83, height: 7, position: "relative", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineBackground }}>
              <div style={{ position: "absolute", left: 1, top: 1, height: 3, width: Math.round(props.volume * 79), backgroundColor: dawTheme.foreground }} />
            </div>
          </div>
        </div>

        <div style={{ width: 10, minWidth: 10, height: 64, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
          <div style={{ width: 4, height: 64, position: "relative", overflow: "hidden", backgroundColor: dawTheme.border }}>
            <div style={{ position: "absolute", left: 0, bottom: 0, width: 4, height: Math.round(meterLeft() * 64), backgroundColor: dawTheme.meterSafe }} />
          </div>
          <div style={{ width: 4, height: 64, position: "relative", overflow: "hidden", backgroundColor: dawTheme.border }}>
            <div style={{ position: "absolute", left: 0, bottom: 0, width: 4, height: Math.round(meterRight() * 64), backgroundColor: dawTheme.meterSafe }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default MasterSidebarRow
