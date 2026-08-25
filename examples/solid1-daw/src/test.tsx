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

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
  requireCondition(browserBounds.width >= 275, `browser should preserve ~280px upstream width, got ${browserBounds.width}`)
  const sidebarBounds = app.renderer.boundsTestId("track-sidebar-header")
  requireCondition(sidebarBounds.width >= 330, `track sidebar should preserve ~336px upstream width, got ${sidebarBounds.width}`)
  const laneBounds = app.renderer.boundsTestId("timeline-lane-synth")
  requireCondition(laneBounds.height >= 92, `timeline lane should preserve ~96px upstream height, got ${laneBounds.height}`)
  const bottomBounds = app.renderer.boundsTestId("bottom-panel")
  requireCondition(bottomBounds.height >= 350, `bottom panel should preserve ~360px upstream height, got ${bottomBounds.height}`)

  app.renderer.clickTestId("transport-play")
  requireText(app.renderer.textContent("transport-state"), "Playing", "play transport")

  app.renderer.clickTestId("grid-resolution")
  requireText(app.renderer.textContent("grid-resolution"), "1/32", "cycle grid resolution")

  app.renderer.clickTestId("browser-tab-effects")
  app.renderer.typeTestId("browser-search", "comp")
  requireCondition(app.renderer.hasTestId("browser-result-compressor"), "effects search should retain Compressor")
  requireCondition(!app.renderer.hasTestId("browser-result-eq"), "effects search should filter EQ")

  const beforeDrag = app.renderer.boundsTestId("clip-vocals-b")
  app.renderer.dragTestId("clip-vocals-b", 96, 0)
  const afterHorizontalDrag = app.renderer.boundsTestId("clip-vocals-b")
  requireCondition(afterHorizontalDrag.x > beforeDrag.x + 75, `clip should move horizontally through native drag, before ${beforeDrag.x}, after ${afterHorizontalDrag.x}`)
  requireText(app.renderer.textContent("clip-vocals-b-position"), "5.7s", "grid-snapped clip position")
  requireText(app.renderer.textContent("selected-track-name"), "Vocals", "drag keeps selected source track")

  app.renderer.dragTestId("clip-vocals-b", 0, -192)
  const afterCrossTrackDrag = app.renderer.boundsTestId("clip-vocals-b")
  requireCondition(afterCrossTrackDrag.y < afterHorizontalDrag.y - 140, `audio clip should move to compatible Bass lane, before ${afterHorizontalDrag.y}, after ${afterCrossTrackDrag.y}`)
  requireText(app.renderer.textContent("selected-track-name"), "Bass", "cross-track drag selects destination track")

  const midiBefore = app.renderer.boundsTestId("clip-synth-a")
  app.renderer.dragTestId("clip-synth-a", 0, 96)
  const midiAfter = app.renderer.boundsTestId("clip-synth-a")
  requireCondition(Math.abs(midiAfter.y - midiBefore.y) < 4, "MIDI clip should reject an incompatible audio-track drop")

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
