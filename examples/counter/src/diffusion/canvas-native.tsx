import { For, Show, createSignal, type Element as SolidElement } from "solid-js"
import type { EventPayload } from "gpuix-solid"
import { C, type DiffusionEditorState, type DiffusionTool } from "./compat"

interface ToolbarButtonProps {
  label: string
  active?: boolean
  testId: string
  width?: number
  onClick: () => void
}

function ToolbarButton(props: ToolbarButtonProps): SolidElement {
  return (
    <div
      testId={props.testId}
      onClick={props.onClick}
      style={{
        width: props.width ?? 32,
        height: 32,
        flexShrink: 0,
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        backgroundColor: props.active ? C.secondary : "#00000000",
        hover: { backgroundColor: C.secondaryHover },
        active: { backgroundColor: C.muted },
      }}
    >
      <text style={{ color: props.active ? C.foreground : C.mutedForeground, fontSize: 12 }}>
        {props.label}
      </text>
    </div>
  )
}

function Separator(): SolidElement {
  return <div style={{ width: 1, height: 20, flexShrink: 0, backgroundColor: C.borderStrong }} />
}

type PromptMode = "IMAGE" | "VIDEO" | "VOICE" | "AUDIO"

const promptModes: PromptMode[] = ["IMAGE", "VIDEO", "VOICE", "AUDIO"]

function PromptInput(props: { onClose: () => void }): SolidElement {
  const [prompt, setPrompt] = createSignal("")
  const [mode, setMode] = createSignal<PromptMode>("IMAGE")
  const [settingsVisible, setSettingsVisible] = createSignal(false)
  const [generated, setGenerated] = createSignal<string | null>(null)

  const cycleMode = () => {
    const current = promptModes.indexOf(mode())
    setMode(promptModes[(current + 1) % promptModes.length] ?? "IMAGE")
    setGenerated(null)
  }

  const submit = () => {
    const value = prompt().trim()
    if (!value) return
    setGenerated(`${mode().toLowerCase()} generation queued locally`)
  }

  return (
    <div
      testId="diffusion-prompt"
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 64,
        maxWidth: 576,
        alignSelf: "center",
        padding: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: C.borderStrong,
        borderRadius: 12,
        backgroundColor: C.background,
      }}
    >
      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
        <text style={{ color: C.mutedForeground, fontSize: 10 }}>GENERATE</text>
        <div style={{ flexGrow: 1 }} />
        <ToolbarButton testId="diffusion-prompt-close" label="×" onClick={props.onClose} />
      </div>

      <input
        testId="diffusion-prompt-input"
        value={prompt()}
        placeholder="Describe what you want to create. Type / to open prompt history."
        onChange={(event: EventPayload) => {
          setPrompt(event.value ?? "")
          setGenerated(null)
        }}
        style={{
          width: "100%",
          minHeight: 56,
          borderWidth: 0,
          backgroundColor: "#00000000",
          color: C.foreground,
          fontSize: 11,
          padding: 6,
        }}
      />

      <Show when={generated()}>
        {(message) => <text testId="diffusion-prompt-result" style={{ color: C.mutedForeground, fontSize: 10 }}>{message()}</text>}
      </Show>

      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
        <div
          testId="diffusion-prompt-mode"
          onClick={cycleMode}
          style={{
            height: 28,
            paddingLeft: 9,
            paddingRight: 9,
            borderRadius: 6,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
            hover: { backgroundColor: C.secondaryHover },
          }}
        >
          <text style={{ color: C.mutedForeground, fontSize: 10 }}>{mode()}</text>
          <text style={{ color: C.mutedForeground, fontSize: 9 }}>⌄</text>
        </div>
        <ToolbarButton
          testId="diffusion-prompt-settings"
          label="☷"
          active={settingsVisible()}
          onClick={() => setSettingsVisible(!settingsVisible())}
        />
        <Show when={settingsVisible()}>
          <Separator />
          <For each={mode() === "IMAGE" ? ["Flux 1.1", "16:9", "1 variant"] : mode() === "VIDEO" ? ["Kling", "16:9", "6s", "Audio on"] : mode() === "VOICE" ? ["Voice", "Natural"] : ["Audio", "Stereo"]}>
            {(setting) => <text style={{ color: C.mutedForeground, fontSize: 10, paddingLeft: 4, paddingRight: 4 }}>{setting}</text>}
          </For>
        </Show>
        <div style={{ flexGrow: 1 }} />
        <ToolbarButton testId="diffusion-prompt-submit" label="↑" active={prompt().trim().length > 0} onClick={submit} />
      </div>
    </div>
  )
}

function ToolButton(props: { state: DiffusionEditorState; tool: DiffusionTool; label: string; testId: string }): SolidElement {
  return (
    <ToolbarButton
      testId={props.testId}
      label={props.label}
      active={props.state.selectedTool() === props.tool}
      onClick={() => props.state.setSelectedTool(props.tool)}
    />
  )
}

function Toolbar(props: { state: DiffusionEditorState; promptOpen: boolean; onPromptToggle: () => void }): SolidElement {
  const selectionTool = () => props.state.selectedTool() === "hand" ? "hand" : "move"

  return (
    <div
      testId="diffusion-toolbar"
      style={{
        position: "absolute",
        left: 260,
        bottom: 16,
        height: 44,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        padding: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.borderStrong,
        backgroundColor: C.background,
      }}
    >
      <ToolbarButton
        testId={`diffusion-tool-${selectionTool()}`}
        label={selectionTool() === "hand" ? "✋" : "↖"}
        active={props.state.selectedTool() === "move" || props.state.selectedTool() === "hand"}
        onClick={() => props.state.setSelectedTool(selectionTool())}
      />
      <ToolbarButton
        testId="diffusion-tool-select-menu"
        label="⌄"
        width={22}
        onClick={() => props.state.setSelectedTool(selectionTool() === "move" ? "hand" : "move")}
      />
      <Separator />
      <ToolButton state={props.state} tool="frame" label="□" testId="diffusion-tool-frame" />
      <ToolButton state={props.state} tool="rect" label="▭" testId="diffusion-tool-rect" />
      <ToolButton state={props.state} tool="text" label="T" testId="diffusion-tool-text" />
      <Separator />
      <ToolbarButton testId="diffusion-ai-generate" label="✦" active={props.promptOpen} onClick={props.onPromptToggle} />
    </div>
  )
}

export function Canvas(props: { state: DiffusionEditorState }): SolidElement {
  const [promptOpen, setPromptOpen] = createSignal(false)

  return (
    <div
      testId="diffusion-canvas"
      style={{
        position: "relative",
        flexGrow: 1,
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        backgroundColor: C.background,
        overflow: "hidden",
      }}
    >
      <div
        testId="diffusion-engine-canvas"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: C.canvas,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "72%",
            height: "72%",
            borderRadius: 2,
            borderWidth: 1,
            borderColor: C.borderStrong,
            backgroundColor: "#E7E7E7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <text style={{ color: "#181818", fontSize: 20, fontWeight: 650 }}>Diffusion Studio</text>
        </div>
      </div>
      <Show when={promptOpen()}>
        <PromptInput onClose={() => setPromptOpen(false)} />
      </Show>
      <Toolbar state={props.state} promptOpen={promptOpen()} onPromptToggle={() => setPromptOpen(!promptOpen())} />
    </div>
  )
}
