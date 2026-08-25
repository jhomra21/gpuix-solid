import { existsSync, statSync } from "node:fs"
import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"

const UPSTREAM_DRAG_ISSUE = "https://github.com/remorses/gpuix/issues/20"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  }
}

if (!hasNativeTestRenderer) {
  console.log("solid1 DAW source-structured port: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  app.render(() => <DawSolid1Showcase />)

  requireText(app.renderer.textContent("transport-state"), "2.75s", "initial playhead")
  requireCondition(app.renderer.hasTestId("browser-sidebar"), "browser sidebar should start open")
  requireCondition(app.renderer.hasTestId("track-sidebar"), "source TrackSidebar should be mounted")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects panel should start open")

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
  requireCondition(browserBounds.width >= 275, `browser should preserve ~280px upstream width, got ${browserBounds.width}`)
  const timelineBounds = app.renderer.boundsTestId("timeline-surface")
  const sidebarBounds = app.renderer.boundsTestId("track-sidebar")
  requireCondition(sidebarBounds.width >= 330, `track sidebar should preserve ~336px upstream width, got ${sidebarBounds.width}`)
  requireCondition(browserBounds.x < timelineBounds.x, "TimelineLeftBrowser must be left of the arrangement")
  requireCondition(sidebarBounds.x > timelineBounds.x, "TrackSidebar must be right of the arrangement like upstream TimelineWorkspace")
  const laneBounds = app.renderer.boundsTestId("lane-synth")
  requireCondition(laneBounds.height >= 92, `timeline lane should preserve ~96px upstream height, got ${laneBounds.height}`)
  const bottomBounds = app.renderer.boundsTestId("bottom-panel")
  requireCondition(bottomBounds.height >= 385, `bottom panel footprint should preserve 360px body + footer/padding, got ${bottomBounds.height}`)

  app.renderer.clickTestId("transport-play")
  requireText(app.renderer.textContent("transport-state"), "3.00s", "play advances playhead")

  app.renderer.clickTestId("grid-resolution")
  requireText(app.renderer.textContent("grid-resolution"), "1/32", "cycle grid resolution")

  app.renderer.clickTestId("browser-tab-effects")
  app.renderer.typeTestId("browser-search", "comp")
  requireCondition(app.renderer.hasTestId("browser-item-compressor"), "effects search should retain Compressor")
  requireCondition(!app.renderer.hasTestId("browser-item-eq-eight"), "effects search should filter EQ Eight")

  app.renderer.clickTestId("compressor-threshold-plus")
  requireText(app.renderer.textContent("compressor-threshold-value"), "-17.0 dB", "compressor threshold")

  app.renderer.clickTestId("eq-high-plus")
  requireText(app.renderer.textContent("eq-high-value"), "+1.0 dB", "EQ high gain")

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
  requireText(app.renderer.textContent("transport-state"), "0.00s", "stop resets playhead")

  const screenshotPath = "/tmp/gpuix-solid1-daw-source-structured.png"
  app.renderer.captureScreenshot(screenshotPath)
  requireCondition(existsSync(screenshotPath), "DAW port screenshot should exist")
  requireCondition(statSync(screenshotPath).size > 0, "DAW port screenshot should not be empty")

  const beforeDrag = app.renderer.boundsTestId("clip-vocals-b")
  app.renderer.dragTestId("clip-vocals-b", 96, 0)
  const afterHorizontalDrag = app.renderer.boundsTestId("clip-vocals-b")
  const dragContinued = afterHorizontalDrag.x > beforeDrag.x + 75

  if (!dragContinued) {
    requireCondition(
      app.renderer.hasTestId("timeline-drag-layer"),
      "native mouse-down should enter source-style DAW drag state before the upstream continuation gap",
    )
    console.log(`solid1 DAW native drag continuation: blocked by ${UPSTREAM_DRAG_ISSUE}`)
  } else {
    app.renderer.dragTestId("clip-vocals-b", 0, -192)
    const afterCrossTrackDrag = app.renderer.boundsTestId("clip-vocals-b")
    requireCondition(
      afterCrossTrackDrag.y < afterHorizontalDrag.y - 140,
      `audio clip should move to a compatible audio lane, before ${afterHorizontalDrag.y}, after ${afterCrossTrackDrag.y}`,
    )

    const midiBefore = app.renderer.boundsTestId("clip-synth-a")
    app.renderer.dragTestId("clip-synth-a", 0, 96)
    const midiAfter = app.renderer.boundsTestId("clip-synth-a")
    requireCondition(Math.abs(midiAfter.y - midiBefore.y) < 4, "MIDI clip should reject an incompatible audio-track drop")
  }

  app.unmount()
  console.log("solid1 DAW source-structured port: passed")
}
