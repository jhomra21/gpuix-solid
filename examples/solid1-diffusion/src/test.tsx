import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { existsSync, statSync, unlinkSync } from "node:fs"
import {
  armDiffusionSourceHandTool,
  DiffusionSourceEngine,
  readDiffusionSourceState,
} from "./app"

const screenshotPath = "/tmp/gpuix-solid1-diffusion-source.png"

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function closeTo(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) < 0.001
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
    requireCondition(state.camera !== null, "Diffusion source world should expose the stage camera")

    app.renderer.captureScreenshot(screenshotPath)
    requireCondition(existsSync(screenshotPath), "Diffusion source screenshot should be written")
    requireCondition(statSync(screenshotPath).size > 0, "Diffusion source screenshot should not be empty")

    const canvasBounds = app.renderer.boundsFirstTypeWithinTestId("diffusion-source-engine", "canvas")
    console.log("solid1 Diffusion source state:", JSON.stringify({
      frame: state.frame,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      resolution: state.resolution,
      canvasBounds,
    }))

    const drawList = app.renderer.customPropJsonContainingAll("drawList", ["\"version\":3"])
    console.log("solid1 Diffusion source drawList:", drawList)
    requireCondition(
      drawList.includes("\"color\":\"#22C55E\""),
      "Diffusion source draw list should contain the green project rectangle",
    )

    const beforeCamera = state.camera
    armDiffusionSourceHandTool()
    app.renderer.dragTestId("diffusion-source-engine", 60, 30)

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    app.root.flush()
    app.renderer.flush()

    const panned = readDiffusionSourceState()
    requireCondition(panned.camera !== null, "Diffusion source camera should remain available after a native drag")
    requireCondition(
      closeTo(panned.camera.e - beforeCamera.e, 60),
      `Diffusion CameraController should pan camera x by 60px, got ${panned.camera.e - beforeCamera.e}`,
    )
    requireCondition(
      closeTo(panned.camera.f - beforeCamera.f, 30),
      `Diffusion CameraController should pan camera y by 30px, got ${panned.camera.f - beforeCamera.f}`,
    )

    const pannedDrawList = app.renderer.customPropJsonContainingAll("drawList", ["\"version\":3"])
    requireCondition(
      pannedDrawList.includes("\"color\":\"#22C55E\""),
      "Diffusion project rectangle should still render after CameraController pan",
    )

    app.renderer.captureScreenshot(screenshotPath)
    requireCondition(statSync(screenshotPath).size > 0, "Panned Diffusion source screenshot should not be empty")
    console.log("solid1 Diffusion source camera pan:", JSON.stringify({
      before: beforeCamera,
      after: panned.camera,
      delta: {
        x: panned.camera.e - beforeCamera.e,
        y: panned.camera.f - beforeCamera.f,
      },
    }))

    console.log("solid1 Diffusion source EngineProvider + EngineCanvas + CameraController: passed")
  } finally {
    app.unmount()
  }
}
