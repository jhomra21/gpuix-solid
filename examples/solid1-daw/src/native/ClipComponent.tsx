import { For, onCleanup, Show, type JSX } from "solid-js"
import type { EventPayload } from "@jhomra21/gpuix-solid1"
import type { NativeClip } from "./model"
import { dawTheme, layout, textXs } from "./theme"

export interface ClipComponentProps {
  clip: NativeClip
  selected: boolean
  pixelsPerSecond: number
  onSelect: () => void
  onOpen: () => void
  onMouseDown: (event: EventPayload) => void
}

function visualColor(clip: NativeClip): string {
  return clip.color ?? (clip.kind === "midi" ? dawTheme.clipMidi : dawTheme.clipAudio)
}

function alphaHex(color: string, alpha: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color
}

const DOUBLE_TAP_MS = 700
const DOUBLE_TAP_DISTANCE_PX = 8
const SELECTED_TAP_MS = 700
let lastClipTap: { clipId: string; at: number; x: number; y: number } | undefined

const ClipComponent = (props: ClipComponentProps): JSX.Element => {
  const width = () => Math.max(6, Math.floor(props.clip.duration * props.pixelsPerSecond))
  const handleWidth = () => width() < 18 ? 2 : width() < 28 ? 3 : 6
  const color = () => visualColor(props.clip)
  let selectedTapStart: { x: number; y: number; at: number } | undefined
  let globalPointerUpArmed = false

  const disarmGlobalPointerUp = (): void => {
    if (!globalPointerUpArmed) return
    window.removeEventListener("pointerup", handleGlobalPointerUp, true)
    globalPointerUpArmed = false
  }

  const finishSelectedTap = (x: number, y: number, button: number): void => {
    const start = selectedTapStart
    selectedTapStart = undefined
    disarmGlobalPointerUp()
    if (!start || button !== 0) return
    if (performance.now() - start.at > SELECTED_TAP_MS) return
    if (Math.abs(x - start.x) > DOUBLE_TAP_DISTANCE_PX || Math.abs(y - start.y) > DOUBLE_TAP_DISTANCE_PX) return
    lastClipTap = undefined
    props.onOpen()
  }

  function handleGlobalPointerUp(event: PointerEvent): void {
    finishSelectedTap(event.clientX, event.clientY, event.button)
  }

  const armGlobalPointerUp = (): void => {
    if (globalPointerUpArmed) return
    window.addEventListener("pointerup", handleGlobalPointerUp, true)
    globalPointerUpArmed = true
  }

  const handleMouseDown = (event: EventPayload): void => {
    const button = event.button ?? 0
    if (button !== 0) {
      selectedTapStart = undefined
      disarmGlobalPointerUp()
      props.onMouseDown(event)
      return
    }

    // Upstream records a selected-tap candidate before selection/drag handling.
    // The native fixture can insert its drag layer after this event, so keep a
    // global pointer-up listener as the equivalent of upstream pointer capture.
    selectedTapStart = props.selected
      ? { x: event.clientX ?? event.x ?? 0, y: event.clientY ?? event.y ?? 0, at: performance.now() }
      : undefined
    if (selectedTapStart) armGlobalPointerUp()
    else disarmGlobalPointerUp()
    props.onMouseDown(event)
  }

  const handleMouseUp = (event: EventPayload): void => {
    finishSelectedTap(
      event.clientX ?? event.x ?? 0,
      event.clientY ?? event.y ?? 0,
      event.button ?? 0,
    )
  }

  const handleClick = (event: EventPayload): void => {
    const now = performance.now()
    const x = event.x ?? 0
    const y = event.y ?? 0
    const previous = lastClipTap
    lastClipTap = { clipId: props.clip.id, at: now, x, y }
    props.onSelect()

    // This remains only as the click-only/double-click compatibility path.
    // Live pointer input opens selected clips from the pointer-up candidate above.
    if (!previous || previous.clipId !== props.clip.id || now - previous.at > DOUBLE_TAP_MS) return
    if (Math.abs(x - previous.x) > DOUBLE_TAP_DISTANCE_PX || Math.abs(y - previous.y) > DOUBLE_TAP_DISTANCE_PX) return
    lastClipTap = undefined
    props.onOpen()
  }

  onCleanup(disarmGlobalPointerUp)

  return (
    <div
      testId={`clip-${props.clip.id}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
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