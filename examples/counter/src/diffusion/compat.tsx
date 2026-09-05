import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload, StyleDesc } from "gpuix-solid"

export type DiffusionTool = "move" | "hand" | "frame" | "rect" | "text" | "ai"

export interface DiffusionEditorState {
  projectName: () => string
  setProjectName: (value: string) => void
  uiVisible: () => boolean
  setUiVisible: (value: boolean) => void
  timelineMinimized: () => boolean
  setTimelineMinimized: (value: boolean) => void
  selectedTool: () => DiffusionTool
  setSelectedTool: (value: DiffusionTool) => void
  selectedAsset: () => string | null
  setSelectedAsset: (value: string | null) => void
  zoom: () => number
  setZoom: (value: number) => void
  playing: () => boolean
  setPlaying: (value: boolean) => void
  looping: () => boolean
  setLooping: (value: boolean) => void
}

export const C = {
  background: "#121212",
  canvas: "#171717",
  sidebar: "#121212",
  foreground: "#F2F2F2",
  mutedForeground: "#F2F2F2A3",
  secondary: "#FFFFFF0F",
  secondaryHover: "#FFFFFF17",
  muted: "#FFFFFF17",
  border: "#FFFFFF08",
  borderStrong: "#FFFFFF0F",
  input: "#FFFFFF0F",
  primary: "#0095FF",
  selection: "#003F70",
  audioBackground: "#0E493C",
  audioPrimary: "#197B61",
  captionBackground: "#5F254A",
  meterGreen: "#43E15B",
  meterYellow: "#F0C84F",
  meterRed: "#F35C59",
} as const

const panelText: StyleDesc = { color: C.foreground, fontSize: 11 }
const mutedText: StyleDesc = { color: C.mutedForeground, fontSize: 11 }

function Button(props: {
  children: SolidElement
  active?: boolean
  testId?: string
  onClick?: () => void
  width?: number
}): SolidElement {
  return (
    <div
      testId={props.testId}
      onClick={props.onClick}
      style={{
        height: 28,
        minWidth: props.width ?? 28,
        paddingLeft: 7,
        paddingRight: 7,
        borderRadius: 6,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backgroundColor: props.active ? C.secondary : "#00000000",
        hover: { backgroundColor: C.secondaryHover },
        active: { backgroundColor: C.muted },
      }}
    >
      {props.children}
    </div>
  )
}

function Divider(props: { vertical?: boolean }): SolidElement {
  return <div style={props.vertical
    ? { width: 1, height: "100%", flexShrink: 0, backgroundColor: C.borderStrong }
    : { height: 1, width: "100%", flexShrink: 0, backgroundColor: C.borderStrong }} />
}

function Section(props: { title: string; children: SolidElement }): SolidElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", borderBottomWidth: 1, borderColor: C.borderStrong }}>
      <div style={{ height: 34, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 12 }}>
        <text style={{ color: C.foreground, fontSize: 11, fontWeight: 600 }}>{props.title}</text>
        <div style={{ flexGrow: 1 }} />
        <text style={{ color: C.mutedForeground, fontSize: 11 }}>⌄</text>
      </div>
      <div style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 12, gap: 8 }}>{props.children}</div>
    </div>
  )
}

export function SidebarLeft(props: { state: DiffusionEditorState }): SolidElement {
  const assets = [
    { id: "video-1", name: "studio-intro.mp4", kind: "VIDEO" },
    { id: "audio-1", name: "voiceover.wav", kind: "AUDIO" },
    { id: "image-1", name: "cover.png", kind: "IMAGE" },
    { id: "font-1", name: "Inter Variable", kind: "FONT" },
  ] as const
  const [query, setQuery] = createSignal("")
  const filtered = createMemo(() => {
    const value = query().trim().toLowerCase()
    return value ? assets.filter((asset) => asset.name.toLowerCase().includes(value)) : assets
  })

  return (
    <div testId="diffusion-sidebar-left" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: C.sidebar }}>
      <div style={{ height: 40, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 6, paddingRight: 10, borderBottomWidth: 1, borderColor: C.borderStrong }}>
        <div style={{ flexGrow: 1 }} />
        <Button testId="diffusion-toggle-timeline" active={!props.state.timelineMinimized()} onClick={() => props.state.setTimelineMinimized(!props.state.timelineMinimized())}>
          <text style={mutedText}>▤</text>
        </Button>
        <Button testId="diffusion-toggle-ui" onClick={() => props.state.setUiVisible(false)}>
          <text style={mutedText}>▥</text>
        </Button>
      </div>

      <div style={{ height: 48, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 10, paddingRight: 16 }}>
        <Button testId="diffusion-project-menu"><text style={panelText}>☰</text></Button>
        <input
          testId="diffusion-project-name"
          value={props.state.projectName()}
          placeholder="Project name"
          onChange={(event: EventPayload) => props.state.setProjectName(event.value ?? "")}
          style={{ flexGrow: 1, height: 24, borderWidth: 0, backgroundColor: "#00000000", color: C.mutedForeground, fontSize: 11, paddingLeft: 5, paddingRight: 5 }}
        />
      </div>

      <Divider />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0 }}>
        <div style={{ height: 42, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 12, paddingRight: 12, gap: 6 }}>
          <text style={{ color: C.foreground, fontSize: 12, fontWeight: 600 }}>Assets</text>
          <div style={{ flexGrow: 1 }} />
          <Button testId="diffusion-import"><text style={mutedText}>＋</text></Button>
        </div>
        <div style={{ paddingLeft: 10, paddingRight: 10, paddingBottom: 8 }}>
          <input
            testId="diffusion-asset-search"
            value={query()}
            placeholder="Search assets"
            onChange={(event: EventPayload) => setQuery(event.value ?? "")}
            style={{ width: "100%", height: 30, paddingLeft: 9, paddingRight: 9, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 6, backgroundColor: C.input, color: C.foreground, fontSize: 11 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 12, paddingRight: 12, height: 28 }}>
          <text style={mutedText}>All assets</text>
          <text style={{ ...mutedText, fontSize: 9 }}>›</text>
        </div>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 10, overflowY: "scroll", flexGrow: 1, minHeight: 0 }}>
          <For each={filtered()} fallback={<text style={mutedText}>No assets</text>}>
            {(asset) => (
              <div
                testId={`diffusion-asset-${asset.id}`}
                onClick={() => props.state.setSelectedAsset(asset.id)}
                style={{
                  width: 112,
                  height: 82,
                  padding: 7,
                  gap: 5,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: props.state.selectedAsset() === asset.id ? C.primary : C.borderStrong,
                  backgroundColor: props.state.selectedAsset() === asset.id ? C.selection : C.secondary,
                  cursor: "pointer",
                  hover: { backgroundColor: C.secondaryHover },
                }}
              >
                <div style={{ flexGrow: 1, borderRadius: 4, alignItems: "center", justifyContent: "center", backgroundColor: C.canvas }}>
                  <text style={{ color: C.mutedForeground, fontSize: 10 }}>{asset.kind}</text>
                </div>
                <text style={{ color: C.foreground, fontSize: 10 }}>{asset.name}</text>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  )
}

export function Toolbar(props: { state: DiffusionEditorState }): SolidElement {
  const tools: Array<{ id: DiffusionTool; label: string }> = [
    { id: "move", label: "↖" },
    { id: "hand", label: "✋" },
    { id: "frame", label: "□" },
    { id: "rect", label: "▭" },
    { id: "text", label: "T" },
    { id: "ai", label: "✦" },
  ]

  return (
    <div testId="diffusion-toolbar" style={{ position: "absolute", left: 260, bottom: 16, display: "flex", flexDirection: "row", alignItems: "center", gap: 4, padding: 6, borderRadius: 12, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.background }}>
      <For each={tools}>
        {(tool) => (
          <Button testId={`diffusion-tool-${tool.id}`} active={props.state.selectedTool() === tool.id} onClick={() => props.state.setSelectedTool(tool.id)}>
            <text style={{ color: props.state.selectedTool() === tool.id ? C.foreground : C.mutedForeground, fontSize: 12 }}>{tool.label}</text>
          </Button>
        )}
      </For>
    </div>
  )
}

export function Canvas(props: { state: DiffusionEditorState }): SolidElement {
  return (
    <div testId="diffusion-canvas" style={{ position: "relative", flexGrow: 1, minWidth: 0, minHeight: 0, height: "100%", backgroundColor: C.canvas, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 80, right: 80, top: 50, bottom: 90, borderRadius: 4, backgroundColor: "#0B0B0B", borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "72%", height: "72%", backgroundColor: "#E7E7E7", alignItems: "center", justifyContent: "center" }}>
          <text style={{ color: "#181818", fontSize: 20, fontWeight: 650 }}>Diffusion Studio</text>
        </div>
      </div>
      <Toolbar state={props.state} />
    </div>
  )
}

export function Inspector(props: { state: DiffusionEditorState }): SolidElement {
  const zoomLabel = () => `${Math.round(props.state.zoom() * 100)}%`
  return (
    <div testId="diffusion-inspector" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: C.background }}>
      <div style={{ height: 48, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 10 }}>
        <text style={{ color: C.foreground, fontSize: 12, fontWeight: 500 }}>Editor</text>
        <div style={{ flexGrow: 1 }} />
        <Button testId="diffusion-zoom" onClick={() => props.state.setZoom(props.state.zoom() >= 2 ? 0.5 : props.state.zoom() + 0.5)}>
          <text style={mutedText}>{zoomLabel()}⌄</text>
        </Button>
      </div>
      <Divider />
      <div style={{ flexGrow: 1, minHeight: 0, overflowY: "scroll" }}>
        <Show when={props.state.selectedAsset()} fallback={
          <>
            <Section title="Background">
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                <text style={mutedText}>Color</text><div style={{ flexGrow: 1 }} />
                <div style={{ width: 28, height: 20, borderRadius: 4, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: "#FFFFFF" }} />
              </div>
            </Section>
            <Section title="Variables"><text style={mutedText}>No variables</text></Section>
          </>
        }>
          {(asset) => (
            <>
              <Section title="Asset">
                <text style={panelText}>{asset()}</text>
                <text style={mutedText}>Project library asset</text>
              </Section>
              <Section title="Source"><text style={mutedText}>Local project source</text></Section>
            </>
          )}
        </Show>
      </div>
    </div>
  )
}

interface LayerRow {
  id: string
  name: string
  type: "shape" | "text" | "audio" | "caption"
}

const layerRows: LayerRow[] = [
  { id: "captions", name: "Captions", type: "caption" },
  { id: "title", name: "Title", type: "text" },
  { id: "video", name: "Video", type: "shape" },
  { id: "voiceover", name: "Voiceover", type: "audio" },
]

export function Layers(props: { state: DiffusionEditorState }): SolidElement {
  return (
    <div testId="diffusion-layers" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: C.background }}>
      <div style={{ height: 32, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 8, paddingRight: 8 }}>
        <Button testId="diffusion-play" onClick={() => props.state.setPlaying(!props.state.playing())}><text style={mutedText}>{props.state.playing() ? "Ⅱ" : "▶"}</text></Button>
        <Button testId="diffusion-loop" active={props.state.looping()} onClick={() => props.state.setLooping(!props.state.looping())}><text style={mutedText}>↻</text></Button>
        <Show when={!props.state.timelineMinimized()}>
          <Button testId="diffusion-split"><text style={mutedText}>✂</text></Button>
          <Button testId="diffusion-more"><text style={mutedText}>•••</text></Button>
        </Show>
        <div style={{ flexGrow: 1 }} />
        <text style={{ color: C.mutedForeground, fontSize: 10 }}>00:00:05:12</text>
      </div>
      <Divider />
      <Show when={!props.state.timelineMinimized()}>
        <For each={layerRows}>
          {(layer) => (
            <div style={{ height: layer.type === "audio" ? 48 : 36, display: "flex", flexDirection: "row", alignItems: "center", gap: 7, paddingLeft: 10, paddingRight: 10, borderBottomWidth: 1, borderColor: C.border }}>
              <text style={{ color: C.mutedForeground, fontSize: 10 }}>▾</text>
              <text style={{ color: C.foreground, fontSize: 11 }}>{layer.name}</text>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

export function Timeline(props: { state: DiffusionEditorState }): SolidElement {
  const ticks = [0, 2, 4, 6, 8, 10, 12]
  return (
    <div testId="diffusion-timeline" style={{ position: "relative", flexGrow: 1, minWidth: 0, height: "100%", overflow: "hidden", backgroundColor: C.background }}>
      <div style={{ height: 32, borderBottomWidth: 1, borderColor: C.borderStrong, position: "relative" }}>
        <For each={ticks}>
          {(tick, index) => (
            <div style={{ position: "absolute", left: index() * 90, top: 0, bottom: 0, width: 1, backgroundColor: C.borderStrong }}>
              <text style={{ position: "absolute", left: 5, top: 8, color: C.mutedForeground, fontSize: 9 }}>{String(tick)}</text>
            </div>
          )}
        </For>
      </div>
      <Show when={!props.state.timelineMinimized()}>
        <div style={{ position: "relative", flexGrow: 1, minHeight: 0 }}>
          <For each={layerRows}>
            {(layer, index) => {
              const rowHeight = layer.type === "audio" ? 48 : 36
              const top = index() * 36
              const fill = layer.type === "audio" ? C.audioBackground : layer.type === "caption" ? C.captionBackground : "#2B3340"
              return (
                <div style={{ position: "absolute", left: 0, right: 0, top, height: rowHeight, borderBottomWidth: 1, borderColor: C.border }}>
                  <div style={{ position: "absolute", left: 40 + index() * 45, top: 4, width: 220 - index() * 18, bottom: 4, borderRadius: 4, backgroundColor: fill, borderWidth: 1, borderColor: layer.type === "audio" ? C.audioPrimary : C.borderStrong, paddingLeft: 7, justifyContent: "center" }}>
                    <text style={{ color: C.foreground, fontSize: 10 }}>{layer.name}</text>
                    <Show when={layer.type === "audio"}>
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, height: 18 }}>
                        <For each={[7, 13, 9, 16, 11, 19, 8, 14, 10, 17, 12, 6, 15, 9, 18]}>
                          {(height) => <div style={{ width: 2, height, borderRadius: 1, backgroundColor: C.audioPrimary }} />}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
              )
            }}
          </For>
          <div style={{ position: "absolute", left: 300, top: 0, bottom: 0, width: 1, backgroundColor: C.primary }} />
        </div>
      </Show>
    </div>
  )
}

function Meter(props: { level: number }): SolidElement {
  return (
    <div style={{ width: 12, height: 150, display: "flex", flexDirection: "column", justifyContent: "flex-end", borderRadius: 3, backgroundColor: C.input, overflow: "hidden" }}>
      <div style={{ height: Math.round(props.level * 150), backgroundColor: props.level > 0.85 ? C.meterRed : props.level > 0.65 ? C.meterYellow : C.meterGreen }} />
    </div>
  )
}

export function Soundboard(): SolidElement {
  const meters = [
    { name: "Layer 2", level: 0.55 },
    { name: "Layer 1", level: 0.72 },
    { name: "Master", level: 0.62 },
  ]
  return (
    <div testId="diffusion-soundboard" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 18, paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: C.background }}>
      <For each={meters}>
        {(meter) => (
          <div style={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <div style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 5 }}>
              <div style={{ width: 8, height: 150, borderRadius: 4, backgroundColor: C.input }} />
              <Meter level={meter.level} />
            </div>
            <text style={{ color: C.mutedForeground, fontSize: 10 }}>{meter.name}</text>
          </div>
        )}
      </For>
    </div>
  )
}

export function FloatingProjectHeader(props: { state: DiffusionEditorState }): SolidElement {
  return (
    <div testId="diffusion-floating-header" style={{ position: "absolute", left: 16, top: 16, height: 40, display: "flex", flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 8, paddingRight: 8, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.background }}>
      <Button><text style={panelText}>☰</text></Button>
      <text style={{ color: C.mutedForeground, fontSize: 11 }}>Diffusion Studio</text>
      <Button testId="diffusion-show-ui" onClick={() => props.state.setUiVisible(true)}><text style={mutedText}>▥</text></Button>
    </div>
  )
}

export { Divider }
