import { For, Show, type JSX } from "solid-js"
import type { NativeTrack } from "./model"
import { dawTheme, layout, text2xs, text3xs, textSm, textXs } from "./theme"

export interface TrackSidebarRowProps {
  track: NativeTrack
  selected: boolean
  onSelect: () => void
  onToggleCollapsed: () => void
  onCycleOutputTarget: () => void
  onCycleSendTarget: () => void
  onToggleMute: () => void
  onToggleSolo: () => void
  onToggleArm: () => void
  onVolumeChange: (next: number) => void
  onToggleAutomation: () => void
  onAddAutomationLane: () => void
  onHideAutomationLane: () => void
}

function meterColor(level: number): string {
  if (level > 0.98) return dawTheme.meterClipping
  return dawTheme.meterSafe
}

const automationParameters = ["Track Volume", "Track Pan", "Send A"] as const

const TrackSidebarRow = (props: TrackSidebarRowProps): JSX.Element => {
  const meterLeft = () => Math.max(0, Math.min(1, props.track.volume * (props.track.muted ? 0.04 : 0.88)))
  const meterRight = () => Math.max(0, Math.min(1, props.track.volume * (props.track.muted ? 0.03 : 0.81)))
  const rowBackground = () => props.track.color ?? (props.selected ? dawTheme.timelineSurfaceMuted : dawTheme.timelineSurface)
  const isRecordDisabled = () => props.track.kind === "return" || props.track.kind === "group"
  const clipLaneHeight = () => props.track.collapsed ? layout.collapsedLaneHeight : layout.laneHeight
  const automationHeight = () => props.track.collapsed || !props.track.automationVisible
    ? 0
    : props.track.automationLaneCount * 48
  const rowHeight = () => clipLaneHeight() + automationHeight()
  const meterHeight = () => props.track.collapsed ? 24 : 80
  const changeVolume = () => props.onVolumeChange(props.track.volume >= 1 ? 0.5 : Math.min(1, props.track.volume + 0.05))
  const toggleArm = () => { if (!isRecordDisabled()) props.onToggleArm() }
  const addAutomationLane = () => { if (props.track.automationVisible) props.onAddAutomationLane() }

  return (
    <div
      testId={`track-${props.track.id}`}
      onClick={props.onSelect}
      style={{
        width: layout.sidebarWidth,
        minWidth: layout.sidebarWidth,
        height: rowHeight(),
        minHeight: rowHeight(),
        position: "relative",
        backgroundColor: rowBackground(),
        borderBottomWidth: 1,
        borderColor: dawTheme.border,
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: layout.sidebarWidth,
          height: clipLaneHeight(),
          minHeight: clipLaneHeight(),
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          paddingTop: props.track.collapsed ? 4 : 8,
          paddingRight: 8,
          paddingBottom: props.track.collapsed ? 4 : 8,
          paddingLeft: 4,
        }}
      >
        <div style={{ width: 94, minWidth: 94, display: "flex", alignItems: "flex-start", gap: 4, overflow: "hidden" }}>
          <div
            testId={`track-${props.track.id}-collapse`}
            onClick={props.onToggleCollapsed}
            style={{ display: "flex", flexDirection: "row", width: 16, minWidth: 16, height: props.track.collapsed ? 24 : 28, alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <text onClick={props.onToggleCollapsed} style={{ ...textXs, color: dawTheme.mutedForeground }}>{props.track.collapsed ? "▶" : "▼"}</text>
          </div>
          <div style={{ flexGrow: 1, minWidth: 0, height: props.track.collapsed ? 24 : 28, display: "flex", alignItems: "center" }}>
            <text style={{ ...textSm, color: dawTheme.foreground, fontWeight: 650, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.name}</text>
          </div>
        </div>

        <div style={{ width: 113, minWidth: 113, display: "flex", flexDirection: "column", gap: 4 }}>
          <Show when={!props.track.collapsed}>
            <Show when={props.track.kind !== "group"} fallback={<div style={{ height: 28 }} />}>
              <div
                testId={`track-${props.track.id}-output`}
                onClick={props.onCycleOutputTarget}
                style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border, cursor: "pointer" }}
              >
                <text onClick={props.onCycleOutputTarget} style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.outputTarget}</text>
                <text onClick={props.onCycleOutputTarget} style={{ ...text2xs, color: dawTheme.mutedForeground }}>⌄</text>
              </div>
            </Show>
            <Show when={props.track.kind !== "return" && props.track.kind !== "group"}>
              <div
                testId={`track-${props.track.id}-send`}
                onClick={props.onCycleSendTarget}
                style={{ height: 28, minHeight: 28, display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border, cursor: "pointer" }}
              >
                <text onClick={props.onCycleSendTarget} style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.track.sendTarget}</text>
                <text onClick={props.onCycleSendTarget} style={{ ...text2xs, color: dawTheme.mutedForeground }}>⌄</text>
              </div>
            </Show>
          </Show>
        </div>

        <div style={{ width: 101, minWidth: 101, height: meterHeight(), display: "flex", gap: 5 }}>
          <div style={{ width: 86, minWidth: 86, display: "flex", flexDirection: props.track.collapsed ? "row" : "column", gap: 4 }}>
            <div style={{ display: "flex", gap: 4, height: 20 }}>
              <div
                testId={`track-${props.track.id}-mute`}
                onClick={props.onToggleMute}
                style={{ display: "flex", flexDirection: "row", width: props.track.collapsed ? 18 : 50, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: props.track.muted ? dawTheme.timelineSurfaceMuted : dawTheme.amber, cursor: "pointer" }}
              >
                <text onClick={props.onToggleMute} style={{ ...textXs, color: props.track.muted ? dawTheme.mutedForeground : "#111111", fontWeight: 800 }}>{String(props.track.number)}</text>
              </div>
              <div
                testId={`track-${props.track.id}-solo`}
                onClick={props.onToggleSolo}
                style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: props.track.soloed ? "#93c5fd" : dawTheme.border, backgroundColor: props.track.soloed ? "#3b82f6" : dawTheme.timelineSurfaceMuted, cursor: "pointer" }}
              >
                <text onClick={props.onToggleSolo} style={{ ...textXs, color: props.track.soloed ? "#050505" : dawTheme.foreground, fontWeight: 700 }}>S</text>
              </div>
              <div
                testId={`track-${props.track.id}-arm`}
                onClick={toggleArm}
                style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isRecordDisabled() ? "#7f1d1d" : dawTheme.red, backgroundColor: props.track.armed ? dawTheme.red : dawTheme.timelineSurface, opacity: isRecordDisabled() ? 0.55 : 1, cursor: isRecordDisabled() ? "default" : "pointer" }}
              >
                <text onClick={toggleArm} style={{ ...textXs, color: props.track.armed ? "#09090b" : "#f87171", fontWeight: 700 }}>R</text>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, alignItems: "center", height: 20 }}>
              <div
                testId={`track-${props.track.id}-volume`}
                onClick={changeVolume}
                style={{ width: 50, height: 6, backgroundColor: dawTheme.timelineBackground, borderWidth: 1, borderColor: dawTheme.border, position: "relative", cursor: "pointer" }}
              >
                <div onClick={changeVolume} style={{ position: "absolute", top: 1, left: 1, height: 2, width: Math.round(props.track.volume * 46), backgroundColor: dawTheme.foreground }} />
              </div>
              <Show when={!props.track.collapsed}>
                <div
                  testId={`track-${props.track.id}-automation`}
                  onClick={props.onToggleAutomation}
                  style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: props.track.automationVisible ? "#f87171" : dawTheme.border, backgroundColor: props.track.automationVisible ? "#ef4444e6" : dawTheme.timelineSurfaceMuted, cursor: "pointer" }}
                >
                  <text onClick={props.onToggleAutomation} style={{ ...text3xs, color: props.track.automationVisible ? "#09090b" : "#fca5a5", fontWeight: 700 }}>A</text>
                </div>
                <div
                  testId={`track-${props.track.id}-automation-add`}
                  onClick={addAutomationLane}
                  style={{ display: "flex", flexDirection: "row", width: 16, height: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: props.track.automationVisible ? dawTheme.timelineSurfaceMuted : dawTheme.timelineSurface, opacity: props.track.automationVisible ? 1 : 0.55, cursor: props.track.automationVisible ? "pointer" : "default" }}
                >
                  <text onClick={addAutomationLane} style={{ ...text3xs, color: props.track.automationVisible ? "#fecaca" : dawTheme.mutedForeground, fontWeight: 700 }}>+</text>
                </div>
              </Show>
            </div>
          </div>

          <div style={{ width: 10, minWidth: 10, height: meterHeight(), display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
            <div style={{ width: 4, height: meterHeight(), position: "relative", overflow: "hidden", backgroundColor: dawTheme.border }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: Math.round(meterLeft() * meterHeight()), backgroundColor: meterColor(meterLeft()) }} />
            </div>
            <div style={{ width: 4, height: meterHeight(), position: "relative", overflow: "hidden", backgroundColor: dawTheme.border }}>
              <div style={{ position: "absolute", bottom: 0, left: 0, width: 4, height: Math.round(meterRight() * meterHeight()), backgroundColor: meterColor(meterRight()) }} />
            </div>
          </div>
        </div>
      </div>

      <Show when={props.track.automationVisible && !props.track.collapsed}>
        <div
          testId={`track-${props.track.id}-automation-lanes`}
          style={{
            position: "absolute",
            top: clipLaneHeight(),
            left: 0,
            right: 0,
            height: automationHeight(),
            backgroundColor: "#040405f2",
            borderTopWidth: 1,
            borderColor: "#ef44444d",
          }}
        >
          <For each={Array.from({ length: props.track.automationLaneCount }, (_, index) => index)}>
            {(index) => (
              <div
                style={{
                  height: 48,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingLeft: 8,
                  paddingRight: 8,
                  borderBottomWidth: 1,
                  borderColor: "#ef444433",
                }}
              >
                <div style={{ width: 94, display: "flex", flexDirection: "row", alignItems: "center", gap: 5, overflow: "hidden" }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dawTheme.red }} />
                  <text style={{ ...text2xs, color: "#fee2e2" }}>Automation</text>
                </div>
                <div style={{ width: 113, height: 28, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 8, paddingRight: 7, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineBackground }}>
                  <text style={{ ...text2xs, color: dawTheme.foreground }}>{automationParameters[index % automationParameters.length]}</text>
                  <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>⌄</text>
                </div>
                <div style={{ width: 101, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                  <text style={{ ...text2xs, color: "#fecaca99" }}>{index === 0 ? "3 pts" : "0 pts"}</text>
                  <div
                    testId={`track-${props.track.id}-automation-hide`}
                    onClick={props.onHideAutomationLane}
                    style={{ width: 20, height: 20, borderWidth: 1, borderColor: "#ef44444d", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <text onClick={props.onHideAutomationLane} style={{ ...textXs, color: "#fee2e2" }}>×</text>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default TrackSidebarRow