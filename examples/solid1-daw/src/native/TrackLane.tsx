import { createMemo, createSignal, For, type JSX } from "solid-js"
import {
  automationTargetKey,
  type AutomationEnvelope,
  type AutomationParameterSelection,
} from "../compat/daw-browser-shared"
import UpstreamTrackLane from "../upstream/components/timeline/TrackLane"
import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import { selectTimelineGridIntervals } from "../compat/timeline-view"
import type { NativeTrack } from "./model"
import { dawTheme, layout } from "./theme"

export interface TrackLaneProps {
  track: NativeTrack
  selectedClipId: string
  pixelsPerSecond: number
  bpm: number
  gridEnabled: boolean
  gridDenominator: number
  durationSec: number
  onSelectClip: (trackId: string, clipId: string) => void
  onOpenClip: (trackId: string, clipId: string) => void
  onClipMouseDown: (trackId: string, clipId: string, event: PointerEvent) => void
}

interface GridLine {
  left: number
  major: boolean
}

const automationSelections: AutomationParameterSelection[] = [{ parameterId: "volume" }]

function sourceClip(clip: NativeTrack["clips"][number]): RuntimeClip {
  const runtimeClip: RuntimeClip = {
    ...clip,
    color: clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio),
  }
  if (clip.kind === "midi") runtimeClip.midi = { notes: [] }
  return runtimeClip
}

function sourceTrack(track: NativeTrack): Track {
  return {
    id: track.id,
    name: track.name,
    volume: track.volume,
    kind: track.kind === "midi" ? "instrument" : track.kind === "audio" ? "audio" : undefined,
    channelRole: track.kind === "return" ? "return" : track.kind === "group" ? "group" : "track",
    collapsed: track.collapsed,
    color: track.color,
    clips: track.clips.map(sourceClip),
  }
}

function fixtureAutomationEnvelope(track: NativeTrack, durationSec: number): AutomationEnvelope {
  const target = { kind: "track" as const, trackId: track.id }
  const duration = Math.max(0.01, durationSec)
  return {
    id: `native-fixture:${track.id}:volume`,
    projectId: "native-fixture",
    target,
    targetKey: automationTargetKey(target, "volume"),
    parameterId: "volume",
    enabled: true,
    points: [
      { id: `${track.id}:volume:1`, timeSec: duration * 0.15, value: track.volume, interpolation: "linear" },
      { id: `${track.id}:volume:2`, timeSec: duration * 0.45, value: Math.min(2, track.volume + 0.24), interpolation: "linear" },
      { id: `${track.id}:volume:3`, timeSec: duration * 0.8, value: Math.max(0, track.volume - 0.16), interpolation: "linear" },
    ],
    updatedAt: 0,
  }
}

const TrackLane = (props: TrackLaneProps): JSX.Element => {
  const clipLaneHeight = () => props.track.collapsed ? layout.collapsedLaneHeight : layout.laneHeight
  const automationHeight = () => props.track.collapsed || !props.track.automationVisible ? 0 : 48
  const totalHeight = () => clipLaneHeight() + automationHeight()
  const [committedAutomation, setCommittedAutomation] = createSignal<AutomationEnvelope>(
    fixtureAutomationEnvelope(props.track, props.durationSec),
  )
  const [previewAutomation, setPreviewAutomation] = createSignal<AutomationEnvelope>()
  const automationEnvelope = () => previewAutomation() ?? committedAutomation()

  const gridLines = createMemo<GridLine[]>(() => {
    if (!props.gridEnabled) return []
    const intervals = selectTimelineGridIntervals(
      props.pixelsPerSecond,
      props.bpm,
      props.gridDenominator,
      true,
    )
    const minorSec = intervals.minorSec
    const majorSec = intervals.majorSec
    if (!(Number.isFinite(minorSec) && minorSec > 0 && Number.isFinite(majorSec) && majorSec > 0)) return []
    const majorEvery = Math.max(1, Math.round(majorSec / minorSec))
    const count = Math.ceil(props.durationSec / minorSec)
    return Array.from({ length: count + 1 }, (_, index) => ({
      left: index * minorSec * props.pixelsPerSecond,
      major: index % majorEvery === 0,
    }))
  })

  return (
    <div
      testId={`lane-${props.track.id}`}
      style={{
        height: totalHeight(),
        minHeight: totalHeight(),
        position: "relative",
        overflow: "hidden",
        backgroundColor: dawTheme.timelineBackground,
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" }}>
        <For each={gridLines()}>
          {(line) => (
            <div
              style={{
                position: "absolute",
                left: line.left,
                top: 0,
                width: line.major ? 2 : 1,
                height: totalHeight(),
                backgroundColor: line.major ? dawTheme.timelineGridMajor : dawTheme.timelineGridMinor,
              }}
            />
          )}
        </For>
      </div>
      <UpstreamTrackLane
        track={sourceTrack(props.track)}
        layout={{
          topPx: 0,
          heightPx: totalHeight(),
          clipLaneHeightPx: clipLaneHeight(),
          automationHeightPx: automationHeight(),
        }}
        groupClipOverview={[]}
        selectedClipIds={new Set(props.selectedClipId ? [props.selectedClipId] : [])}
        rangeSelection={null}
        onClipPointerDown={(trackId, clipId, event) => props.onClipMouseDown(trackId, clipId, event)}
        onClipPointerUp={() => {}}
        onClipResizeStart={() => {}}
        onClipDblClick={props.onOpenClip}
        clipContextMenu={{
          selectClip: props.onSelectClip,
          duplicateSelectedClips: () => {},
          deleteSelectedClips: () => {},
        }}
        onRetryMedia={() => {}}
        onReplaceMedia={() => {}}
        onRemoveMissingMedia={() => {}}
        bpm={props.bpm}
        pixelsPerSecond={props.pixelsPerSecond}
        viewportRedrawVersion={0}
        canEditClipFades={() => false}
        onCommitClipFades={() => {}}
        automation={{
          projectId: "native-fixture",
          visible: props.track.automationVisible && !props.track.collapsed,
          selections: automationSelections,
          laneHeightPx: 48,
          envelopeForSelection: (selection) => selection.parameterId === "volume" ? automationEnvelope() : undefined,
          durationSec: props.durationSec,
          onPreview: setPreviewAutomation,
          onCommit: (envelope) => {
            if (envelope) setCommittedAutomation(envelope)
            setPreviewAutomation(undefined)
          },
          onCancelPreview: () => setPreviewAutomation(undefined),
        }}
      />
    </div>
  )
}

export default TrackLane
