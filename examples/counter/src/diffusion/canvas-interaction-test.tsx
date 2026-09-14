import assert from "node:assert/strict"
import { createSignal } from "solid-js"
import { createTestApp, createTestRoot, hasNativeTestRenderer, type ElementBounds } from "gpuix-solid"
import { type DiffusionEditorState, type DiffusionTool } from "./compat"
import { InteractiveCanvas } from "./interactive-canvas"

function createTestEditorState(): DiffusionEditorState {
  const [projectName, setProjectName] = createSignal("Diffusion Studio")
  const [uiVisible, setUiVisible] = createSignal(true)
  const [timelineMinimized, setTimelineMinimized] = createSignal(false)
  const [selectedTool, setSelectedTool] = createSignal<DiffusionTool>("move")
  const [selectedAsset, setSelectedAsset] = createSignal<string | null>(null)
  const [zoom, setZoom] = createSignal(1)
  const [playing, setPlaying] = createSignal(false)
  const [looping, setLooping] = createSignal(false)
  return {
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
}

async function main(): Promise<void> {
  if (!hasNativeTestRenderer) {
    console.log("diffusion canvas interaction: native TestGpuixRenderer unavailable; skipped")
    return
  }

  const state = createTestEditorState()
  const [promptOpen, setPromptOpen] = createSignal(false)
  const root = createTestRoot(1280, 800)
  root.render(() => (
    <div style={{ width: "100%", height: "100%" }}>
      <InteractiveCanvas state={state} promptOpen={promptOpen} setPromptOpen={setPromptOpen} />
    </div>
  ))
  const app = createTestApp(root.renderer)
  const boundsWhenPainted = async (testId: string): Promise<ElementBounds> => {
    const locator = app.getByTestId(testId)
    const started = Date.now()
    for (;;) {
      try {
        return await locator.bounds()
      } catch (error) {
        if (Date.now() - started >= 5000) {
          throw new Error(`${testId} never exposed painted bounds after 5s`, { cause: error })
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 16))
      }
    }
  }
  const chooseTool = async (testId: string, tool: DiffusionTool): Promise<void> => {
    await app.getByTestId(testId).click()
    assert.equal(state.selectedTool(), tool, `${testId} should select ${tool}`)
  }

  try {
    const surface = await app.getByTestId("diffusion-canvas-interaction-surface").bounds()
    const start = { x: surface.x + 180, y: surface.y + 120 }
    const end = { x: start.x + 150, y: start.y + 90 }

    await chooseTool("diffusion-tool-rect", "rect")
    await app.mouse.drag(start, end, { steps: 4 })
    await app.getByTestId("diffusion-scene-rect-1").waitFor()
    const created = await boundsWhenPainted("diffusion-scene-rect-1")
    assert.ok(created.width >= 145, `rectangle width should follow pointer drag, got ${created.width}`)
    assert.ok(created.height >= 85, `rectangle height should follow pointer drag, got ${created.height}`)

    await app.getByTestId("diffusion-tool-select-menu").click()
    await chooseTool("diffusion-tool-option-move", "move")
    await app.getByTestId("diffusion-scene-rect-1").dragBy(70, 35, { steps: 4 })
    const moved = await boundsWhenPainted("diffusion-scene-rect-1")
    assert.ok(moved.x >= created.x + 65, `Move tool should translate rectangle horizontally: ${created.x} -> ${moved.x}`)
    assert.ok(moved.y >= created.y + 30, `Move tool should translate rectangle vertically: ${created.y} -> ${moved.y}`)

    await app.getByTestId("diffusion-tool-select-menu").click()
    await chooseTool("diffusion-tool-option-hand", "hand")
    const panStart = { x: surface.x + 440, y: surface.y + 180 }
    await app.mouse.drag(panStart, { x: panStart.x + 55, y: panStart.y + 25 }, { steps: 4 })
    const panned = await boundsWhenPainted("diffusion-scene-rect-1")
    assert.ok(panned.x >= moved.x + 50, `Hand tool should pan scene horizontally: ${moved.x} -> ${panned.x}`)
    assert.ok(panned.y >= moved.y + 20, `Hand tool should pan scene vertically: ${moved.y} -> ${panned.y}`)

    await chooseTool("diffusion-tool-text", "text")
    await app.mouse.click({ x: surface.x + 360, y: surface.y + 330 })
    await app.getByTestId("diffusion-scene-text-2").waitFor()

    await chooseTool("diffusion-tool-frame", "frame")
    const frameStart = { x: surface.x + 520, y: surface.y + 100 }
    await app.mouse.drag(frameStart, { x: frameStart.x + 120, y: frameStart.y + 160 }, { steps: 4 })
    const frame = await boundsWhenPainted("diffusion-scene-frame-3")
    assert.ok(frame.width >= 115 && frame.height >= 155, `Frame tool should draw a real frame, got ${JSON.stringify(frame)}`)

    console.log("diffusion canvas interaction: Rectangle, Move, Hand, Text, and Frame gestures passed")
  } finally {
    root.unmount()
  }
}

await main()
