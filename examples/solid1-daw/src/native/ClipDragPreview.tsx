import type { JSX } from "solid-js"
import type { NativeClip } from "./model"
import { dawTheme } from "./theme"

export interface ClipDragPreviewProps {
  clip: NativeClip
  trackId: string
  startSec: number
  top: number
  height: number
  pixelsPerSecond: number
  bpm: number
}

export default function ClipDragPreview(props: ClipDragPreviewProps): JSX.Element {
  const color = () => props.clip.color
    ?? (props.clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio)

  // This is native gesture feedback, not a second application clip. Mounting the
  // exact source ClipComponent here duplicates waveform/canvas, fade, menu, and
  // resize machinery on the pointer-move hot path. The canonical source lane is
  // still exact and is hidden while this shallow preview owns transient motion.
  return (
    <div
      testId="clip-drag-preview"
      style={{
        position: "absolute",
        left: props.startSec * props.pixelsPerSecond,
        top: props.top,
        width: Math.max(6, props.clip.duration * props.pixelsPerSecond),
        height: Math.max(1, props.height - 1),
        overflow: "hidden",
        borderWidth: 1,
        borderColor: dawTheme.blueSoft,
        backgroundColor: color(),
        opacity: 0.72,
        pointerEvents: "none",
      }}
    >
      <text
        style={{
          paddingLeft: 6,
          paddingTop: 4,
          fontSize: 12,
          color: dawTheme.foreground,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          userSelect: "none",
        }}
      >
        {props.clip.name}
      </text>
    </div>
  )
}
