import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import type { DiffusionEditorState } from "./compat"
import {
  TIME_FORMAT_OPTIONS,
  formatFrames,
  type TimeFormat,
} from "../../upstream/diffusion-editor/apps/web/src/components/timeline/time-format"

// Source: diffusionstudio/editor@585fb010, apps/web/src/engine/timeline/config.ts.
export const RULER_HEIGHT = 36
export const DEFAULT_TIMELINE_HEIGHT = 234
export const DEFAULT_CLIP_HEIGHT = 40
export const PLAYHEAD_FRAME = 162
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

export interface DiffusionTimelineClip {
  id: string
  name: string
  kind: "video" | "audio" | "caption" | "text"
  start: number
  end: number
  row: number
}

interface ClipPalette {
  background: string
  primary: string
  foreground: string
}

export interface DiffusionTimelineState {
  clips: () => DiffusionTimelineClip[]
  selectedClipId: () => string | null
  selectClip: (id: string) => void
  splitAtPlayhead: () => void
  clipHeight: () => number
  setClipHeight: (height: number) => void
  timeFormat: () => TimeFormat
  setTimeFormat: (format: TimeFormat) => void
  extraLayers: () => number
  addLayer: () => void
}

const INITIAL_CLIPS: DiffusionTimelineClip[] = [
  { id: "title", name: "Title", kind: "text", start: 24, end: 174, row: 0 },
  { id: "video", name: "studio-intro.mp4", kind: "video", start: 0, end: 300, row: 1 },
  { id: "voiceover", name: "voiceover.wav", kind: "audio", start: 42, end: 342, row: 2 },
  { id: "captions", name: "Classic Captions", kind: "caption", start: 60, end: 330, row: 3 },
]

export function createDiffusionTimelineState(): DiffusionTimelineState {
  const [clips, setClips] = createSignal<DiffusionTimelineClip[]>(INITIAL_CLIPS.map((clip) => ({ ...clip })))
  const [selectedClipId, setSelectedClipId] = createSignal<string | null>("video")
  const [clipHeight, setClipHeight] = createSignal(DEFAULT_CLIP_HEIGHT)
  const [timeFormat, setTimeFormat] = createSignal<TimeFormat>("standard")
  const [extraLayers, setExtraLayers] = createSignal(0)
  let splitSequence = 0

  const splitAtPlayhead = (): void => {
    const selected = selectedClipId()
    if (!selected) return

    setClips((current) => {
      const index = current.findIndex((clip) => clip.id === selected)
      const clip = current[index]
      if (!clip || PLAYHEAD_FRAME <= clip.start || PLAYHEAD_FRAME >= clip.end) return current

      const splitId = `${clip.id}-split-${++splitSequence}`
      const left = { ...clip, end: PLAYHEAD_FRAME }
      const right = { ...clip, id: splitId, start: PLAYHEAD_FRAME }
      return [...current.slice(0, index), left, right, ...current.slice(index + 1)]
    })
  }

  return {
    clips,
    selectedClipId,
    selectClip: setSelectedClipId,
    splitAtPlayhead,
    clipHeight,
    setClipHeight,
    timeFormat,
    setTimeFormat,
    extraLayers,
    addLayer: () => setExtraLayers((count) => count + 1),
  }
}

function clipColors(kind: DiffusionTimelineClip["kind"]): ClipPalette {
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

function NativeClip(props: {
  clip: DiffusionTimelineClip
  timeline: DiffusionTimelineState
}): SolidElement {
  const left = () => TIMELINE_PADDING_LEFT + framesToPixels(props.clip.start)
  const width = () => framesToPixels(props.clip.end - props.clip.start)
  const colors = clipColors(props.clip.kind)
  const selected = () => props.timeline.selectedClipId() === props.clip.id
  const height = () => props.timeline.clipHeight()

  return (
    <div
      testId={`diffusion-clip-${props.clip.id}`}
      onClick={() => props.timeline.selectClip(props.clip.id)}
      style={{
        position: "absolute",
        left: left(),
        top: props.clip.row * height(),
        width: width(),
        height: height(),
        borderRadius: 4,
        borderWidth: selected() ? 2 : 1,
        borderColor: selected() ? COLORS.ring : COLORS.borderDarker,
        backgroundColor: colors.background,
        overflow: "hidden",
        cursor: "pointer",
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
            height: Math.max(8, height() - 22),
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 1,
            opacity: 0.8,
            overflow: "hidden",
          }}
        >
          <For each={waveform}>
            {(peak) => <div style={{ width: 1, height: Math.max(1, Math.round(peak * Math.max(6, height() - 25))), flexShrink: 0, backgroundColor: colors.primary }} />}
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
  const left = TIMELINE_PADDING_LEFT + framesToPixels(PLAYHEAD_FRAME)

  return (
    <Show
      when={props.minimized}
      fallback={
        <>
          <div style={{ position: "absolute", left: left - 5, top: 2, width: 10, height: 10, borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderDarker, backgroundColor: COLORS.ring }} />
          <div style={{ position: "absolute", left, top: RULER_HEIGHT, bottom: 0, width: 1, backgroundColor: COLORS.ring }} />
        </>
      }
    >
      <div style={{ position: "absolute", left: left - 12, top: 8, width: 24, height: 19, borderRadius: 9, backgroundColor: COLORS.ring, alignItems: "center", justifyContent: "center" }}>
        <text style={{ color: "#FFFFFF", fontSize: 10 }}>{PLAYHEAD_FRAME}</text>
      </div>
    </Show>
  )
}

const HEIGHT_PRESETS = [
  { label: "Tight", height: 28 },
  { label: "Snug", height: 32 },
  { label: "Normal", height: 40 },
  { label: "Relaxed", height: 64 },
  { label: "Loose", height: 116 },
] as const

type TimelineMenuPage = "root" | "height" | "time"

const menuRowStyle = {
  height: 28,
  paddingLeft: 8,
  paddingRight: 8,
  display: "flex" as const,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  cursor: "pointer" as const,
  hover: { backgroundColor: "#FFFFFF17" },
}

function TimelineMenu(props: { timeline: DiffusionTimelineState; onClose: () => void }): SolidElement {
  const [page, setPage] = createSignal<TimelineMenuPage>("root")
  const selectHeight = (height: number) => {
    props.timeline.setClipHeight(height)
    props.onClose()
  }
  const selectTimeFormat = (format: TimeFormat) => {
    props.timeline.setTimeFormat(format)
    props.onClose()
  }

  return (
    <div
      testId="diffusion-more-menu"
      style={{
        position: "absolute",
        left: 82,
        top: RULER_HEIGHT - 2,
        width: 200,
        padding: 6,
        gap: 4,
        borderWidth: 1,
        borderColor: COLORS.borderInput,
        borderRadius: 7,
        backgroundColor: "#121212",
      }}
    >
      <Show when={page() !== "root"}>
        <div testId="diffusion-more-menu-back" onClick={() => setPage("root")} style={menuRowStyle}>
          <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>‹ Back</text>
        </div>
        <div style={{ height: 1, backgroundColor: "#FFFFFF0F" }} />
      </Show>

      <Show when={page() === "root"}>
        <div testId="diffusion-add-layer" onClick={() => { props.timeline.addLayer(); props.onClose() }} style={menuRowStyle}>
          <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>Add layer</text>
        </div>
        <div style={{ height: 1, backgroundColor: "#FFFFFF0F" }} />
        <div testId="diffusion-layer-height-menu" onClick={() => setPage("height")} style={menuRowStyle}>
          <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>Layer height</text>
          <text style={{ color: "#F2F2F2A3", fontSize: 11 }}>›</text>
        </div>
        <div style={{ height: 1, backgroundColor: "#FFFFFF0F" }} />
        <div testId="diffusion-time-format-menu" onClick={() => setPage("time")} style={menuRowStyle}>
          <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>Time format</text>
          <text style={{ color: "#F2F2F2A3", fontSize: 11 }}>›</text>
        </div>
      </Show>

      <Show when={page() === "height"}>
        <For each={HEIGHT_PRESETS}>
          {(preset) => (
            <div testId={`diffusion-layer-height-${preset.height}`} onClick={() => selectHeight(preset.height)} style={menuRowStyle}>
              <text style={{ width: 18, color: props.timeline.clipHeight() === preset.height ? COLORS.ring : "#00000000", fontSize: 10 }}>✓</text>
              <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 10 }}>{preset.label}</text>
              <text style={{ color: "#F2F2F2A3", fontSize: 9 }}>{preset.height}</text>
            </div>
          )}
        </For>
      </Show>

      <Show when={page() === "time"}>
        <For each={TIME_FORMAT_OPTIONS}>
          {(option) => (
            <div testId={`diffusion-time-format-${option.value}`} onClick={() => selectTimeFormat(option.value)} style={menuRowStyle}>
              <text style={{ width: 18, color: props.timeline.timeFormat() === option.value ? COLORS.ring : "#00000000", fontSize: 10 }}>✓</text>
              <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 10 }}>{option.label}</text>
              <text style={{ color: "#F2F2F2A3", fontSize: 9 }}>{option.example}</text>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

function layerRows(timeline: DiffusionTimelineState): Array<{ row: number; name: string }> {
  const clips = timeline.clips()
  const highestRow = clips.reduce((highest, clip) => Math.max(highest, clip.row), -1)
  const rows = Array.from({ length: highestRow + 1 }, (_, row) => ({
    row,
    name: clips.find((clip) => clip.row === row)?.name ?? `Layer ${row + 1}`,
  }))
  for (let index = 0; index < timeline.extraLayers(); index += 1) {
    rows.push({ row: highestRow + 1 + index, name: `Layer ${index + 1}` })
  }
  return rows
}

export function Layers(props: { state: DiffusionEditorState; timeline: DiffusionTimelineState }): SolidElement {
  const [moreOpen, setMoreOpen] = createSignal(false)
  const clock = () => formatFrames(PLAYHEAD_FRAME, FPS, props.timeline.timeFormat())

  return (
    <div testId="diffusion-layers" style={{ position: "relative", width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: "#121212" }}>
      <div style={{ height: RULER_HEIGHT, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 8, paddingRight: 12 }}>
        <div testId="diffusion-play" onClick={() => props.state.setPlaying(!props.state.playing())} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}>
          <text style={{ color: "#FFFFFFA3", fontSize: 11 }}>{props.state.playing() ? "Ⅱ" : "▶"}</text>
        </div>
        <div testId="diffusion-loop" onClick={() => props.state.setLooping(!props.state.looping())} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: props.state.looping() ? "#FFFFFF0F" : "#00000000", cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}>
          <text style={{ color: "#FFFFFFA3", fontSize: 11 }}>↻</text>
        </div>
        <Show when={!props.state.timelineMinimized()}>
          <div testId="diffusion-split" onClick={props.timeline.splitAtPlayhead} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>✂</text></div>
          <div testId="diffusion-more" onClick={() => setMoreOpen(!moreOpen())} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: moreOpen() ? "#FFFFFF0F" : "#00000000", hover: { backgroundColor: "#FFFFFF17" } }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>•••</text></div>
        </Show>
        <div style={{ flexGrow: 1 }} />
        <text testId="diffusion-clock" style={{ color: "#FFFFFFA3", fontSize: 10 }}>{clock()}</text>
      </div>
      <Show when={!props.state.timelineMinimized()}>
        <For each={layerRows(props.timeline)}>
          {(layer) => (
            <div testId={`diffusion-layer-row-${layer.row}`} style={{ height: props.timeline.clipHeight(), flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 10, paddingRight: 10, borderTopWidth: 1, borderColor: "#FFFFFF08" }}>
              <text style={{ color: "#FFFFFFA3", fontSize: 10 }}>▾</text>
              <text style={{ color: "#F2F2F2", fontSize: 11 }}>{layer.name}</text>
            </div>
          )}
        </For>
      </Show>
      <Show when={moreOpen() && !props.state.timelineMinimized()}>
        <TimelineMenu timeline={props.timeline} onClose={() => setMoreOpen(false)} />
      </Show>
    </div>
  )
}

export function Timeline(props: { state: DiffusionEditorState; timeline: DiffusionTimelineState }): SolidElement {
  return (
    <div testId="diffusion-timeline" style={{ position: "relative", flexGrow: 1, minWidth: 0, height: "100%", overflow: "hidden", backgroundColor: COLORS.background }}>
      <Ruler />
      <Show when={!props.state.timelineMinimized()}>
        <div style={{ position: "relative", flexGrow: 1, minHeight: 0 }}>
          <For each={props.timeline.clips()}>
            {(clip) => <NativeClip clip={clip} timeline={props.timeline} />}
          </For>
        </div>
      </Show>
      <Playhead minimized={props.state.timelineMinimized()} />
    </div>
  )
}