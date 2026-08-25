import { For, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import type { NativeClip } from "./model"
import { dawTheme, layout, textXs } from "./theme"

export interface ClipComponentProps {
  clip: NativeClip
  selected: boolean
  pixelsPerSecond: number
  onSelect: () => void
  onMouseDown: (event: EventPayload) => void
}

function visualColor(clip: NativeClip): string {
  return clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio)
}

const ClipComponent = (props: ClipComponentProps): JSX.Element => {
  const width = () => Math.max(6, Math.floor(props.clip.duration * props.pixelsPerSecond))

  return (
    <div
      testId={`clip-${props.clip.id}`}
      onClick={props.onSelect}
      onMouseDown={props.onMouseDown}
      style={{
        position: "absolute",
        top: 0,
        left: props.clip.startSec * props.pixelsPerSecond,
        width: width(),
        height: layout.laneHeight - 1,
        overflow: "hidden",
        backgroundColor: visualColor(props.clip),
        borderWidth: props.selected ? 2 : 1,
        borderColor: props.selected ? "#60a5fa" : dawTheme.border,
        cursor: "grab",
        userSelect: "none",
        hover: { opacity: 0.94 },
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingLeft: 4, paddingRight: 4, backgroundColor: "#09090b59", pointerEvents: "none" }}>
        <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.clip.name}</text>
      </div>

      <div style={{ position: "absolute", left: 6, right: 6, top: 27, bottom: 7, display: "flex", alignItems: "center", gap: 3, pointerEvents: "none", overflow: "hidden" }}>
        <For each={props.clip.waveform}>
          {(amplitude) => (
            <div style={{ width: 3, minWidth: 3, height: Math.max(4, Math.floor(amplitude * 54)), backgroundColor: "#fafafa9e", borderRadius: 1 }} />
          )}
        </For>
      </div>

      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: width() < 18 ? 2 : 6, cursor: "ew-resize", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: width() < 18 ? 2 : 6, cursor: "ew-resize", pointerEvents: "none" }} />
    </div>
  )
}

export default ClipComponent