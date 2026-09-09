import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import type { DiffusionEditorState } from "./compat"
import {
  DEFAULT_CLIP_HEIGHT,
  PLAYHEAD_FRAME,
  type DiffusionTimelineClip,
  type DiffusionTimelineState,
} from "./timeline-native"
import {
  TIME_FORMAT_OPTIONS,
  formatFrames,
  type TimeFormat,
} from "../../upstream/diffusion-editor/apps/web/src/components/timeline/time-format"

const FPS = 30
const RULER_HEIGHT = 36

export interface DiffusionLayerState {
  id: string
  name: string
  kind: DiffusionTimelineClip["kind"] | "sequence"
  muted: boolean
  soloed: boolean
  hidden: boolean
}

export interface SourceDiffusionTimelineState extends DiffusionTimelineState {
  layers: () => DiffusionLayerState[]
  selectedLayerId: () => string | null
  selectLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  toggleLayerMuted: (id: string) => void
  toggleLayerSoloed: (id: string) => void
  toggleLayerHidden: (id: string) => void
  reorderLayer: (id: string, target: "front" | "back") => void
  removeLayer: (id: string) => void
}

const INITIAL_CLIPS: DiffusionTimelineClip[] = [
  { id: "title", name: "Title", kind: "text", start: 24, end: 174, row: 0 },
  { id: "video", name: "studio-intro.mp4", kind: "video", start: 0, end: 300, row: 1 },
  { id: "voiceover", name: "voiceover.wav", kind: "audio", start: 42, end: 342, row: 2 },
  { id: "captions", name: "Classic Captions", kind: "caption", start: 60, end: 330, row: 3 },
]

const INITIAL_LAYERS: DiffusionLayerState[] = INITIAL_CLIPS.map((clip) => ({
  id: clip.id,
  name: clip.name,
  kind: clip.kind,
  muted: false,
  soloed: false,
  hidden: false,
}))

function remapClipRows(clips: DiffusionTimelineClip[], layers: DiffusionLayerState[]): DiffusionTimelineClip[] {
  const rowById = new Map(layers.map((layer, row) => [layer.id, row]))
  return clips
    .filter((clip) => rowById.has(clip.id))
    .map((clip) => ({ ...clip, row: rowById.get(clip.id) ?? clip.row }))
}

export function createSourceDiffusionTimelineState(): SourceDiffusionTimelineState {
  const [clips, setClips] = createSignal<DiffusionTimelineClip[]>(INITIAL_CLIPS.map((clip) => ({ ...clip })))
  const [layers, setLayers] = createSignal<DiffusionLayerState[]>(INITIAL_LAYERS.map((layer) => ({ ...layer })))
  const [selectedClipId, setSelectedClipId] = createSignal<string | null>("video")
  const [selectedLayerId, setSelectedLayerId] = createSignal<string | null>("video")
  const [clipHeight, setClipHeight] = createSignal(DEFAULT_CLIP_HEIGHT)
  const [timeFormat, setTimeFormat] = createSignal<TimeFormat>("standard")
  let splitSequence = 0
  let layerSequence = 0

  const selectLayer = (id: string): void => {
    setSelectedLayerId(id)
    if (clips().some((clip) => clip.id === id)) setSelectedClipId(id)
  }

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

  const addLayer = (): void => {
    const id = `layer-${++layerSequence}`
    const name = `Layer ${layerSequence}`
    setLayers((current) => [...current, { id, name, kind: "sequence", muted: false, soloed: false, hidden: false }])
    setSelectedLayerId(id)
  }

  const renameLayer = (id: string, name: string): void => {
    const nextName = name.trim()
    if (!nextName) return
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, name: nextName } : layer))
    setClips((current) => current.map((clip) => clip.id === id ? { ...clip, name: nextName } : clip))
  }

  const toggleLayerMuted = (id: string): void => {
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, muted: !layer.muted } : layer))
  }

  const toggleLayerSoloed = (id: string): void => {
    setLayers((current) => {
      const wasSoloed = current.find((layer) => layer.id === id)?.soloed ?? false
      return current.map((layer) => ({ ...layer, soloed: layer.id === id ? !wasSoloed : false }))
    })
  }

  const toggleLayerHidden = (id: string): void => {
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, hidden: !layer.hidden } : layer))
  }

  const reorderLayer = (id: string, target: "front" | "back"): void => {
    setLayers((current) => {
      const layer = current.find((candidate) => candidate.id === id)
      if (!layer) return current
      const rest = current.filter((candidate) => candidate.id !== id)
      const next = target === "front" ? [...rest, layer] : [layer, ...rest]
      setClips((clipsCurrent) => remapClipRows(clipsCurrent, next))
      return next
    })
  }

  const removeLayer = (id: string): void => {
    setLayers((current) => {
      const next = current.filter((layer) => layer.id !== id)
      setClips((clipsCurrent) => remapClipRows(clipsCurrent.filter((clip) => clip.id !== id), next))
      return next
    })
    if (selectedLayerId() === id) setSelectedLayerId(null)
    if (selectedClipId() === id) setSelectedClipId(null)
  }

  return {
    clips,
    selectedClipId,
    selectClip: (id) => { setSelectedClipId(id); setSelectedLayerId(id) },
    splitAtPlayhead,
    clipHeight,
    setClipHeight,
    timeFormat,
    setTimeFormat,
    extraLayers: () => layers().filter((layer) => layer.kind === "sequence").length,
    addLayer,
    layers,
    selectedLayerId,
    selectLayer,
    renameLayer,
    toggleLayerMuted,
    toggleLayerSoloed,
    toggleLayerHidden,
    reorderLayer,
    removeLayer,
  }
}

function layerIcon(kind: DiffusionLayerState["kind"]): string {
  if (kind === "video") return "▣"
  if (kind === "audio") return "♫"
  if (kind === "caption") return "CC"
  if (kind === "text") return "T"
  return "▤"
}

type ContextAction = "mute" | "solo" | "hide" | "front" | "back" | "remove"

function LayerRow(props: {
  layer: DiffusionLayerState
  timeline: SourceDiffusionTimelineState
  rowIndex: number
  onContextMenu: (layerId: string, rowIndex: number) => void
}): SolidElement {
  const [hovered, setHovered] = createSignal(false)
  const [editing, setEditing] = createSignal(false)
  const [editName, setEditName] = createSignal(props.layer.name)
  const selected = () => props.timeline.selectedLayerId() === props.layer.id
  const muteVisible = () => hovered() || props.layer.muted
  const soloVisible = () => hovered() || props.layer.soloed
  const hideVisible = () => hovered() || props.layer.hidden

  const commitRename = (): void => {
    const next = editName().trim()
    if (next) props.timeline.renameLayer(props.layer.id, next)
    else setEditName(props.layer.name)
    setEditing(false)
  }

  return (
    <div
      testId={`diffusion-layer-row-${props.layer.id}`}
      onClick={() => props.timeline.selectLayer(props.layer.id)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onContextMenu={() => props.onContextMenu(props.layer.id, props.rowIndex)}
      style={{
        position: "relative",
        height: props.timeline.clipHeight(),
        flexShrink: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 2,
        paddingRight: 8,
        color: "#FFFFFFA3",
        backgroundColor: selected() ? "#FFFFFF12" : "#00000000",
        borderTopWidth: 1,
        borderColor: "#FFFFFF08",
        cursor: "pointer",
        hover: { backgroundColor: selected() ? "#FFFFFF12" : "#FFFFFF0B" },
      }}
    >
      <div style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <text style={{ color: "#FFFFFF66", fontSize: 9 }}>›</text>
      </div>
      <div style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center", flexShrink: 0, pointerEvents: "none" }}>
        <text style={{ color: "#FFFFFFA3", fontSize: props.layer.kind === "caption" ? 8 : 10 }}>{layerIcon(props.layer.kind)}</text>
      </div>
      <Show
        when={editing()}
        fallback={
          <text
            testId={`diffusion-layer-name-${props.layer.id}`}
            onDblClick={() => { setEditName(props.layer.name); setEditing(true) }}
            style={{ flexGrow: 1, minWidth: 0, color: "#F2F2F2", fontSize: 11, paddingLeft: 2 }}
          >
            {props.layer.name}
          </text>
        }
      >
        <input
          testId={`diffusion-layer-name-input-${props.layer.id}`}
          value={editName()}
          onChange={(event: EventPayload) => setEditName(event.value ?? "")}
          onSubmit={commitRename}
          style={{ flexGrow: 1, minWidth: 0, height: 24, paddingLeft: 4, paddingRight: 4, borderWidth: 1, borderColor: "#008CFF", borderRadius: 4, backgroundColor: "#262626", color: "#F2F2F2", fontSize: 11 }}
        />
      </Show>

      <Show when={!editing()}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2 }}>
          <div testId={`diffusion-layer-mute-${props.layer.id}`} aria-label={props.layer.muted ? "Unmute" : "Mute"} onClick={() => props.timeline.toggleLayerMuted(props.layer.id)} style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: props.layer.muted ? "#FFFFFF12" : "#00000000", cursor: "pointer", opacity: muteVisible() ? 1 : 0, pointerEvents: muteVisible() ? "auto" : "none" }}><text style={{ color: "#FFFFFFA3", fontSize: 9, pointerEvents: "none" }}>M</text></div>
          <div testId={`diffusion-layer-solo-${props.layer.id}`} aria-label={props.layer.soloed ? "Unsolo" : "Solo"} onClick={() => props.timeline.toggleLayerSoloed(props.layer.id)} style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: props.layer.soloed ? "#FFFFFF12" : "#00000000", cursor: "pointer", opacity: soloVisible() ? 1 : 0, pointerEvents: soloVisible() ? "auto" : "none" }}><text style={{ color: "#FFFFFFA3", fontSize: 9, pointerEvents: "none" }}>S</text></div>
          <div testId={`diffusion-layer-hide-${props.layer.id}`} aria-label={props.layer.hidden ? "Show" : "Hide"} onClick={() => props.timeline.toggleLayerHidden(props.layer.id)} style={{ width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: props.layer.hidden ? "#FFFFFF12" : "#00000000", cursor: "pointer", opacity: hideVisible() ? 1 : 0, pointerEvents: hideVisible() ? "auto" : "none" }}><text style={{ color: "#FFFFFFA3", fontSize: 9, pointerEvents: "none" }}>{props.layer.hidden ? "◌" : "●"}</text></div>
        </div>
      </Show>
    </div>
  )
}

function LayerContextMenu(props: {
  layer: DiffusionLayerState
  timeline: SourceDiffusionTimelineState
  rowIndex: number
  onClose: () => void
}): SolidElement {
  const action = (value: ContextAction): void => {
    if (value === "mute") props.timeline.toggleLayerMuted(props.layer.id)
    else if (value === "solo") props.timeline.toggleLayerSoloed(props.layer.id)
    else if (value === "hide") props.timeline.toggleLayerHidden(props.layer.id)
    else if (value === "front") props.timeline.reorderLayer(props.layer.id, "front")
    else if (value === "back") props.timeline.reorderLayer(props.layer.id, "back")
    else props.timeline.removeLayer(props.layer.id)
    props.onClose()
  }

  const menuTop = () => props.rowIndex >= 2
    ? RULER_HEIGHT + 4
    : RULER_HEIGHT + props.rowIndex * props.timeline.clipHeight() + 24

  const row = (value: ContextAction, label: string, shortcut = ""): SolidElement => (
    <div
      testId={`diffusion-layer-context-${value}-${props.layer.id}`}
      onClick={() => action(value)}
      style={{ height: 28, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 8, paddingRight: 8, borderRadius: 5, cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}
    >
      <text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 10 }}>{label}</text>
      <Show when={shortcut}><text style={{ color: "#FFFFFF66", fontSize: 9 }}>{shortcut}</text></Show>
    </div>
  )

  return (
    <div
      testId={`diffusion-layer-context-${props.layer.id}`}
      style={{ position: "absolute", left: 88, top: menuTop(), width: 160, padding: 6, gap: 2, borderWidth: 1, borderColor: "#3E3F41", borderRadius: 7, backgroundColor: "#121212" }}
    >
      {row("mute", props.layer.muted ? "Unmute" : "Mute")}
      {row("solo", props.layer.soloed ? "Unsolo" : "Solo")}
      {row("hide", props.layer.hidden ? "Unhide" : "Hide")}
      <div style={{ height: 1, marginTop: 2, marginBottom: 2, backgroundColor: "#FFFFFF0F" }} />
      {row("front", "Bring to front", "]")}
      {row("back", "Send to back", "[")}
      <div style={{ height: 1, marginTop: 2, marginBottom: 2, backgroundColor: "#FFFFFF0F" }} />
      {row("remove", "Remove")}
    </div>
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

function TimelineMenu(props: { timeline: SourceDiffusionTimelineState; onClose: () => void }): SolidElement {
  const [page, setPage] = createSignal<TimelineMenuPage>("root")
  const selectHeight = (height: number) => { props.timeline.setClipHeight(height); props.onClose() }
  const selectTimeFormat = (format: TimeFormat) => { props.timeline.setTimeFormat(format); props.onClose() }

  return (
    <div testId="diffusion-more-menu" style={{ position: "absolute", left: 82, top: RULER_HEIGHT - 2, width: 200, padding: 6, gap: 4, borderWidth: 1, borderColor: "#3E3F41", borderRadius: 7, backgroundColor: "#121212" }}>
      <Show when={page() !== "root"}>
        <div testId="diffusion-more-menu-back" onClick={() => setPage("root")} style={menuRowStyle}><text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>‹ Back</text></div>
        <div style={{ height: 1, backgroundColor: "#FFFFFF0F" }} />
      </Show>
      <Show when={page() === "root"}>
        <div testId="diffusion-add-layer" onClick={() => { props.timeline.addLayer(); props.onClose() }} style={menuRowStyle}><text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>Add layer</text></div>
        <div style={{ height: 1, backgroundColor: "#FFFFFF0F" }} />
        <div testId="diffusion-layer-height-menu" onClick={() => setPage("height")} style={menuRowStyle}><text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>Layer height</text><text style={{ color: "#F2F2F2A3", fontSize: 11 }}>›</text></div>
        <div style={{ height: 1, backgroundColor: "#FFFFFF0F" }} />
        <div testId="diffusion-time-format-menu" onClick={() => setPage("time")} style={menuRowStyle}><text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 11 }}>Time format</text><text style={{ color: "#F2F2F2A3", fontSize: 11 }}>›</text></div>
      </Show>
      <Show when={page() === "height"}>
        <For each={HEIGHT_PRESETS}>{(preset) => <div testId={`diffusion-layer-height-${preset.height}`} onClick={() => selectHeight(preset.height)} style={menuRowStyle}><text style={{ width: 18, color: props.timeline.clipHeight() === preset.height ? "#008CFF" : "#00000000", fontSize: 10 }}>✓</text><text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 10 }}>{preset.label}</text><text style={{ color: "#F2F2F2A3", fontSize: 9 }}>{preset.height}</text></div>}</For>
      </Show>
      <Show when={page() === "time"}>
        <For each={TIME_FORMAT_OPTIONS}>{(option) => <div testId={`diffusion-time-format-${option.value}`} onClick={() => selectTimeFormat(option.value)} style={menuRowStyle}><text style={{ width: 18, color: props.timeline.timeFormat() === option.value ? "#008CFF" : "#00000000", fontSize: 10 }}>✓</text><text style={{ flexGrow: 1, color: "#F2F2F2", fontSize: 10 }}>{option.label}</text><text style={{ color: "#F2F2F2A3", fontSize: 9 }}>{option.example}</text></div>}</For>
      </Show>
    </div>
  )
}

export function Layers(props: { state: DiffusionEditorState; timeline: SourceDiffusionTimelineState }): SolidElement {
  const [moreOpen, setMoreOpen] = createSignal(false)
  const [contextLayerId, setContextLayerId] = createSignal<string | null>(null)
  const [contextRowIndex, setContextRowIndex] = createSignal(0)
  const clock = createMemo(() => formatFrames(PLAYHEAD_FRAME, FPS, props.timeline.timeFormat()))
  const contextLayer = createMemo(() => props.timeline.layers().find((layer) => layer.id === contextLayerId()))

  const openContextMenu = (layerId: string, rowIndex: number): void => {
    setMoreOpen(false)
    setContextLayerId(layerId)
    setContextRowIndex(rowIndex)
  }

  return (
    <div testId="diffusion-layers" style={{ position: "relative", width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: "#121212" }}>
      <div testId="diffusion-layers-header" onDblClick={() => props.state.setTimelineMinimized(!props.state.timelineMinimized())} style={{ height: RULER_HEIGHT, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 8, paddingRight: 12 }}>
        <div testId="diffusion-play" onClick={() => props.state.setPlaying(!props.state.playing())} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>{props.state.playing() ? "Ⅱ" : "▶"}</text></div>
        <div testId="diffusion-loop" onClick={() => props.state.setLooping(!props.state.looping())} style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: props.state.looping() ? "#FFFFFF0F" : "#00000000", cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>↻</text></div>
        <Show when={!props.state.timelineMinimized()}>
          <div testId="diffusion-split" onClick={props.timeline.splitAtPlayhead} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", cursor: "pointer", hover: { backgroundColor: "#FFFFFF17" } }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>✂</text></div>
          <div testId="diffusion-more" onClick={() => { setContextLayerId(null); setMoreOpen(!moreOpen()) }} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: moreOpen() ? "#FFFFFF0F" : "#00000000", hover: { backgroundColor: "#FFFFFF17" } }}><text style={{ color: "#FFFFFFA3", fontSize: 11 }}>•••</text></div>
        </Show>
        <div style={{ flexGrow: 1 }} />
        <text testId="diffusion-clock" style={{ color: "#FFFFFFA3", fontSize: 10 }}>{clock()}</text>
      </div>
      <Show when={!props.state.timelineMinimized()}>
        <For each={props.timeline.layers()}>
          {(layer, index) => <LayerRow layer={layer} timeline={props.timeline} rowIndex={index()} onContextMenu={openContextMenu} />}
        </For>
      </Show>
      <Show when={moreOpen() && !props.state.timelineMinimized()}><TimelineMenu timeline={props.timeline} onClose={() => setMoreOpen(false)} /></Show>
      <Show when={contextLayer() && !props.state.timelineMinimized()}>
        <LayerContextMenu layer={contextLayer()!} timeline={props.timeline} rowIndex={contextRowIndex()} onClose={() => setContextLayerId(null)} />
      </Show>
    </div>
  )
}
