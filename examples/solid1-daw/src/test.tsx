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

function bottom(bounds: { y: number; height: number }): number {
  return bounds.y + bounds.height
}

const transportFrameStyle = resolveNativeClassStyle("grid grid-cols-[1fr_auto_1fr]", undefined)
requireCondition(
  transportFrameStyle?.display === "flex" && transportFrameStyle.flexDirection === "row",
  `upstream transport grid should translate to a native flex row, got ${JSON.stringify(transportFrameStyle)}`,
)
requireCondition(resolveNativeClassStyle("justify-self-start flex", undefined)?.flexGrow === 1, "transport left zone should preserve a flexible side track")
requireCondition(resolveNativeClassStyle("justify-self-center flex", undefined)?.flexShrink === 0, "transport center zone should remain intrinsic")
requireCondition(resolveNativeClassStyle("justify-self-end flex", undefined)?.justifyContent === "flex-end", "transport right zone should align to the end")

if (!hasNativeTestRenderer) {
  console.log("solid1 DAW source-structured port: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot()
  app.render(() => (
    <div testId="daw-test-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))

  const viewportWidth = app.renderer.boundsTestId("daw-test-viewport").width
  const rootText = () => app.renderer.textContent("daw-showcase")

  requireText(rootText(), "2.75s", "initial playhead")
  requireCondition(app.renderer.hasTestId("browser-sidebar"), "browser sidebar should start open")
  requireCondition(app.renderer.hasTestId("track-sidebar"), "track sidebar should be mounted")
  requireCondition(app.renderer.hasTestId("master-sidebar"), "Master sidebar row should be mounted")
  requireCondition(app.renderer.hasTestId("master-timeline"), "Master timeline row should be mounted")
  requireCondition(app.renderer.hasTestId("effects-panel"), "effects panel should start open")
  requireCondition(!rootText().includes("Drop files here to create a new track"), "fixture must not invent the new-track drop row")

  const browserBounds = app.renderer.boundsTestId("browser-sidebar")
  const timelineBounds = app.renderer.boundsTestId("timeline-surface")
  const sidebarBounds = app.renderer.boundsTestId("track-sidebar")
  requireCondition(browserBounds.width >= 275, `browser should preserve ~280px source width, got ${browserBounds.width}`)
  requireCondition(Math.abs(app.renderer.boundsTextWithinTestId("browser-sidebar", "Assets").height - 24) <= 1, "browser tabs should preserve 24px rows")
  requireCondition(sidebarBounds.width >= 330, `track sidebar should preserve ~336px source width, got ${sidebarBounds.width}`)
  requireCondition(browserBounds.x < timelineBounds.x && sidebarBounds.x > timelineBounds.x, "browser / timeline / mixer ordering should match source")
  requireCondition(app.renderer.boundsTestId("lane-synth").height >= 92, "normal timeline lanes should preserve ~96px source height")

  const timelineScrolling = app.renderer.boundsTestId("timeline-scrolling-tracks")
  const sidebarScrolling = app.renderer.boundsTestId("track-sidebar-scrolling")
  const timelineFooter = app.renderer.boundsTestId("timeline-sticky-footer")
  const sidebarFooter = app.renderer.boundsTestId("track-sidebar-sticky-footer")
  requireCondition(
    Math.abs(timelineFooter.y - sidebarFooter.y) <= 2 && Math.abs(timelineFooter.height - sidebarFooter.height) <= 2,
    `timeline/sidebar sticky footer shells should align, timeline ${JSON.stringify(timelineFooter)}, sidebar ${JSON.stringify(sidebarFooter)}`,
  )
  requireCondition(Math.abs(bottom(timelineScrolling) - timelineFooter.y) <= 2, "timeline scrolling viewport should end at the sticky Return/Master footer")
  requireCondition(Math.abs(bottom(sidebarScrolling) - sidebarFooter.y) <= 2, "sidebar scrolling viewport should end at the sticky Return/Master footer")

  const returnTimeline = app.renderer.boundsTestId("lane-return-a")
  const returnSidebar = app.renderer.boundsTestId("track-return-a")
  const masterTimeline = app.renderer.boundsTestId("master-timeline")
  const masterSidebar = app.renderer.boundsTestId("master-sidebar")
  requireCondition(returnTimeline.y >= timelineFooter.y, "Return timeline row should live inside the sticky footer")
  requireCondition(returnSidebar.y >= sidebarFooter.y, "Return sidebar row should live inside the sticky footer")
  requireCondition(masterTimeline.y > returnTimeline.y + 80, "Master timeline row should follow Return")
  requireCondition(masterSidebar.y > returnSidebar.y + 70, "Master sidebar row should follow Return")

  const overviewClipStyle = app.renderer.styleTestId("overview-clip-drums-a")
  requireCondition(
    overviewClipStyle.backgroundColor === "#00a76c",
    `arrangement overview should preserve source clip color, got ${JSON.stringify(overviewClipStyle.backgroundColor)}`,
  )
  requireCondition(app.renderer.boundsTestId("overview-clip-drums-a").width > 50, "30s source overview should retain a visible Drum Loop 01 block")

  const synthLaneHeight = app.renderer.boundsTestId("lane-synth").height
  const synthSidebarHeight = app.renderer.boundsTestId("track-synth").height
  requireCondition(Math.abs(synthLaneHeight - synthSidebarHeight) <= 1, "Synth timeline and mixer rows should start aligned")

  app.renderer.clickTestId("track-synth-send")
  requireText(app.renderer.textContent("track-synth-send"), "None", "send routing should cycle to None")
  app.renderer.clickTestId("track-synth-send")
  requireText(app.renderer.textContent("track-synth-send"), "A-Reverb", "send routing should cycle back to the real Return track")
  app.renderer.clickTestId("track-synth-output")
  requireText(app.renderer.textContent("track-synth-output"), "Master", "output routing must not invent a group target when no group exists")

  app.renderer.clickTestId("track-synth-collapse")
  const collapsedLaneHeight = app.renderer.boundsTestId("lane-synth").height
  const collapsedSidebarHeight = app.renderer.boundsTestId("track-synth").height
  requireCondition(Math.abs(collapsedLaneHeight - 32) <= 1, `collapsed timeline lane should preserve source 32px height, got ${collapsedLaneHeight}`)
  requireCondition(Math.abs(collapsedSidebarHeight - 32) <= 1, `collapsed mixer row should preserve source 32px height, got ${collapsedSidebarHeight}`)
  requireCondition(Math.abs(collapsedLaneHeight - collapsedSidebarHeight) <= 1, "collapsed timeline and mixer geometry should stay aligned")
  app.renderer.clickTestId("track-synth-collapse")
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-synth").height - synthLaneHeight) <= 1, "expanding should restore the original timeline lane height")
  requireCondition(Math.abs(app.renderer.boundsTestId("track-synth").height - synthSidebarHeight) <= 1, "expanding should restore the original mixer row height")

  app.renderer.clickTestId("track-synth-automation")
  requireCondition(app.renderer.hasTestId("lane-synth-automation"), "A should expose the timeline automation lane")
  requireCondition(app.renderer.hasTestId("track-synth-automation-lanes"), "A should expose the mixer automation lane")
  const oneAutomationLaneHeight = app.renderer.boundsTestId("lane-synth").height
  const oneAutomationSidebarHeight = app.renderer.boundsTestId("track-synth").height
  requireCondition(Math.abs(oneAutomationLaneHeight - synthLaneHeight - 48) <= 1, "one automation lane should add the source 48px lane height")
  requireCondition(Math.abs(oneAutomationLaneHeight - oneAutomationSidebarHeight) <= 1, "one automation lane should keep timeline and mixer geometry aligned")

  app.renderer.clickTestId("track-synth-automation-add")
  const twoAutomationLaneHeight = app.renderer.boundsTestId("lane-synth").height
  const twoAutomationSidebarHeight = app.renderer.boundsTestId("track-synth").height
  requireCondition(Math.abs(twoAutomationLaneHeight - oneAutomationLaneHeight - 48) <= 1, "adding automation should add exactly one 48px lane")
  requireCondition(Math.abs(twoAutomationLaneHeight - twoAutomationSidebarHeight) <= 1, "multiple automation lanes should keep timeline and mixer geometry aligned")

  app.renderer.clickTestId("track-synth-automation-hide")
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-synth").height - oneAutomationLaneHeight) <= 1, "hiding one automation lane should remove exactly 48px")
  app.renderer.clickTestId("track-synth-automation-hide")
  requireCondition(!app.renderer.hasTestId("lane-synth-automation"), "hiding the final automation lane should close timeline automation")
  requireCondition(!app.renderer.hasTestId("track-synth-automation-lanes"), "hiding the final automation lane should close mixer automation")
  requireCondition(Math.abs(app.renderer.boundsTestId("lane-synth").height - synthLaneHeight) <= 1, "closing automation should restore timeline geometry")
  requireCondition(Math.abs(app.renderer.boundsTestId("track-synth").height - synthSidebarHeight) <= 1, "closing automation should restore mixer geometry")

  const workspaceBefore = app.renderer.boundsTestId("timeline-workspace")
  const panelBounds = app.renderer.boundsTestId("bottom-panel")
  requireCondition(panelBounds.height >= 385, `bottom panel should preserve 360px body + footer/padding, got ${panelBounds.height}`)
  requireCondition(panelBounds.y < bottom(workspaceBefore), "bottom panel should overlay TimelineWorkspace like the fixed source panel")

  const compressorBounds = app.renderer.boundsTestId("compressor-device")
  const compressorStyle = app.renderer.styleTestId("compressor-device")
  const compressorShellWidth = compressorBounds.width
    + (compressorStyle.borderLeftWidth ?? compressorStyle.borderWidth ?? 0)
    + (compressorStyle.borderRightWidth ?? compressorStyle.borderWidth ?? 0)
  requireCondition(Math.abs(compressorShellWidth - 560) <= 1, `compressor should preserve 560px source shell, got ${compressorShellWidth}`)

  const eqBounds = app.renderer.boundsTestId("eq-device")
  const eqStyle = app.renderer.styleTestId("eq-device")
  const eqShellWidth = eqBounds.width
    + (eqStyle.borderLeftWidth ?? eqStyle.borderWidth ?? 0)
    + (eqStyle.borderRightWidth ?? eqStyle.borderWidth ?? 0)
  requireCondition(Math.abs(eqShellWidth - 704) <= 1, `EQ should preserve 704px source shell, got ${eqShellWidth}`)

  for (const testId of [
    "Hide browser sidebar",
    "Start recording",
    "Play",
    "Stop",
    "Toggle metronome",
    "Toggle loop region",
    "Toggle snap to grid",
  ]) {
    requireCondition(app.renderer.hasTestId(testId), `source aria label should reach the native host: ${testId}`)
  }
  requireText(rootText(), "1/4", "source default grid resolution")
  requireCondition(!rootText().includes("1/32"), "fixture must not invent a 1/32 grid option")

  const screenshotPath = "/tmp/gpuix-solid1-daw-source-structured.png"
  app.renderer.captureScreenshot(screenshotPath)
  requireCondition(existsSync(screenshotPath) && statSync(screenshotPath).size > 0, "DAW parity screenshot should exist and be non-empty")

  app.renderer.clickTestId("Play")
  requireText(rootText(), "3.00s", "play advances playhead")
  requireCondition(app.renderer.hasTestId("Pause"), "play control should expose Pause while playing")

  app.renderer.clickTextWithinTestId("browser-sidebar", "Effects")
  app.renderer.typeFirstInputWithinTestId("browser-sidebar", "comp")
  const browserSearchText = app.renderer.textContent("browser-sidebar")
  requireText(browserSearchText, "Compressor", "effects search")
  requireCondition(!browserSearchText.includes("EQ Eight"), "effects search should filter unrelated entries")

  app.renderer.scrollTestId("daw-test-viewport", 0, -260)
  requireCondition((app.renderer.scrollOffsetTestId("daw-test-viewport")?.[1] ?? 0) < 0, "test viewport should scroll to lower controls")
  app.renderer.clickTestId("compressor-threshold-plus")
  requireText(app.renderer.textContent("compressor-threshold-value"), "-17.0 dB", "compressor threshold")

  app.renderer.scrollTestId("effects-panel", -540, 0)
  requireCondition((app.renderer.scrollOffsetTestId("effects-panel")?.[0] ?? 0) < 0, "effects chain should scroll horizontally to EQ")
  app.renderer.clickTestId("eq-band-7")
  app.renderer.clickTestId("eq-selected-gain-plus")
  requireText(app.renderer.textContent("eq-selected-gain-value"), "+1.0 dB", "EQ high gain")

  app.renderer.clickTextWithinTestId("bottom-panel", "CLIP")
  requireCondition(app.renderer.hasTestId("clip-panel") && !app.renderer.hasTestId("effects-panel"), "Clip tab should replace Effects panel")
  const clipText = app.renderer.textContent("clip-panel")
  requireText(clipText, "SAMPLE DETAIL", "sample detail rail")
  requireText(clipText, "Source BPM", "sample controls")
  requireText(clipText, "BEAT GRID", "sample waveform header")
  app.renderer.clickTextWithinTestId("bottom-panel", "EFFECTS")
  requireCondition(app.renderer.hasTestId("effects-panel"), "Effects tab should restore devices")

  app.renderer.scrollTestId("daw-test-viewport", -320, -260)
  const hideBounds = app.renderer.boundsTextWithinTestId("bottom-panel", "HIDE")
  requireCondition(hideBounds.x >= 0 && hideBounds.x + hideBounds.width <= viewportWidth, "HIDE control should be visible after viewport scroll")

  const workspaceBeforeHide = app.renderer.boundsTestId("timeline-workspace")
  const footerBeforeHide = app.renderer.boundsTestId("timeline-sticky-footer")
  app.renderer.clickTextWithinTestId("bottom-panel", "HIDE")
  requireCondition(app.renderer.hasTestId("bottom-panel-closed") && !app.renderer.hasTestId("bottom-panel"), "Hide should collapse the fixed panel")
  const workspaceAfterHide = app.renderer.boundsTestId("timeline-workspace")
  const footerAfterHide = app.renderer.boundsTestId("timeline-sticky-footer")
  requireCondition(Math.abs(workspaceAfterHide.height - workspaceBeforeHide.height) <= 1, "fixed panel must not resize TimelineWorkspace")
  requireCondition(footerAfterHide.y > footerBeforeHide.y + 300, "sticky Return/Master footer should move down when the fixed panel collapses")

  app.renderer.clickTextWithinTestId("bottom-panel-closed", "SHOW")
  requireCondition(app.renderer.hasTestId("bottom-panel"), "Show should restore bottom panel")
  app.renderer.scrollTestId("daw-test-viewport", 0, 0)
  app.renderer.clickTestId("Stop")
  requireText(rootText(), "0.00s", "stop resets playhead")
  console.log("solid1 DAW drag validation: deferred to the gpuix-solid core GPUIX 0.5 pointer-capture migration")

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
  requireCondition(sourceIconStyle?.width === 16 && sourceIconStyle.height === 16, "copied DAW button descendant SVG utility should resolve to 16x16")
  sourceUi.renderer.clickTestId("upstream-button")
  requireText(sourceUi.renderer.textContent("upstream-button-count"), "Copied Button presses: 1", "copied DAW button")

  const avatarBounds = sourceUi.renderer.boundsTestId("upstream-avatar")
  requireCondition(Math.abs(avatarBounds.width - 40) <= 1 && Math.abs(avatarBounds.height - 40) <= 1, "copied DAW avatar should preserve size-10")
  sourceUi.renderer.typeTestId("upstream-text-input", "Bass")
  requireText(sourceUi.renderer.textContent("upstream-text-error"), "Invalid route", "copied DAW TextField invalid state")

  requireCondition(!sourceUi.renderer.hasTestId("upstream-tooltip-content"), "copied DAW tooltip should start closed")
  sourceUi.renderer.hoverTestId("upstream-tooltip-trigger")
  requireCondition(sourceUi.renderer.hasTestId("upstream-tooltip-content"), "copied DAW tooltip should open through native hover")

  sourceUi.unmount()
  console.log("solid1 DAW source-structured port: passed")
}
