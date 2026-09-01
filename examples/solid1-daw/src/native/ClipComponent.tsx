import { For, Show, type JSX } from "solid-js"
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

function alphaHex(color: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

const ClipComponent = (props: ClipComponentProps): JSX.Element => {
  const width = () => Math.max(6, Math.floor(props.clip.duration * props.pixelsPerSecond))
  const handleWidth = () => width() < 18 ? 2 : width() < 28 ? 3 : 6
  const color = () => visualColor(props.clip)

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
        backgroundColor: alphaHex(color(), props.selected ? "4d" : "33"),
        borderWidth: 1,
        borderColor: alphaHex(color(), props.selected ? "d9" : "99"),
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingLeft: 4, paddingRight: 4, backgroundColor: "#09090b59", pointerEvents: "none" }}>
        <text style={{ ...textXs, color: dawTheme.foreground, whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{props.clip.name}</text>
      </div>

      <div style={{ position: "absolute", left: 6, right: 6, top: 27, bottom: 7, display: "flex", alignItems: "center", gap: 3, pointerEvents: "none", overflow: "hidden" }}>
        <For each={props.clip.waveform}>
          {(amplitude) => (
            <div style={{ width: 3, minWidth: 3, height: Math.max(4, Math.floor(amplitude * 54)), backgroundColor: color(), borderRadius: 1 }} />
          )}
        </For>
      </div>

      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: handleWidth(), cursor: "ew-resize", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: handleWidth(), cursor: "ew-resize", pointerEvents: "none" }} />

      <Show when={props.selected}>
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, borderWidth: 1, borderColor: "#60a5facc", pointerEvents: "none" }} />
      </Show>
    </div>
  )
}

export default ClipComponent