import type { JSX } from "solid-js"
import type { ClipDragPreview as DragPreview } from "./clip-drag"
import { dawTheme } from "./theme"

export interface ClipDragPreviewProps {
  preview: DragPreview
  top: number
  height: number
  pixelsPerSecond: number
}

export default function ClipDragPreview(props: ClipDragPreviewProps): JSX.Element {
  const color = () => props.preview.clip.color
    ?? (props.preview.clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio)

  return (
    <div
      testId="clip-drag-preview"
      style={{
        position: "absolute",
        left: props.preview.startSec * props.pixelsPerSecond,
        top: props.top,
        width: Math.max(6, props.preview.clip.duration * props.pixelsPerSecond),
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
        {props.preview.clip.name}
      </text>
    </div>
  )
}
