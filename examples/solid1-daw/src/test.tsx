import { existsSync, statSync } from "node:fs"
import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  resolveNativeClassStyle,
  resolveNativeDescendantClassStyle,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"
import { UpstreamUiProbe } from "./upstream-ui-probe"

const UPSTREAM_DRAG_ISSUE = "https://github.com/remorses/gpuix/issues/20"

configureNativeStyleManifest(nativeTailwindManifest)
setNativeStyleColorMode("dark")

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function requireText(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)} in ${JSON.stringify(actual)}`)
  }
}

const transportFrameStyle = resolveNativeClassStyle("grid grid-cols-[1fr_auto_1fr]", undefined)
requireCondition(
  transportFrameStyle?.display === "flex" && transportFrameStyle.flexDirection === "row",
  `upstream 1fr/auto/1fr transport grid should translate to a native flex row, got ${JSON.stringify(transportFrameStyle)}`,
)
const transportLeftStyle = resolveNativeClassStyle("justify-self-start flex", undefined)
requireCondition(
  transportLeftStyle?.flexGrow === 1 && transportLeftStyle.flexBasis === 0 && transportLeftStyle.justifyContent === "flex-start",
  `transport left zone should preserve one flexible side track, got ${JSON.stringify(transportLeftStyle)}`,
)
const transportCenterStyle = resolveNativeClassStyle("justify-self-center flex", undefined)
requireCondition(
  transportCenterStyle?.flexGrow === 0 && transportCenterStyle.flexShrink === 0,
  `transport center zone should stay intrinsic, got ${JSON.stringify(transportCenterStyle)}`,
)
const transportRightStyle = resolveNativeClassStyle("justify-self-end flex", undefined)
requireCondition(
  transportRightStyle?.flexGrow === 1 && transportRightStyle.flexBasis === 0 && transportRightStyle.justifyContent === "flex-end",
  `transport right zone should preserve one flexible side track, got ${JSON.stringify(transportRightStyle)}`,
)

if (!hasNativeTestRenderer) {
  console.log("solid1 DAW source-structured port: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  app.render(() => (
    <div testId="daw-test-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))

  requireText(app.renderer.textContent("daw-showcase"), "2.75s", "initial playhead")
  requireCondition(app.renderer.hasTestId("browser-sidebar"), "browser sidebar should start open")
  requireCondition(app.renderer.hasTestId("track-sidebar"), "source TrackSidebar should be mounted")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects panel should start open")

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
  requireCondition(browserBounds.width >= 275, `browser should preserve ~280px upstream width, got ${browserBounds.width}`)
  const browserTabBounds = app.renderer.boundsTextWithinTestId("browser-sidebar", "Assets")
  requireCondition(Math.abs(browserTabBounds.height - 24) <= 1, `browser tabs should preserve upstream 24px rows, got ${browserTabBounds.height}`)
  const timelineBounds = app.renderer.boundsTestId("timeline-surface")
  const sidebarBounds = app.renderer.boundsTestId("track-sidebar")
  requireCondition(sidebarBounds.width >= 330, `track sidebar should preserve ~336px upstream width, got ${sidebarBounds.width}`)
  requireCondition(browserBounds.x < timelineBounds.x, "TimelineLeftBrowser must be left of the arrangement")
  requireCondition(sidebarBounds.x > timelineBounds.x, "TrackSidebar must be right of the arrangement like upstream TimelineWorkspace")
  const laneBounds = app.renderer.boundsTestId("lane-synth")
  requireCondition(laneBounds.height >= 92, `timeline lane should preserve ~96px upstream height, got ${laneBounds.height}`)
  const bottomBounds = app.renderer.boundsTestId("bottom-panel")
  requireCondition(bottomBounds.height >= 385, `bottom panel footprint should preserve 360px body + footer/padding, got ${bottomBounds.height}`)
  const compressorBounds = app.renderer.boundsTestId("compressor-device")
  requireCondition(Math.abs(compressorBounds.width - 560) <= 1, `compressor should preserve upstream 560px shell, got ${compressorBounds.width}`)
  const eqBounds = app.renderer.boundsTestId("eq-device")
  requireCondition(Math.abs(eqBounds.width - 704) <= 1, `EQ should preserve upstream 704px shell, got ${eqBounds.width}`)

  requireCondition(app.renderer.hasTestId("Hide browser sidebar"), "source browser toggle aria label should reach the native host")
  requireCondition(app.renderer.hasTestId("Start recording"), "source record button aria label should reach the native host")
  requireCondition(app.renderer.hasTestId("Play"), "source play button aria label should reach the native host")
  requireCondition(app.renderer.hasTestId("Stop"), "source stop button aria label should reach the native host")
  requireCondition(app.renderer.hasTestId("Toggle metronome"), "source metronome aria label should reach the native host")
  requireCondition(app.renderer.hasTestId("Toggle loop region"), "source loop aria label should reach the native host")
  requireCondition(app.renderer.hasTestId("Toggle snap to grid"), "source grid aria label should reach the native host")
  requireText(app.renderer.textContent("daw-showcase"), "1/16", "upstream grid resolution")
  requireCondition(!app.renderer.textContent("daw-showcase").includes("1/32"), "native fixture must not invent a 1/32 grid option absent upstream")

  app.renderer.clickTestId("Play")
  requireText(app.renderer.textContent("daw-showcase"), "3.00s", "play advances playhead")
  requireCondition(app.renderer.hasTestId("Pause"), "source play control should expose Pause while playing")

  app.renderer.clickTextWithinTestId("browser-sidebar", "Effects")
  app.renderer.typeFirstInputWithinTestId("browser-sidebar", "comp")
  const browserSearchText = app.renderer.textContent("browser-sidebar")
  requireText(browserSearchText, "Compressor", "effects search should retain Compressor")
  requireCondition(!browserSearchText.includes("EQ Eight"), "effects search should filter EQ Eight")

  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
  const lowerViewportOffset = app.renderer.scrollOffsetTestId("daw-test-viewport")
  requireCondition(lowerViewportOffset !== null && lowerViewportOffset[1] < 0, "DAW test viewport should scroll to reveal lower controls")

  app.renderer.clickTestId("compressor-threshold-plus")
  requireText(app.renderer.textContent("compressor-threshold-value"), "-17.0 dB", "compressor threshold")

  app.renderer.scrollTestId("effects-panel", -540, 0)
  const effectsOffset = app.renderer.scrollOffsetTestId("effects-panel")
  requireCondition(effectsOffset !== null && effectsOffset[0] < 0, "effects chain should scroll horizontally to the EQ device")
  app.renderer.clickTestId("eq-band-7")
  app.renderer.clickTestId("eq-selected-gain-plus")
  requireText(app.renderer.textContent("eq-selected-gain-value"), "+1.0 dB", "EQ high gain")

  app.renderer.clickTextWithinTestId("bottom-panel", "CLIP")
  requireCondition(app.renderer.hasTestId("clip-panel"), "clip tab should mount clip panel")
  requireCondition(!app.renderer.hasTestId("effects-panel"), "clip tab should unmount effects panel")
  const clipPanelText = app.renderer.textContent("clip-panel")
  requireText(clipPanelText, "SAMPLE DETAIL", "source-shaped sample detail rail")
  requireText(clipPanelText, "Source BPM", "source-shaped sample controls")
  requireText(clipPanelText, "BEAT GRID", "source-shaped sample waveform header")

  app.renderer.clickTextWithinTestId("bottom-panel", "EFFECTS")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects tab should restore devices")

  app.renderer.clickTextWithinTestId("bottom-panel", "HIDE")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed"), "hide should collapse bottom panel")
  requireCondition(!app.renderer.hasTestId("bottom-panel"), "collapsed panel should unmount expanded shell")

  app.renderer.clickTextWithinTestId("bottom-panel-closed", "SHOW")
  requireCondition(app.renderer.hasTestId("bottom-panel"), "show should restore bottom panel")

  app.renderer.scrollTestId("daw-test-viewport", 0, 0)
  app.renderer.clickTestId("Stop")
  requireText(app.renderer.textContent("daw-showcase"), "0.00s", "stop resets playhead")

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

  const sourceUi = createTestRoot()
  sourceUi.render(() => <UpstreamUiProbe />)

  const sourceButtonBounds = sourceUi.renderer.boundsTestId("upstream-button")
  requireCondition(
    Math.abs(sourceButtonBounds.width - 40) <= 1 && Math.abs(sourceButtonBounds.height - 40) <= 1,
    `copied DAW icon button should resolve size-10 to 40x40, got ${sourceButtonBounds.width}x${sourceButtonBounds.height}`,
  )
  const sourceIconStyle = resolveNativeDescendantClassStyle(
    "[&_svg]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    undefined,
    "svg",
    false,
  )
  requireCondition(
    sourceIconStyle?.width === 16 && sourceIconStyle.height === 16,
    `copied DAW button descendant SVG utility should resolve to 16x16, got ${JSON.stringify(sourceIconStyle)}`,
  )
  sourceUi.renderer.clickTestId("upstream-button")
  requireText(sourceUi.renderer.textContent("upstream-button-count"), "Copied Button presses: 1", "copied DAW button")

  const avatarBounds = sourceUi.renderer.boundsTestId("upstream-avatar")
  requireCondition(
    Math.abs(avatarBounds.width - 40) <= 1 && Math.abs(avatarBounds.height - 40) <= 1,
    `copied DAW avatar size-10 should resolve to 40x40, got ${avatarBounds.width}x${avatarBounds.height}`,
  )

  sourceUi.renderer.typeTestId("upstream-text-input", "Bass")
  requireText(sourceUi.renderer.textContent("upstream-text-error"), "Invalid route", "copied DAW TextField invalid state")

  requireCondition(!sourceUi.renderer.hasTestId("upstream-tooltip-content"), "copied DAW tooltip should start closed")
  sourceUi.renderer.hoverTestId("upstream-tooltip-trigger")
  requireCondition(app.renderer.hasTestId("upstream-tooltip-content") === false, "DAW root must not receive source probe popups")
  requireCondition(sourceUi.renderer.hasTestId("upstream-tooltip-content"), "copied DAW tooltip should open through native hover")

  sourceUi.unmount()

  console.log("solid1 DAW source-structured port: passed")
}
