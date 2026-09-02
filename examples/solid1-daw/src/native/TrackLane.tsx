import { createMemo, For, Show, type JSX } from "solid-js"
import UpstreamTrackLane from "../upstream/components/timeline/TrackLane"
import type { RuntimeClip, Track } from "../compat/timeline-core-types"
import { selectTimelineGridIntervals } from "../compat/timeline-view"
import type { NativeTrack } from "./model"
import { dawTheme, layout, text2xs, text3xs } from "./theme"

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

const automationParameters = ["Track Volume", "Track Pan", "Send A"] as const

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
  const clipLaneHeight = () => props.track.collapsed ? layout.collapsedLaneHeight : layout.laneHeight
  const automationHeight = () => props.track.collapsed || !props.track.automationVisible
    ? 0
    : props.track.automationLaneCount * 48
  const totalHeight = () => clipLaneHeight() + automationHeight()

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
          heightPx: clipLaneHeight(),
          clipLaneHeightPx: clipLaneHeight(),
          automationHeightPx: 0,
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

      <Show when={props.track.automationVisible && !props.track.collapsed}>
        <div
          testId={`lane-${props.track.id}-automation`}
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
            {(index) => {
              const laneTop = index * 48
              const laneMid = laneTop + 24
              return (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: laneTop,
                    height: 48,
                    borderBottomWidth: 1,
                    borderColor: "#ef444433",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ position: "absolute", left: 0, right: 0, top: laneMid - laneTop, height: 1, backgroundColor: "#ef4444" }} />
                  <For each={[0.7, 2.5, 5.1]}>
                    {(time, pointIndex) => (
                      <div
                        style={{
                          position: "absolute",
                          left: time * props.pixelsPerSecond - 3,
                          top: laneMid - laneTop + (pointIndex() === 1 ? -10 : pointIndex() === 2 ? 7 : -3),
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: "#fecaca",
                          backgroundColor: dawTheme.red,
                        }}
                      />
                    )}
                  </For>
                  <div style={{ position: "absolute", left: 8, top: 4, display: "flex", flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dawTheme.red }} />
                    <text style={{ ...text2xs, color: "#fee2e2" }}>{automationParameters[index % automationParameters.length]}</text>
                  </div>
                  <text style={{ position: "absolute", right: 8, top: 4, ...text3xs, color: "#fecaca99" }}>{index === 0 ? "3 pts" : "0 pts"}</text>
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default TrackLane