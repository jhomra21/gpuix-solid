import { For, type JSX } from "solid-js"
import UpstreamTrackLane from "../upstream/components/timeline/TrackLane"
import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import type { NativeTrack } from "./model"
import { dawTheme, layout } from "./theme"

export interface TrackLaneProps {
  track: NativeTrack
  selectedClipId: string
  pixelsPerSecond: number
  bpm: number
  gridEnabled: boolean
  onSelectClip: (trackId: string, clipId: string) => void
  onClipMouseDown: (trackId: string, clipId: string, event: PointerEvent) => void
}

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
    kind: track.kind === "midi" ? "instrument" : track.kind,
    channelRole: track.kind === "return" ? "return" : track.kind === "group" ? "group" : "track",
    collapsed: track.collapsed,
    color: track.color,
    clips: track.clips.map(sourceClip),
  }
}

const ShowGrid = (props: { enabled: boolean }): JSX.Element => (
  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" }}>
    <For each={[1,2,3,4,5,6,7,8,9,10,11,12]}>
      {(index) => (
        <div style={{ position: "absolute", left: index * 72, top: 0, width: 1, height: layout.laneHeight, backgroundColor: props.enabled ? (index % 2 === 0 ? dawTheme.timelineGridMajor : dawTheme.timelineGridMinor) : dawTheme.timelineGridMinor }} />
      )}
    </For>
  </div>
)

const TrackLane = (props: TrackLaneProps): JSX.Element => (
  <div
    testId={`lane-${props.track.id}`}
    style={{
      height: layout.laneHeight,
      minHeight: layout.laneHeight,
      position: "relative",
      overflow: "hidden",
      backgroundColor: dawTheme.timelineBackground,
    }}
  >
    <ShowGrid enabled={props.gridEnabled} />
    <UpstreamTrackLane
      track={sourceTrack(props.track)}
      layout={{
        topPx: 0,
        heightPx: layout.laneHeight,
        clipLaneHeightPx: layout.laneHeight,
        automationHeightPx: 0,
      }}
      groupClipOverview={[]}
      selectedClipIds={new Set(props.selectedClipId ? [props.selectedClipId] : [])}
      rangeSelection={null}
      onClipPointerDown={(trackId, clipId, event) => props.onClipMouseDown(trackId, clipId, event)}
      onClipPointerUp={() => {}}
      onClipResizeStart={() => {}}
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
        visible: false,
        selections: [],
        laneHeightPx: 0,
        envelopeForSelection: () => undefined,
        durationSec: 0,
        onPreview: () => {},
        onCommit: () => {},
        onCancelPreview: () => {},
      }}
    />
  </div>
)

export default TrackLane
