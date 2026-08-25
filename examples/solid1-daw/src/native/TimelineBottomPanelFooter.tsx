import type { JSX } from "solid-js"
import { dawTheme, text2xs } from "./theme"
import type { BottomTab } from "./model"

export interface TimelineBottomPanelFooterProps {
  activeTab: BottomTab
  toggleLabel: "Hide" | "Show"
  onEffectsTabClick: () => void
  onClipTabClick: () => void
  onToggle: () => void
}

const TimelineBottomPanelFooter = (props: TimelineBottomPanelFooterProps): JSX.Element => {
  const tabStyle = (active: boolean) => ({
    height: 28,
    minHeight: 28,
    paddingLeft: 12,
    paddingRight: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: dawTheme.border,
    backgroundColor: active ? dawTheme.muted : dawTheme.background,
    color: active ? dawTheme.foreground : dawTheme.mutedForeground,
    cursor: "pointer",
  })

  return (
    <div style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: dawTheme.background, borderWidth: 1, borderColor: dawTheme.border }}>
      <div style={{ height: 28, display: "flex", alignItems: "center", gap: 4 }}>
        <div testId="bottom-tab-effects" onClick={props.onEffectsTabClick} style={tabStyle(props.activeTab === "effects")}>
          <text style={{ ...text2xs, color: props.activeTab === "effects" ? dawTheme.foreground : dawTheme.mutedForeground, fontWeight: 650 }}>EFFECTS</text>
        </div>
        <div testId="bottom-tab-clip" onClick={props.onClipTabClick} style={tabStyle(props.activeTab === "clip")}>
          <text style={{ ...text2xs, color: props.activeTab === "clip" ? dawTheme.foreground : dawTheme.mutedForeground, fontWeight: 650 }}>CLIP</text>
        </div>
      </div>
      <div testId={props.toggleLabel === "Hide" ? "bottom-panel-close" : "bottom-panel-open"} onClick={props.onToggle} style={{ height: 28, minHeight: 28, paddingLeft: 12, paddingRight: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface, cursor: "pointer" }}>
        <text style={{ ...text2xs, color: dawTheme.foreground, fontWeight: 650 }}>{props.toggleLabel.toUpperCase()}</text>
      </div>
    </div>
  )
}

export default TimelineBottomPanelFooter
