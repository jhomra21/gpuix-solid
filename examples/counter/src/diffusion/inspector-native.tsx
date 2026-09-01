import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import { InspectorHeader } from "../../upstream/diffusion-editor/apps/web/src/components/sidebar-right/inspector/inspector-header"
import { PRESET_CATEGORIES, type LayoutPreset } from "../../upstream/diffusion-editor/apps/web/src/lib/layout-presets"
import { C, type DiffusionEditorState } from "./compat"
import { SourceDiffusionProvider } from "./source-adapters/runtime"
import "./source-styles"

const text = { color: C.foreground, fontSize: 11 }
const muted = { color: C.mutedForeground, fontSize: 11 }

function Section(props: { title: string; children: SolidElement }): SolidElement {
  return (
    <div style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderColor: C.borderStrong }}>
      <text style={{ color: C.foreground, fontSize: 11, fontWeight: 650 }}>{props.title}</text>
      {props.children}
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
      <SourceDiffusionProvider state={props.state}>
        <InspectorHeader />
      </SourceDiffusionProvider>
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
