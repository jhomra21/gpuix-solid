import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import { PRESET_CATEGORIES, type LayoutPreset } from "../../upstream/diffusion-editor/apps/web/src/lib/layout-presets"
import { C, type DiffusionEditorState } from "./compat"

const text = { color: C.foreground, fontSize: 11 }
const muted = { color: C.mutedForeground, fontSize: 11 }

function Row(props: { label: string; shortcut?: string; testId?: string; onClick: () => void }): SolidElement {
  return (
    <div testId={props.testId} onClick={props.onClick} style={{ height: 28, paddingLeft: 8, paddingRight: 8, display: "flex", flexDirection: "row", alignItems: "center", gap: 8, cursor: "pointer", hover: { backgroundColor: C.secondaryHover } }}>
      <text style={{ ...text, flexGrow: 1 }}>{props.label}</text>
      <Show when={props.shortcut}><text style={{ ...muted, fontSize: 9 }}>{props.shortcut}</text></Show>
    </div>
  )
}

function Section(props: { title: string; children: SolidElement }): SolidElement {
  return (
    <div style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderColor: C.borderStrong }}>
      <text style={{ color: C.foreground, fontSize: 11, fontWeight: 650 }}>{props.title}</text>
      {props.children}
    </div>
  )
}

function Header(props: { state: DiffusionEditorState }): SolidElement {
  const [open, setOpen] = createSignal(false)
  const zoomLabel = () => `${Math.round(props.state.zoom() * 100)}%⌄`
  const setZoom = (value: number) => { props.state.setZoom(value); setOpen(false) }
  return (
    <div style={{ position: "relative", height: 48, flexShrink: 0, display: "flex", flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 10 }}>
      <text style={{ color: C.foreground, fontSize: 12, fontWeight: 500 }}>Editor</text>
      <div style={{ flexGrow: 1 }} />
      <div testId="diffusion-zoom" onClick={() => setOpen(!open())} style={{ height: 28, paddingLeft: 6, paddingRight: 2, display: "flex", flexDirection: "row", alignItems: "center", cursor: "pointer" }}>
        <text style={muted}>{zoomLabel()}</text>
      </div>
      <Show when={open()}>
        <div testId="diffusion-zoom-menu" style={{ position: "absolute", right: 10, top: 40, width: 160, padding: 5, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.background }}>
          <Row label="Zoom in" shortcut="⌘+" testId="diffusion-zoom-in" onClick={() => setZoom(Math.min(4, props.state.zoom() * 1.25))} />
          <Row label="Zoom out" shortcut="⌘-" testId="diffusion-zoom-out" onClick={() => setZoom(Math.max(0.1, props.state.zoom() * 0.8))} />
          <Row label="Zoom to fit" shortcut="⌘1" testId="diffusion-zoom-fit" onClick={() => setZoom(0.75)} />
          <Row label="Zoom to 50%" testId="diffusion-zoom-50" onClick={() => setZoom(0.5)} />
          <Row label="Zoom to 100%" shortcut="⌘0" testId="diffusion-zoom-100" onClick={() => setZoom(1)} />
          <Row label="Zoom to 200%" testId="diffusion-zoom-200" onClick={() => setZoom(2)} />
        </div>
      </Show>
    </div>
  )
}

function Stage(): SolidElement {
  return <><Section title="Background"><text style={muted}>Color  #FFFFFF</text></Section><Section title="Variables"><text style={muted}>No variables</text></Section></>
}

function Asset(props: { id: string }): SolidElement {
  return <><Section title="Asset"><text style={text}>{props.id}</text></Section><Section title="Source"><text style={muted}>Local project source</text></Section></>
}

function SceneTemplates(props: { onCreate: (preset: LayoutPreset) => void }): SolidElement {
  return (
    <Section title="Scene">
      <For each={PRESET_CATEGORIES}>
        {(category) => (
          <div style={{ gap: 2 }}>
            <text style={{ ...text, height: 28 }}>{category.label}</text>
            <For each={category.items}>
              {(preset) => (
                <div testId={`diffusion-scene-preset-${category.id}-${preset.width}x${preset.height}`} onClick={() => props.onCreate(preset)} style={{ height: 30, paddingLeft: 18, display: "flex", flexDirection: "row", alignItems: "center", cursor: "pointer", hover: { backgroundColor: C.secondaryHover } }}>
                  <text style={{ ...muted, flexGrow: 1 }}>{preset.label}</text>
                  <text style={{ color: "#F2F2F28C", fontSize: 10 }}>{preset.width}×{preset.height}</text>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </Section>
  )
}

export function Inspector(props: { state: DiffusionEditorState }): SolidElement {
  const [scene, setScene] = createSignal<LayoutPreset | null>(null)
  const createScene = (preset: LayoutPreset) => {
    setScene(preset)
    props.state.setSelectedAsset(null)
    props.state.setSelectedTool("move")
  }

  return (
    <div testId="diffusion-inspector" style={{ width: 264, height: "100%", flexShrink: 0, display: "flex", flexDirection: "column", backgroundColor: C.background }}>
      <Header state={props.state} />
      <div style={{ height: 1, backgroundColor: C.borderStrong }} />
      <div style={{ flexGrow: 1, minHeight: 0, overflowY: "scroll" }}>
        <Show when={props.state.selectedTool() === "frame"} fallback={
          <Show when={props.state.selectedAsset()} fallback={
            <Show when={scene()} fallback={<Stage />}>
              {(preset) => <><Section title="Export"><text style={muted}>Scene export</text></Section><Section title="Transform"><text style={muted}>{preset().width} × {preset().height}</text></Section><Section title="Appearance"><text style={muted}>100% opacity</text></Section></>}
            </Show>
          }>{(id) => <Asset id={id()} />}</Show>
        }>
          <SceneTemplates onCreate={createScene} />
        </Show>
      </div>
    </div>
  )
}
