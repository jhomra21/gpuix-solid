import { createMemo, type JSX } from "solid-js"
import UpstreamClipComponent from "../upstream/components/timeline/ClipComponent"
import type { NativeClip } from "./model"
import { toSourceClip } from "./source-model"

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
  // Keep the exact source clip stable while the wrapper owns transient position.
  // ClipComponent's waveform effect can then stay asleep throughout pointermove.
  const clip = createMemo(() => ({ ...toSourceClip(props.clip), startSec: 0 }))

  return (
    <div
      testId="clip-drag-preview"
      style={{
        position: "absolute",
        left: props.startSec * props.pixelsPerSecond,
        top: props.top,
        width: Math.max(6, props.clip.duration * props.pixelsPerSecond),
        height: props.height,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <UpstreamClipComponent
        clip={clip()}
        trackId={props.trackId}
        isSelected={true}
        onPointerDown={() => {}}
        onPointerUp={() => {}}
        onResizeStart={() => {}}
        contextMenu={{
          selectClip: () => {},
          duplicateSelectedClips: () => {},
          deleteSelectedClips: () => {},
        }}
        onRetryMedia={() => {}}
        onReplaceMedia={() => {}}
        onRemoveMissingMedia={() => {}}
        bpm={props.bpm}
        pixelsPerSecond={props.pixelsPerSecond}
        viewportRedrawVersion={0}
        rangeOverlap={null}
        canEditFades={() => false}
        onCommitFades={() => {}}
      />
    </div>
  )
}
