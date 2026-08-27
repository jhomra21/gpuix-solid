import type { JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import NativeClipComponent from "../../../native/ClipComponent"
import type { RuntimeClip, Track } from "../../../compat/timeline-core-types"
import type { ClipFades } from "../../../compat/clip-fades"
import type { ClipRangeOverlap } from "../../../compat/timeline-range-selection"

export type ClipContextMenuActions = {
  selectClip: (trackId: Track["id"], clipId: string) => void
  duplicateSelectedClips: () => void
  deleteSelectedClips: () => void
}

type Props = {
  clip: RuntimeClip
  trackId: Track["id"]
  isSelected: boolean
  onPointerDown: (trackId: Track["id"], clipId: string, event: PointerEvent) => void
  onPointerUp: (trackId: Track["id"], clipId: string, event: PointerEvent) => void
  onResizeStart: (trackId: Track["id"], clipId: string, edge: "left" | "right", event: PointerEvent) => void
  onDblClick?: (trackId: Track["id"], clipId: string) => void
  contextMenu: ClipContextMenuActions
  onRetryMedia: (clipId: string) => void
  onReplaceMedia: (trackId: Track["id"], clipId: string) => void
  onRemoveMissingMedia: (trackId: Track["id"], clipId: string) => void
  ensureClipBuffer?: (clipId: string, sampleUrl?: string) => Promise<void>
  bpm: number
  pixelsPerSecond: number
  viewportRedrawVersion: number
  rangeOverlap: ClipRangeOverlap | null
  canEditFades: () => boolean
  onCommitFades: (clipId: string, fades: ClipFades, baseline: ClipFades) => void
}

function pointerEvent(event: EventPayload): PointerEvent {
  // SAFETY: the Solid host EventRegistry dispatches mouse/pointer handlers with its DOM-compatible event facade, including PointerEvent coordinates, button state, targets, and control methods.
  return event as PointerEvent
}

const ClipComponent = (props: Props): JSX.Element => (
  <NativeClipComponent
    clip={props.clip}
    selected={props.isSelected}
    pixelsPerSecond={props.pixelsPerSecond}
    onSelect={() => props.contextMenu.selectClip(props.trackId, props.clip.id)}
    onPointerDown={(event) => props.onPointerDown(props.trackId, props.clip.id, pointerEvent(event))}
  />
)

export default ClipComponent
