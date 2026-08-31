import { Show, createSignal, type Element as SolidElement } from "solid-js"
import {
  C,
  Canvas,
  Divider,
  FloatingProjectHeader,
  Inspector,
  Layers,
  SidebarLeft,
  Soundboard,
  Timeline,
  type DiffusionEditorState,
  type DiffusionTool,
} from "./compat"

const TIMELINE_HEIGHT = 260
const RULER_HEIGHT = 32

export function EditorPage(): SolidElement {
  const [projectName, setProjectName] = createSignal("Diffusion Studio")
  const [uiVisible, setUiVisible] = createSignal(true)
  const [timelineMinimized, setTimelineMinimized] = createSignal(false)
  const [selectedTool, setSelectedTool] = createSignal<DiffusionTool>("move")
  const [selectedAsset, setSelectedAsset] = createSignal<string | null>(null)
  const [zoom, setZoom] = createSignal(1)
  const [playing, setPlaying] = createSignal(false)
  const [looping, setLooping] = createSignal(false)

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
          <SidebarLeft state={state} />
          <Divider vertical />
        </Show>
        <Canvas state={state} />
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
            height: timelineMinimized() ? RULER_HEIGHT : TIMELINE_HEIGHT,
            flexShrink: 0,
            backgroundColor: C.background,
          }}
        >
          <Layers state={state} />
          <Divider vertical />
          <Timeline state={state} />
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
