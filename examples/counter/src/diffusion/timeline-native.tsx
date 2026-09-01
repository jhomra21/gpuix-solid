import { For, Show, type Element as SolidElement } from "solid-js"
import type { DiffusionEditorState } from "./compat"

// Source: diffusionstudio/editor@585fb010, apps/web/src/engine/timeline/config.ts.
export const RULER_HEIGHT = 36
export const DEFAULT_TIMELINE_HEIGHT = 234
const DEFAULT_CLIP_HEIGHT = 40
const TARGET_MAJOR_TICK_DISTANCE = 160
const DEFAULT_TIMELINE_RESOLUTION = 1 / 0.7
const FPS = 30
const TIMELINE_PADDING_LEFT = 8

const COLORS = {
  background: "#1C1C1C",
  border: "#353535",
  borderDarker: "#1C1C1C",
  borderInput: "#3E3F41",
  ring: "#008CFF",
  rulerText: "#4B4B4B",
  videoBackground: "#0F3C8A",
  videoPrimary: "#70A7FF",
  videoForeground: "#CCE0FF",
  audioBackground: "#004732",
  audioPrimary: "#0DBF8A",
  audioForeground: "#CBFAED",
  captionBackground: "#7B1E5A",
  captionForeground: "#F9DCED",
  textBackground: "#303E4F",
  textForeground: "#E7EFF9",
} as const

interface Interval {
  numerator: number
  denominator: number
}

// Exact interval list from apps/web/src/engine/timeline/constants.ts at 30fps.
const RULER_INTERVALS: Interval[] = [
  { numerator: 18_000, denominator: 10 },
  { numerator: 9_000, denominator: 5 },
  { numerator: 3_600, denominator: 4 },
  { numerator: 1_800, denominator: 6 },
  { numerator: 900, denominator: 10 },
  { numerator: 300, denominator: 10 },
  { numerator: 150, denominator: 10 },
  { numerator: 90, denominator: 10 },
  { numerator: 60, denominator: 10 },
  { numerator: 30, denominator: 10 },
  { numerator: 15, denominator: 5 },
  { numerator: 10, denominator: 10 },
  { numerator: 5, denominator: 5 },
]

function framesToPixels(frame: number, resolution = DEFAULT_TIMELINE_RESOLUTION): number {
  return frame * resolution
}

function getRulerInterval(resolution: number): Interval {
  let closest = RULER_INTERVALS[0]!
  let closestDelta = Infinity

  for (const interval of RULER_INTERVALS) {
    const delta = Math.abs(framesToPixels(interval.numerator, resolution) - TARGET_MAJOR_TICK_DISTANCE)
    if (delta < closestDelta) {
      closest = interval
      closestDelta = delta
    }
  }

  return closest
}

function formatTickLabel(frame: number): string {
  if (frame === 0) return "0"
  if (frame % FPS !== 0) return `${frame}f`

  const total = Math.round(frame / FPS)
  const minutes = Math.floor(total / 60).toString().padStart(2, "0")
  const seconds = Math.floor(total % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

interface TimelineClip {
  id: string
  name: string
  kind: "video" | "audio" | "caption" | "text"
  start: number
  end: number
}

// Deterministic native data stands in for Koota/runtime entities. Geometry and
// styling below follow Diffusion's real timeline renderer rather than the old
// GPUIX timeline demo.
const clips: TimelineClip[] = [
  { id: "title", name: "Title", kind: "text", start: 24, end: 174 },
  { id: "video", name: "studio-intro.mp4", kind: "video", start: 0, end: 300 },
  { id: "voiceover", name: "voiceover.wav", kind: "audio", start: 42, end: 342 },
  { id: "captions", name: "Classic Captions", kind: "caption", start: 60, end: 330 },
]

function clipColors(kind: TimelineClip["kind"]): { background: string; primary: string; foreground: string } {
  if (kind === "video") return { background: COLORS.videoBackground, primary: COLORS.videoPrimary, foreground: COLORS.videoForeground }
  if (kind === "audio") return { background: COLORS.audioBackground, primary: COLORS.audioPrimary, foreground: COLORS.audioForeground }
  if (kind === "caption") return { background: COLORS.captionBackground, primary: COLORS.captionForeground, foreground: COLORS.captionForeground }
  return { background: COLORS.textBackground, primary: COLORS.textForeground, foreground: COLORS.textForeground }
}

const waveform = [
  0.18, 0.34, 0.62, 0.44, 0.8, 0.52, 0.28, 0.68, 0.9, 0.48, 0.32, 0.74,
  0.56, 0.86, 0.4, 0.24, 0.58, 0.76, 0.46, 0.92, 0.64, 0.36, 0.7, 0.5,
  0.84, 0.3, 0.6, 0.42, 0.78, 0.54, 0.26, 0.72, 0.88, 0.38, 0.66, 0.48,
  0.82, 0.56, 0.34, 0.74, 0.52, 0.9, 0.44, 0.28, 0.62, 0.8, 0.46, 0.68,
]

function NativeClip(props: { clip: TimelineClip; row: number }): SolidElement {
  const left = TIMELINE_PADDING_LEFT + framesToPixels(props.clip.start)
  const width = framesToPixels(props.clip.end - props.clip.start)
  const colors = clipColors(props.clip.kind)

  return (
    <div
      testId={`diffusion-clip-${props.clip.id}`}
      style={{
        position: "absolute",
        left,
        top: props.row * DEFAULT_CLIP_HEIGHT,
        width,
        height: DEFAULT_CLIP_HEIGHT,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.borderDarker,
        backgroundColor: colors.background,
        overflow: "hidden",
      }}
    >
      <text style={{ position: "absolute", left: 6, top: 5, color: colors.foreground, fontSize: 11 }}>
        {props.clip.name}
      </text>
      <Show when={props.clip.kind === "audio" || props.clip.kind === "video"}>
        <div
          style={{
            position: "absolute",
            left: 4,
            right: 4,
            bottom: 3,
            height: 15,
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 1,
            opacity: 0.8,
            overflow: "hidden",
          }}
        >
          <For each={waveform}>
            {(peak) => <div style={{ width: 1, height: Math.max(1, Math.round(peak * 13)), flexShrink: 0, backgroundColor: colors.primary }} />}
          </For>
        </div>
      </Show>
    </div>
  )
}

function Ruler(): SolidElement {
  const interval = getRulerInterval(DEFAULT_TIMELINE_RESOLUTION)
  const step = Math.max(1, Math.round(interval.numerator / interval.denominator))
  const frames = Array.from({ length: 72 }, (_, index) => index * step)

  return (
    <div style={{ position: "relative", height: RULER_HEIGHT, flexShrink: 0, borderBottomWidth: 1, borderColor: COLORS.borderDarker }}>
      <For each={frames}>
        {(frame) => {
          const major = frame % interval.numerator === 0
          const x = TIMELINE_PADDING_LEFT + framesToPixels(frame)
          return (
            <div
              style={{
                position: "absolute",
                left: x,
                bottom: 0,
                width: 1,
                height: major ? 9 : 3,
                backgroundColor: COLORS.border,
              }}
            >
              <Show when={major}>
                <text style={{ position: "absolute", left: -14, top: -20, width: 30, textAlign: "center", color: COLORS.rulerText, fontSize: 10 }}>
                  {formatTickLabel(frame)}
                </text>
              </Show>
            </div>
          )
        }}
      </For>
    </div>
  )
}

function Playhead(props: { minimized: boolean }): SolidElement {
  const frame = 162
  const left = TIMELINE_PADDING_LEFT + framesToPixels(frame)

  if (props.minimized) {
    return (
      <div style={{ position: "absolute", left: left - 12, top: 8, width: 24, height: 19, borderRadius: 9, backgroundColor: COLORS.ring, alignItems: "center", justifyContent: "center" }}>
        <text style={{ color: "#FFFFFF", fontSize: 10 }}>162</text>
      </div>
    )
  }

  return (
    <>
      <div style={{ position: "absolute", left: left - 5, top: 2, width: 10, height: 10, borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderDarker, backgroundColor: COLORS.ring }} />
      <div style={{ position: "absolute", left, top: RULER_HEIGHT, bottom: 0, width: 1, backgroundColor: COLORS.ring }} />
    </>
  )
}

export function Layers(props: { state: DiffusionEditorState }): SolidElement {
  return (
    <div testId="diffusion-layers" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: "#121212" }}>
      <div style={{ height: RULER_HEIGHT, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 8, paddingRight: 12 }}>
        <div testId="diffusion-play" onClick={() => props.state.setPlaying(!props.state.playing())} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", hover: { backgroundColor: "#FFFFFF17" } }}>
          <text style={{ color: "#FFFFFFA3", fontSize: 11 }}>{props.state.playing() ? "Ⅱ" : "▶"}</text>
        </div>
        <div testId="diffusion-loop" onClick={() => props.state.setLooping(!props.state.looping())} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: props.state.looping() ? "#FFFFFF0F" : "#00000000", hover: { backgroundColor: "#FFFFFF17" } }}>
          <text style={{ color: "#FFFFFFA3", fontSize: 11 }}>↻</text>
        </div>
        <Show when={!props.state.timelineMinimized()}>
          <div testId="diffusion-split" style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>✂</text></div>
          <div testId="diffusion-more" style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>•••</text></div>
        </Show>
        <div style={{ flexGrow: 1 }} />
        <text style={{ color: "#FFFFFFA3", fontSize: 10 }}>00:00:05:12</text>
      </div>
      <Show when={!props.state.timelineMinimized()}>
        <For each={clips}>
          {(clip) => (
            <div style={{ height: DEFAULT_CLIP_HEIGHT, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 10, paddingRight: 10, borderTopWidth: 1, borderColor: "#FFFFFF08" }}>
              <text style={{ color: "#FFFFFFA3", fontSize: 10 }}>▾</text>
              <text style={{ color: "#F2F2F2", fontSize: 11 }}>{clip.name}</text>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

export function Timeline(props: { state: DiffusionEditorState }): SolidElement {
  return (
    <div testId="diffusion-timeline" style={{ position: "relative", flexGrow: 1, minWidth: 0, height: "100%", overflow: "hidden", backgroundColor: COLORS.background }}>
      <Ruler />
      <Show when={!props.state.timelineMinimized()}>
        <div style={{ position: "relative", flexGrow: 1, minHeight: 0 }}>
          <For each={clips}>
            {(clip, index) => <NativeClip clip={clip} row={index()} />}
          </For>
        </div>
      </Show>
      <Playhead minimized={props.state.timelineMinimized()} />
    </div>
  )
}
