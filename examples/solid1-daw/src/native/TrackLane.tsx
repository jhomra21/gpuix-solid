import { createMemo, For, type JSX } from "solid-js"
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
  onClipMouseDown: (trackId: string, clipId: string, event: PointerEvent) => void
}

interface GridLine {
  left: number
  major: boolean
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

const TrackLane = (props: TrackLaneProps): JSX.Element => {
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
        height: layout.laneHeight,
        minHeight: layout.laneHeight,
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
                height: layout.laneHeight,
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
          durationSec: props.durationSec,
          onPreview: () => {},
          onCommit: () => {},
          onCancelPreview: () => {},
        }}
      />
    </div>
  )
}

export default TrackLane
