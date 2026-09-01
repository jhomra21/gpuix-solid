import { Show, createSignal, type Element as SolidElement } from "solid-js"
import {
  C,
  Divider,
  FloatingProjectHeader,
  Inspector,
  Soundboard,
  type DiffusionEditorState,
  type DiffusionTool,
} from "./compat"
import { Canvas } from "./canvas-native"
import { SidebarLeft } from "./sidebar-left-native"
import {
  DEFAULT_TIMELINE_HEIGHT,
  Layers,
  RULER_HEIGHT,
  Timeline,
  createDiffusionTimelineState,
} from "./timeline-native"

export function EditorPage(): SolidElement {
  const [projectName, setProjectName] = createSignal("Diffusion Studio")
  const [uiVisible, setUiVisible] = createSignal(true)
  const [timelineMinimized, setTimelineMinimized] = createSignal(false)
  const [selectedTool, setSelectedTool] = createSignal<DiffusionTool>("move")
  const [selectedAsset, setSelectedAsset] = createSignal<string | null>(null)
  const [zoom, setZoom] = createSignal(1)
  const [playing, setPlaying] = createSignal(false)
  const [looping, setLooping] = createSignal(false)
  const [promptOpen, setPromptOpen] = createSignal(false)
  const timeline = createDiffusionTimelineState()

  const state: DiffusionEditorState = {
    projectName,
    setProjectName,
    uiVisible,
    setUiVisible,
    timelineMinimized,
    setTimelineMinimized,
    selectedTool,
    setSelectedTool,
    selectedAsset,
    setSelectedAsset,
    zoom,
    setZoom,
    playing,
    setPlaying,
    looping,
    setLooping,
  }

  return (
    <div
      testId="diffusion-editor"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: C.sidebar,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", flexGrow: 1, minHeight: 0 }}>
        <Show when={uiVisible()}>
          <SidebarLeft state={state} onGenerateAI={() => setPromptOpen(true)} />
          <Divider vertical />
        </Show>
        <Canvas state={state} promptOpen={promptOpen} setPromptOpen={setPromptOpen} />
        <Show when={uiVisible()}>
          <Divider vertical />
          <Inspector state={state} />
        </Show>
      </div>

      <Show when={uiVisible()}>
        <Divider />
        <div
          testId="diffusion-timeline-row"
          style={{
            display: "flex",
            flexDirection: "row",
            height: timelineMinimized() ? RULER_HEIGHT : DEFAULT_TIMELINE_HEIGHT,
            flexShrink: 0,
            backgroundColor: C.background,
          }}
        >
          <Layers state={state} timeline={timeline} />
          <Divider vertical />
          <Timeline state={state} timeline={timeline} />
          <Divider vertical />
          <Show when={!timelineMinimized()} fallback={<div style={{ width: 264, flexShrink: 0, backgroundColor: C.background }} />}>
            <Soundboard />
          </Show>
        </div>
      </Show>

      <Show when={!uiVisible()}>
        <FloatingProjectHeader state={state} />
      </Show>
    </div>
  )
}

export default EditorPage
