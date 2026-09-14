import { Show, type JSX } from "solid-js"
import type { AudioEngine } from "../compat/audio-engine"
import type { BpmDetectionService } from "../compat/bpm-detection-service"
import type { AudioWarp } from "../upstream/packages/timeline-core/types"
import SampleDetailPanel from "../upstream/components/timeline/SampleDetailPanel"
import { getBottomPanelMountedFootprintPx } from "../upstream/lib/bottom-panel-layout"
import EffectsPanel, { type EffectsPanelProps } from "./EffectsPanel"
import TimelineBottomPanelFooter from "./TimelineBottomPanelFooter"
import TimelineBottomPanelShell from "./TimelineBottomPanelShell"
import type { BottomTab, NativeClip } from "./model"
import { sourceClip } from "./sourceTrackAdapter"
import { dawTheme } from "./theme"

export interface TimelinePanelsProps extends EffectsPanelProps {
  open: boolean
  activeTab: BottomTab
  heightPx: number
  projectBpm: number
  onOpen: () => void
  onClose: () => void
  onEffectsTabClick: () => void
  onClipTabClick: () => void
  onHeightPreview: (heightPx: number) => void
  onHeightCommit: (heightPx: number) => void
  selectedClip: NativeClip | undefined
  audioEngine: AudioEngine
  bpmDetection: BpmDetectionService
  onClipWarpChange: (clipId: string, audioWarp: AudioWarp) => void
  onClipGainChange: (clipId: string, gain: number) => void
}

const TimelinePanels = (props: TimelinePanelsProps): JSX.Element => {
  const canOpenClip = () => props.selectedClip?.kind === "audio"
  const sourceAudioClip = () => {
    const clip = props.selectedClip
    return clip?.kind === "audio" ? sourceClip(clip) : undefined
  }
  const footer = () => (
    <TimelineBottomPanelFooter
      activeTab={props.activeTab}
      toggleLabel={props.open ? "Hide" : "Show"}
      onEffectsTabClick={props.onEffectsTabClick}
      onClipTabClick={props.activeTab === "clip" || canOpenClip() ? props.onClipTabClick : undefined}
      onToggle={props.open ? props.onClose : props.onOpen}
    />
  )
  const effectsPanel = () => (
    <TimelineBottomPanelShell
      heightPx={props.heightPx}
      footer={footer()}
      onHeightPreview={props.onHeightPreview}
      onHeightCommit={props.onHeightCommit}
    >
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
    </TimelineBottomPanelShell>
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
            backgroundColor: dawTheme.background,
            paddingBottom: 4,
          }}
        >
          {footer()}
        </div>
      )}
    >
      <Show
        when={props.activeTab === "clip" ? sourceAudioClip() : undefined}
        fallback={effectsPanel()}
      >
        {(clip) => (
          <SampleDetailPanel
            clip={clip()}
            projectBpm={props.projectBpm}
            audioEngine={props.audioEngine}
            bpmDetection={props.bpmDetection}
            ensureClipBuffer={async () => {}}
            canWriteClip={() => true}
            onWarpChange={(source, audioWarp) => props.onClipWarpChange(source.id, audioWarp)}
            onGainChange={(source, gain) => props.onClipGainChange(source.id, gain)}
            shell={{
              get heightPx() { return props.heightPx },
              onHeightPreview: props.onHeightPreview,
              onHeightCommit: props.onHeightCommit,
            }}
            onClose={props.onEffectsTabClick}
            onHide={props.onClose}
          />
        )}
      </Show>
    </Show>
  )
}

export default TimelinePanels
