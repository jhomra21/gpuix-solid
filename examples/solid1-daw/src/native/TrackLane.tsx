import { For, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import ClipComponent from "./ClipComponent"
import type { NativeTrack } from "./model"
import { dawTheme, layout } from "./theme"

export interface TrackLaneProps {
  track: NativeTrack
  selectedClipId: string
  pixelsPerSecond: number
  gridEnabled: boolean
  onSelectClip: (trackId: string, clipId: string) => void
  onClipMouseDown: (trackId: string, clipId: string, event: EventPayload) => void
}

const TrackLane = (props: TrackLaneProps): JSX.Element => (
  <div
    testId={`lane-${props.track.id}`}
    style={{
      height: layout.laneHeight,
      minHeight: layout.laneHeight,
      position: "relative",
      overflow: "hidden",
      backgroundColor: dawTheme.timelineBackground,
      borderWidth: 1,
      borderColor: dawTheme.timelineSurfaceMuted,
    }}
  >
    <ShowGrid enabled={props.gridEnabled} />
    <For each={props.track.clips}>
      {(clip) => (
        <ClipComponent
          clip={clip}
          selected={props.selectedClipId === clip.id}
          pixelsPerSecond={props.pixelsPerSecond}
          onSelect={() => props.onSelectClip(props.track.id, clip.id)}
          onMouseDown={(event) => props.onClipMouseDown(props.track.id, clip.id, event)}
        />
      )}
    </For>
  </div>
)

const ShowGrid = (props: { enabled: boolean }): JSX.Element => (
  <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" }}>
    <For each={[1,2,3,4,5,6,7,8,9,10,11,12]}>
      {(index) => (
        <div style={{ position: "absolute", left: index * 72, top: 0, width: 1, height: layout.laneHeight, backgroundColor: props.enabled ? (index % 2 === 0 ? dawTheme.timelineGridMajor : dawTheme.timelineGridMinor) : dawTheme.timelineGridMinor }} />
      )}
    </For>
  </div>
)

export default TrackLane
