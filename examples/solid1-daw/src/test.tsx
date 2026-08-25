import { existsSync, statSync } from "node:fs"
import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  }
}

if (!hasNativeTestRenderer) {
  console.log("solid1 DAW showcase: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  app.render(() => <DawSolid1Showcase />)

  requireText(app.renderer.textContent("transport-state"), "Stopped", "initial transport")
  requireCondition(app.renderer.hasTestId("browser-sidebar"), "browser sidebar should start open")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects panel should start open")

  app.renderer.clickTestId("transport-play")
  requireText(app.renderer.textContent("transport-state"), "Playing", "play transport")

  app.renderer.clickTestId("grid-resolution")
  requireText(app.renderer.textContent("grid-resolution"), "1/32", "cycle grid resolution")

  app.renderer.typeTestId("browser-search", "comp")
  requireCondition(app.renderer.hasTestId("browser-result-compressor"), "browser search should retain Compressor")
  requireCondition(!app.renderer.hasTestId("browser-result-eq"), "browser search should filter EQ")

  app.renderer.clickTestId("clip-vocals-b")
  requireText(app.renderer.textContent("inspector-title"), "Vocals", "clip selects track")
  requireText(app.renderer.textContent("selected-clip-label"), "Hook Comp", "clip selection")

  app.renderer.clickTestId("inspector-mute")
  requireText(app.renderer.textContent("inspector-status"), "Muted", "inspector mute")

  app.renderer.clickTestId("compressor-threshold-plus")
  requireText(app.renderer.textContent("compressor-threshold-value"), "-17 dB", "compressor threshold")

  app.renderer.clickTestId("eq-high-plus")
  requireText(app.renderer.textContent("eq-high-value"), "+1 dB", "EQ high gain")

  app.renderer.clickTestId("bottom-tab-clip")
  requireCondition(app.renderer.hasTestId("clip-panel"), "clip tab should mount clip panel")
  requireCondition(!app.renderer.hasTestId("effects-panel"), "clip tab should unmount effects panel")

  app.renderer.clickTestId("bottom-tab-effects")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects tab should restore devices")

  app.renderer.clickTestId("bottom-panel-close")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed"), "hide should collapse bottom panel")
  requireCondition(!app.renderer.hasTestId("bottom-panel"), "collapsed panel should unmount expanded shell")

  app.renderer.clickTestId("bottom-panel-open")
  requireCondition(app.renderer.hasTestId("bottom-panel"), "show should restore bottom panel")

  app.renderer.clickTestId("transport-stop")
  requireText(app.renderer.textContent("transport-state"), "Stopped", "stop transport")

  const screenshotPath = "/tmp/gpuix-solid1-daw-showcase.png"
  app.renderer.captureScreenshot(screenshotPath)
  requireCondition(existsSync(screenshotPath), "DAW showcase screenshot should exist")
  requireCondition(statSync(screenshotPath).size > 0, "DAW showcase screenshot should not be empty")

  app.unmount()
  console.log("solid1 DAW showcase: passed")
}
