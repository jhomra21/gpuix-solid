import { For, Show, createMemo, createSignal, type Element as SolidElement } from "solid-js"
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
      <text style={{ color: props.active ? C.foreground : C.mutedForeground, fontSize: 12, pointerEvents: "none" }}>
        {props.label}
      </text>
    </div>
  )
}

function Separator(): SolidElement {
  return <div style={{ width: 1, height: 20, flexShrink: 0, backgroundColor: C.borderStrong }} />
}

type PromptMode = "IMAGE" | "VIDEO"
type PromptMenu = "mode" | "model" | "aspect" | "variants" | "duration" | null

interface ModelOption {
  id: string
  name: string
  description: string
}

interface VideoModelOption extends ModelOption {
  aspectRatios: readonly string[]
  durations: readonly number[]
  audio: boolean
}

// Source-derived demo subset from Diffusion Studio's gen-ai/config.ts.
const IMAGE_MODELS: readonly ModelOption[] = [
  { id: "flux-2-turbo", name: "FLUX.2 [DEV] Turbo", description: "Low budget, high quality, fast turbo mode." },
  { id: "gpt-image-2", name: "GPT Image 2", description: "Flexible sizes up to 4K, true aspect ratios." },
]

const VIDEO_MODELS: readonly VideoModelOption[] = [
  {
    id: "kling-3-pro",
    name: "Kling 3.0",
    description: "Cinematic motion with built-in audio.",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    audio: true,
  },
  {
    id: "veo-3.1",
    name: "Veo 3.1",
    description: "Realistic physics, complex scenes.",
    aspectRatios: ["16:9", "9:16"],
    durations: [4, 6, 8],
    audio: false,
  },
]

const IMAGE_ASPECTS = ["16:9", "9:16", "1:1"] as const
const IMAGE_VARIANTS = [1, 2] as const

function PromptMenuSurface(props: {
  label: string
  children: SolidElement
}): SolidElement {
  return (
    <div
      testId="diffusion-prompt-menu"
      style={{
        position: "absolute",
        left: 8,
        bottom: 44,
        width: 260,
        maxHeight: 190,
        overflowY: "scroll",
        padding: 6,
        gap: 2,
        borderWidth: 1,
        borderColor: C.borderStrong,
        borderRadius: 8,
        backgroundColor: C.background,
        boxShadow: { offsetX: 0, offsetY: 8, blurRadius: 20, spreadRadius: 0, color: "#00000044" },
      }}
    >
      <text style={{ color: C.mutedForeground, fontSize: 10, paddingLeft: 8, paddingTop: 4, paddingBottom: 4 }}>
        {props.label}
      </text>
      {props.children}
    </div>
  )
}

function PromptMenuRow(props: {
  testId: string
  label: string
  description?: string
  selected?: boolean
  onClick: () => void
}): SolidElement {
  return (
    <div
      testId={props.testId}
      onClick={props.onClick}
      style={{
        minHeight: props.description ? 42 : 32,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 6,
        cursor: "pointer",
        backgroundColor: props.selected ? C.secondary : "#00000000",
        hover: { backgroundColor: C.secondaryHover },
      }}
    >
      <div style={{ flexGrow: 1, minWidth: 0, gap: 2, pointerEvents: "none" }}>
        <text style={{ color: C.foreground, fontSize: 10 }}>{props.label}</text>
        <Show when={props.description}>
          {(description) => <text style={{ color: C.mutedForeground, fontSize: 9 }}>{description()}</text>}
        </Show>
      </div>
      <Show when={props.selected}>
        <text style={{ color: C.foreground, fontSize: 10, pointerEvents: "none" }}>✓</text>
      </Show>
    </div>
  )
}

function PromptSettingButton(props: {
  testId: string
  label: string
  active?: boolean
  onClick: () => void
}): SolidElement {
  return (
    <div
      testId={props.testId}
      onClick={props.onClick}
      style={{
        height: 28,
        paddingLeft: 8,
        paddingRight: 8,
        borderRadius: 6,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        cursor: "pointer",
        backgroundColor: props.active ? C.secondary : "#00000000",
        hover: { backgroundColor: C.secondaryHover },
      }}
    >
      <text style={{ color: C.mutedForeground, fontSize: 10, pointerEvents: "none" }}>{props.label}</text>
      <text style={{ color: C.mutedForeground, fontSize: 8, pointerEvents: "none" }}>⌄</text>
    </div>
  )
}

function PromptInput(): SolidElement {
  const [prompt, setPrompt] = createSignal("")
  const [mode, setMode] = createSignal<PromptMode>("IMAGE")
  const [settingsVisible, setSettingsVisible] = createSignal(false)
  const [menu, setMenu] = createSignal<PromptMenu>(null)
  const [generated, setGenerated] = createSignal<string | null>(null)
  const [imageModel, setImageModel] = createSignal(IMAGE_MODELS[0]!.id)
  const [imageAspect, setImageAspect] = createSignal<string>("16:9")
  const [imageVariants, setImageVariants] = createSignal<number>(1)
  const [videoModel, setVideoModel] = createSignal(VIDEO_MODELS[0]!.id)
  const [videoAspect, setVideoAspect] = createSignal<string>("16:9")
  const [videoDuration, setVideoDuration] = createSignal<number>(6)
  const [videoAudio, setVideoAudio] = createSignal(true)

  const currentImageModel = createMemo(() => IMAGE_MODELS.find((option) => option.id === imageModel()) ?? IMAGE_MODELS[0]!)
  const currentVideoModel = createMemo(() => VIDEO_MODELS.find((option) => option.id === videoModel()) ?? VIDEO_MODELS[0]!)

  const toggleMenu = (next: Exclude<PromptMenu, null>) => setMenu((current) => current === next ? null : next)

  const changeMode = (next: PromptMode): void => {
    setMode(next)
    setMenu(null)
    setGenerated(null)
  }

  const changeVideoModel = (id: string): void => {
    const next = VIDEO_MODELS.find((option) => option.id === id)
    if (!next) return
    setVideoModel(id)
    if (!next.aspectRatios.includes(videoAspect())) setVideoAspect(next.aspectRatios[0] ?? "16:9")
    if (!next.durations.includes(videoDuration())) setVideoDuration(next.durations[0] ?? 6)
    if (!next.audio) setVideoAudio(false)
    setMenu(null)
    setGenerated(null)
  }

  const submit = (): void => {
    const value = prompt().trim()
    if (!value) return
    if (mode() === "IMAGE") {
      setGenerated(`image generation queued locally · ${currentImageModel().name} · ${imageAspect()} · ${imageVariants()} variant${imageVariants() === 1 ? "" : "s"}`)
    } else {
      setGenerated(`video generation queued locally · ${currentVideoModel().name} · ${videoAspect()} · ${videoDuration()}s${currentVideoModel().audio ? ` · audio ${videoAudio() ? "on" : "off"}` : ""}`)
    }
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
      <input
        testId="diffusion-prompt-input"
        value={prompt()}
        placeholder="Describe what you want to create. Type / to open prompt history."
        onChange={(event: EventPayload) => {
          setPrompt(event.value ?? "")
          setGenerated(null)
        }}
        onSubmit={submit}
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

      <div style={{ position: "relative", display: "flex", flexDirection: "row", alignItems: "center", gap: 4 }}>
        <PromptSettingButton testId="diffusion-prompt-mode" label={mode() === "IMAGE" ? "Image" : "Video"} active={menu() === "mode"} onClick={() => toggleMenu("mode")} />
        <ToolbarButton testId="diffusion-prompt-settings" label="☷" active={settingsVisible()} onClick={() => { setSettingsVisible(!settingsVisible()); setMenu(null) }} />
        <Show when={settingsVisible()}>
          <Separator />
          <Show
            when={mode() === "IMAGE"}
            fallback={
              <>
                <PromptSettingButton testId="diffusion-prompt-model" label={currentVideoModel().name} active={menu() === "model"} onClick={() => toggleMenu("model")} />
                <PromptSettingButton testId="diffusion-prompt-aspect" label={videoAspect()} active={menu() === "aspect"} onClick={() => toggleMenu("aspect")} />
                <PromptSettingButton testId="diffusion-prompt-duration" label={`${videoDuration()}s`} active={menu() === "duration"} onClick={() => toggleMenu("duration")} />
                <Show when={currentVideoModel().audio}>
                  <div
                    testId="diffusion-prompt-audio"
                    onClick={() => { setVideoAudio(!videoAudio()); setGenerated(null) }}
                    style={{ height: 28, paddingLeft: 8, paddingRight: 8, borderRadius: 6, alignItems: "center", justifyContent: "center", cursor: "pointer", hover: { backgroundColor: C.secondaryHover } }}
                  >
                    <text style={{ color: C.mutedForeground, fontSize: 10, pointerEvents: "none" }}>{videoAudio() ? "Audio On" : "Audio Off"}</text>
                  </div>
                </Show>
              </>
            }
          >
            <PromptSettingButton testId="diffusion-prompt-model" label={currentImageModel().name} active={menu() === "model"} onClick={() => toggleMenu("model")} />
            <PromptSettingButton testId="diffusion-prompt-aspect" label={imageAspect()} active={menu() === "aspect"} onClick={() => toggleMenu("aspect")} />
            <PromptSettingButton testId="diffusion-prompt-variants" label={`${imageVariants()}×`} active={menu() === "variants"} onClick={() => toggleMenu("variants")} />
          </Show>
        </Show>
        <div style={{ flexGrow: 1 }} />
        <ToolbarButton testId="diffusion-prompt-submit" label="↑" active={prompt().trim().length > 0} onClick={submit} />

        <Show when={menu() === "mode"}>
          <PromptMenuSurface label="Generate">
            <PromptMenuRow testId="diffusion-prompt-mode-image" label="Image" selected={mode() === "IMAGE"} onClick={() => changeMode("IMAGE")} />
            <PromptMenuRow testId="diffusion-prompt-mode-video" label="Video" selected={mode() === "VIDEO"} onClick={() => changeMode("VIDEO")} />
          </PromptMenuSurface>
        </Show>

        <Show when={menu() === "model" && mode() === "IMAGE"}>
          <PromptMenuSurface label="Image model">
            <For each={IMAGE_MODELS}>{(option) => <PromptMenuRow testId={`diffusion-prompt-model-${option.id}`} label={option.name} description={option.description} selected={imageModel() === option.id} onClick={() => { setImageModel(option.id); setMenu(null); setGenerated(null) }} />}</For>
          </PromptMenuSurface>
        </Show>
        <Show when={menu() === "model" && mode() === "VIDEO"}>
          <PromptMenuSurface label="Video model">
            <For each={VIDEO_MODELS}>{(option) => <PromptMenuRow testId={`diffusion-prompt-model-${option.id}`} label={option.name} description={option.description} selected={videoModel() === option.id} onClick={() => changeVideoModel(option.id)} />}</For>
          </PromptMenuSurface>
        </Show>

        <Show when={menu() === "aspect" && mode() === "IMAGE"}>
          <PromptMenuSurface label="Aspect ratio">
            <For each={IMAGE_ASPECTS}>{(aspect) => <PromptMenuRow testId={`diffusion-prompt-aspect-${aspect.replace(":", "-")}`} label={aspect} selected={imageAspect() === aspect} onClick={() => { setImageAspect(aspect); setMenu(null); setGenerated(null) }} />}</For>
          </PromptMenuSurface>
        </Show>
        <Show when={menu() === "aspect" && mode() === "VIDEO"}>
          <PromptMenuSurface label="Aspect ratio">
            <For each={currentVideoModel().aspectRatios}>{(aspect) => <PromptMenuRow testId={`diffusion-prompt-aspect-${aspect.replace(":", "-")}`} label={aspect} selected={videoAspect() === aspect} onClick={() => { setVideoAspect(aspect); setMenu(null); setGenerated(null) }} />}</For>
          </PromptMenuSurface>
        </Show>

        <Show when={menu() === "variants" && mode() === "IMAGE"}>
          <PromptMenuSurface label="Amount of variants">
            <For each={IMAGE_VARIANTS}>{(count) => <PromptMenuRow testId={`diffusion-prompt-variants-${count}`} label={String(count)} selected={imageVariants() === count} onClick={() => { setImageVariants(count); setMenu(null); setGenerated(null) }} />}</For>
          </PromptMenuSurface>
        </Show>

        <Show when={menu() === "duration" && mode() === "VIDEO"}>
          <PromptMenuSurface label="Duration">
            <For each={currentVideoModel().durations}>{(duration) => <PromptMenuRow testId={`diffusion-prompt-duration-${duration}`} label={`${duration}s`} selected={videoDuration() === duration} onClick={() => { setVideoDuration(duration); setMenu(null); setGenerated(null) }} />}</For>
          </PromptMenuSurface>
        </Show>
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
  const [selectionMenuOpen, setSelectionMenuOpen] = createSignal(false)
  const selectionTool = () => props.state.selectedTool() === "hand" ? "hand" : "move"

  const chooseSelectionTool = (tool: "move" | "hand") => {
    props.state.setSelectedTool(tool)
    setSelectionMenuOpen(false)
  }

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
      <ToolbarButton testId="diffusion-tool-select-menu" label="⌄" width={22} active={selectionMenuOpen()} onClick={() => setSelectionMenuOpen(!selectionMenuOpen())} />
      <Show when={selectionMenuOpen()}>
        <div testId="diffusion-tool-selection-menu" style={{ position: "absolute", left: 6, bottom: 48, width: 130, padding: 6, gap: 2, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 8, backgroundColor: C.background }}>
          <PromptMenuRow testId="diffusion-tool-option-move" label="Move" selected={props.state.selectedTool() === "move"} onClick={() => chooseSelectionTool("move")} />
          <PromptMenuRow testId="diffusion-tool-option-hand" label="Hand" selected={props.state.selectedTool() === "hand"} onClick={() => chooseSelectionTool("hand")} />
        </div>
      </Show>
      <Separator />
      <ToolButton state={props.state} tool="frame" label="□" testId="diffusion-tool-frame" />
      <ToolButton state={props.state} tool="rect" label="▭" testId="diffusion-tool-rect" />
      <ToolButton state={props.state} tool="text" label="T" testId="diffusion-tool-text" />
      <Separator />
      <ToolbarButton testId="diffusion-ai-generate" label="✦" active={props.promptOpen} onClick={props.onPromptToggle} />
    </div>
  )
}

export function Canvas(props: {
  state: DiffusionEditorState
  promptOpen: () => boolean
  setPromptOpen: (value: boolean) => void
}): SolidElement {
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
      <Show when={props.promptOpen()}>
        <PromptInput />
      </Show>
      <Toolbar state={props.state} promptOpen={props.promptOpen()} onPromptToggle={() => props.setPromptOpen(!props.promptOpen())} />
    </div>
  )
}
