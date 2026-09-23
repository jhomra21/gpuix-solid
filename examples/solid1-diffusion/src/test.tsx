import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { existsSync, statSync, unlinkSync } from "node:fs"
import { DiffusionSourceEngine, readDiffusionSourceState } from "./app"

const screenshotPath = "/tmp/gpuix-solid1-diffusion-source.png"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Diffusion source engine: native TestGpuixRenderer unavailable; skipped")
} else {
  if (existsSync(screenshotPath)) unlinkSync(screenshotPath)

  const app = createTestRoot(1280, 800)
  app.render(() => <DiffusionSourceEngine />)

  try {
    for (let frame = 0; frame < 3; frame++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    await Promise.resolve()
    app.root.flush()
    app.renderer.flush()

    const state = readDiffusionSourceState()
    requireCondition(state.sceneName === "GPUix Diffusion source", "Diffusion source project should mount an active scene")
    requireCondition(state.canvas !== null, "Diffusion EngineCanvas should mount a canvas")
    requireCondition(state.context !== null, "Diffusion EngineCanvas should acquire a 2D context")
    requireCondition(
      state.canvas instanceof HTMLCanvasElement,
      "Diffusion EngineCanvas should retain HTMLCanvasElement identity on GPUIX",
    )

    app.renderer.captureScreenshot(screenshotPath)
    requireCondition(existsSync(screenshotPath), "Diffusion source screenshot should be written")
    requireCondition(statSync(screenshotPath).size > 0, "Diffusion source screenshot should not be empty")

    app.renderer.customPropJsonContainingAll("drawList", [
      "\"version\":3",
      "\"color\":\"#22C55E\"",
    ])

    console.log("solid1 Diffusion source EngineProvider + EngineCanvas: passed")
  } finally {
    app.unmount()
  }
}
