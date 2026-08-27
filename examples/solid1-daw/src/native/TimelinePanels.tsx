import { For, Show, type JSX } from "solid-js"
import { getBottomPanelMountedFootprintPx } from "../upstream/lib/bottom-panel-layout"
import EffectsPanel, { type EffectsPanelProps } from "./EffectsPanel"
import TimelineBottomPanelFooter from "./TimelineBottomPanelFooter"
import TimelineBottomPanelShell from "./TimelineBottomPanelShell"
import type { BottomTab, NativeClip } from "./model"
import { dawTheme, text2xs, text3xs, textSm, textXs } from "./theme"

export interface TimelinePanelsProps extends EffectsPanelProps {
  open: boolean
  activeTab: BottomTab
  heightPx: number
  projectBpm: number
  onOpen: () => void
  onClose: () => void
  onEffectsTabClick: () => void
  onClipTabClick: () => void
  selectedClip: NativeClip | undefined
}

function Field(props: { label: string; value: string; width?: number }): JSX.Element {
  const width = props.width ?? 80
  return (
    <div style={{ width, minWidth: width, gap: 4 }}>
      <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>{props.label}</text>
      <div style={{ width, height: 24, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 7, paddingRight: 7, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.appSurface }}>
        <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.value}</text>
      </div>
    </div>
  )
}

const ClipPanel = (props: { clip: NativeClip | undefined; projectBpm: number }): JSX.Element => {
  const sourceBpm = () => props.projectBpm
  const ratio = () => props.projectBpm / Math.max(1, sourceBpm())

  return (
    <div testId="clip-panel" style={{ height: "100%", minHeight: 0, display: "flex", gap: 12, padding: 12, overflowX: "auto", overflowY: "hidden", backgroundColor: dawTheme.appSurface }}>
      <div style={{ width: 80, minWidth: 80, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderColor: dawTheme.border }}>
        <text style={{ ...textSm, color: dawTheme.mutedForeground, fontWeight: 700 }}>SAMPLE DETAIL</text>
      </div>

      <div style={{ width: 288, minWidth: 288, height: "100%", paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, gap: 7, backgroundColor: dawTheme.background }}>
        <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0, flexGrow: 1 }}>
            <text style={{ ...text2xs, color: dawTheme.mutedForeground, fontWeight: 700 }}>SAMPLE</text>
            <text style={{ ...textSm, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.clip?.name ?? "No clip selected"}</text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurfaceMuted }} />
            <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Warp</text>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Field label="Source BPM" value={sourceBpm().toFixed(2)} />
          <Field label="Project BPM" value={props.projectBpm.toFixed(2)} />
          <Field label="Ratio" value={`${ratio().toFixed(3)}x`} />
          <Field label="Mode" value="Re-Pitch" />
        </div>

        <div style={{ borderTopWidth: 1, borderColor: dawTheme.border, paddingTop: 7, gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Auto BPM</text>
            <div style={{ height: 24, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 9, paddingRight: 9, borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineSurface }}>
              <text style={{ ...textXs, color: dawTheme.foreground }}>Analyze</text>
            </div>
          </div>
          <text style={{ ...text3xs, color: dawTheme.mutedForeground }}>Loop tempo analysis is available when media is loaded.</text>
        </div>

        <div style={{ borderTopWidth: 1, borderColor: dawTheme.border, paddingTop: 7, gap: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <text style={{ ...text2xs, color: dawTheme.mutedForeground, fontWeight: 700 }}>CLIP GAIN</text>
            <text style={{ ...textXs, color: dawTheme.foreground }}>0.0 dB</text>
          </div>
          <div style={{ height: 7, backgroundColor: dawTheme.timelineSurfaceMuted, borderWidth: 1, borderColor: dawTheme.border, position: "relative" }}>
            <div style={{ position: "absolute", left: 1, top: 1, width: 180, height: 3, backgroundColor: dawTheme.foreground }} />
          </div>
        </div>

        <div style={{ borderTopWidth: 1, borderColor: dawTheme.border, paddingTop: 7, display: "flex", justifyContent: "space-between" }}>
          <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Start</text>
          <text style={{ ...textXs, color: dawTheme.foreground, fontFamily: "monospace" }}>{props.clip ? `${props.clip.startSec.toFixed(2)}s` : "—"}</text>
          <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Length</text>
          <text style={{ ...textXs, color: dawTheme.foreground, fontFamily: "monospace" }}>{props.clip ? `${props.clip.duration.toFixed(2)}s` : "—"}</text>
        </div>
      </div>

      <div style={{ width: 980, minWidth: 980, height: "100%", minHeight: 0, paddingTop: 8, paddingBottom: 8, paddingLeft: 12, paddingRight: 12, gap: 8, backgroundColor: dawTheme.timelineBackground }}>
        <div style={{ height: 34, minHeight: 34, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <text style={{ ...text2xs, color: dawTheme.mutedForeground, fontWeight: 700 }}>BEAT GRID</text>
            <text style={{ ...textXs, color: dawTheme.mutedForeground }}>Warp off, grid follows project BPM</text>
          </div>
        </div>
        <div style={{ flexGrow: 1, minHeight: 108, width: 960, position: "relative", overflow: "hidden", borderWidth: 1, borderColor: dawTheme.border, backgroundColor: dawTheme.timelineBackground }}>
          <For each={[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]}>
            {(index) => <div style={{ position: "absolute", left: index * 60, top: 0, width: 1, height: 250, backgroundColor: index % 4 === 0 ? dawTheme.timelineGridMajor : dawTheme.timelineGridMinor }} />}
          </For>
          <div style={{ position: "absolute", left: 0, right: 0, top: 124, height: 1, backgroundColor: dawTheme.timelineGridMajor }} />
          <Show when={props.clip}>
            {(clip) => (
              <div style={{ position: "absolute", left: 12, right: 12, top: 28, bottom: 28, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                <For each={Array.from({ length: 4 }, () => clip().waveform).flat()}>
                  {(amplitude) => <div style={{ width: 8, minWidth: 8, height: Math.max(8, Math.round(amplitude * 150)), backgroundColor: clip().color ?? dawTheme.clipAudio, opacity: 0.8 }} />}
                </For>
              </div>
            )}
          </Show>
        </div>
      </div>
    </div>
  )
}

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

  const closedFootprint = () => getBottomPanelMountedFootprintPx({ open: false, heightPx: props.heightPx })

  return (
    <Show
      when={props.open}
      fallback={(
        <div
          testId="bottom-panel-closed"
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            left: 0,
            height: closedFootprint(),
            minHeight: closedFootprint(),
            zIndex: 50,
            backgroundColor: dawTheme.background,
            paddingBottom: 4,
          }}
        >
          {footer()}
        </div>
      )}
    >
      <TimelineBottomPanelShell heightPx={props.heightPx} footer={footer()}>
        <Show when={props.activeTab === "effects"} fallback={<ClipPanel clip={props.selectedClip} projectBpm={props.projectBpm} />}>
          <EffectsPanel
            compressorEnabled={props.compressorEnabled}
            onToggleCompressor={props.onToggleCompressor}
            compressorRatio={props.compressorRatio}
            onRatioChange={props.onRatioChange}
            compressorAttack={props.compressorAttack}
            onAttackChange={props.onAttackChange}
            compressorRelease={props.compressorRelease}
            onReleaseChange={props.onReleaseChange}
            compressorThreshold={props.compressorThreshold}
            onThresholdChange={props.onThresholdChange}
            compressorWet={props.compressorWet}
            onWetChange={props.onWetChange}
            eqEnabled={props.eqEnabled}
            onToggleEq={props.onToggleEq}
            eqLowGain={props.eqLowGain}
            onEqLowGain={props.onEqLowGain}
            eqMidGain={props.eqMidGain}
            onEqMidGain={props.onEqMidGain}
            eqHighGain={props.eqHighGain}
            onEqHighGain={props.onEqHighGain}
          />
        </Show>
      </TimelineBottomPanelShell>
    </Show>
  )
}

export default TimelinePanels
