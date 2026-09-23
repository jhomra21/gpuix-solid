import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { DiffusionSourceEngine, readDiffusionSourceState } from "./app"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

if (!hasNativeTestRenderer) {
  console.log("solid1 Diffusion source engine: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot(1280, 800)
  app.render(() => <DiffusionSourceEngine />)

  try {
    await new Promise((resolve) => setTimeout(resolve, 100))

    const state = readDiffusionSourceState()
    requireCondition(state.sceneName === "GPUix Diffusion source", "Diffusion source project should mount an active scene")
    requireCondition(state.canvas !== null, "Diffusion EngineCanvas should mount a canvas")
    requireCondition(state.context !== null, "Diffusion EngineCanvas should acquire a 2D context")
    requireCondition(
      state.canvas instanceof HTMLCanvasElement,
      "Diffusion EngineCanvas should retain HTMLCanvasElement identity on GPUIX",
    )

    console.log("solid1 Diffusion source EngineProvider + EngineCanvas: passed")
  } finally {
    app.unmount()
  }
}
