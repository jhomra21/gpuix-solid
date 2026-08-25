import { Show, type JSX } from "solid-js"
import EffectsPanel, { type EffectsPanelProps } from "./EffectsPanel"
import TimelineBottomPanelFooter from "./TimelineBottomPanelFooter"
import TimelineBottomPanelShell from "./TimelineBottomPanelShell"
import type { BottomTab, NativeClip } from "./model"
import { dawTheme, text2xs, textSm, textXs } from "./theme"

export interface TimelinePanelsProps {
  open: boolean
  activeTab: BottomTab
  heightPx: number
  onOpen: () => void
  onClose: () => void
  onEffectsTabClick: () => void
  onClipTabClick: () => void
  selectedClip?: NativeClip
  effects: EffectsPanelProps
}

const ClipPanel = (props: { clip?: NativeClip }): JSX.Element => (
  <div testId="clip-panel" style={{ height: "100%", display: "flex", gap: 12, padding: 12, backgroundColor: dawTheme.appSurface }}>
    <div style={{ width: 300, minWidth: 300, height: "100%", padding: 12, gap: 8, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface }}>
      <text style={{ ...text2xs, color: dawTheme.mutedForeground, fontWeight: 700 }}>CLIP</text>
      <text style={{ ...textSm, color: dawTheme.foreground, fontWeight: 700 }}>{props.clip?.name ?? "No clip selected"}</text>
      <div style={{ gap: 5, marginTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><text style={{ ...textXs, color: dawTheme.mutedForeground }}>Start</text><text style={{ ...textXs, color: dawTheme.foreground, fontFamily: "monospace" }}>{props.clip ? `${props.clip.startSec.toFixed(2)}s` : "—"}</text></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><text style={{ ...textXs, color: dawTheme.mutedForeground }}>Length</text><text style={{ ...textXs, color: dawTheme.foreground, fontFamily: "monospace" }}>{props.clip ? `${props.clip.duration.toFixed(2)}s` : "—"}</text></div>
      </div>
    </div>
    <div style={{ flexGrow: 1, height: "100%", padding: 12, gap: 8, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface }}>
      <text style={{ ...text2xs, color: dawTheme.mutedForeground, fontWeight: 700 }}>SAMPLE DETAIL</text>
      <text style={{ ...textXs, color: dawTheme.foreground }}>Warp</text>
      <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Complex Pro · 120 BPM · Gain 0.0 dB</text>
      <div style={{ flexGrow: 1, minHeight: 80, backgroundColor: dawTheme.deviceGraphBackground, borderWidth: 1, borderColor: dawTheme.border }} />
    </div>
  </div>
)

const TimelinePanels = (props: TimelinePanelsProps): JSX.Element => {
  const footer = () => (
    <TimelineBottomPanelFooter
      activeTab={props.activeTab}
      toggleLabel={props.open ? "Hide" : "Show"}
      onEffectsTabClick={props.onEffectsTabClick}
      onClipTabClick={props.onClipTabClick}
      onToggle={props.open ? props.onClose : props.onOpen}
    />
  )

  return (
    <Show
      when={props.open}
      fallback={(
        <div testId="bottom-panel-closed" style={{ backgroundColor: dawTheme.background, paddingBottom: 4 }}>
          {footer()}
        </div>
      )}
    >
      <TimelineBottomPanelShell heightPx={props.heightPx} footer={footer()}>
        <Show when={props.activeTab === "effects"} fallback={<ClipPanel clip={props.selectedClip} />}>
          <EffectsPanel {...props.effects} />
        </Show>
      </TimelineBottomPanelShell>
    </Show>
  )
}

export default TimelinePanels
