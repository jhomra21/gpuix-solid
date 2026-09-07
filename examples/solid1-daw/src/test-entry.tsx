import "./test"

import { createSignal } from "solid-js"
import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { mixerVolumeToSliderPosition } from "./compat/daw-browser-shared"
import { nativeTailwindManifest } from "./native-tailwind.generated"
import MixerVolumeSlider from "./upstream/components/timeline/MixerVolumeSlider"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function overlaps(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
): boolean {
  return first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
}

if (hasNativeTestRenderer) {
  configureNativeStyleManifest(nativeTailwindManifest)
  setNativeStyleColorMode("dark")

  const app = createTestRoot(1440, 900)
  app.render(() => (
    <div testId="daw-test-viewport" style={{ width: "100%", height: "100%", overflow: "scroll" }}>
      <DawSolid1Showcase />
    </div>
  ))

  // The compatibility surface intentionally batches the source Canvas2D draw
  // calls into one retained SVG update. Let Solid's initial effects and that
  // queued paint commit settle before judging or capturing visual parity.
  for (let turn = 0; turn < 3; turn++) await Promise.resolve()
  app.root.flush()
  app.renderer.flush()

  const waveformSource = app.renderer.customPropStringContainingAll("source", [
    'preserveAspectRatio="none"',
    'fill="#00a76c"',
    "<polygon",
  ])
  const waveformBars = waveformSource.match(/<polygon\b/g)?.length ?? 0
  requireCondition(
    waveformBars >= 24,
    `exact ClipComponent Canvas2D waveform must retain substantial source-generated peak bars, got ${waveformBars}`,
  )

  const surfaceBounds = app.renderer.boundsTestId("gpuix-canvas-2d-surface")
  const drumsLaneBounds = app.renderer.boundsTestId("lane-drums")
  requireCondition(
    surfaceBounds.width > 100 && surfaceBounds.height > 40,
    `Canvas2D compatibility surface must have painted clip-sized bounds, got ${JSON.stringify(surfaceBounds)}`,
  )
  requireCondition(
    overlaps(surfaceBounds, drumsLaneBounds),
    `Canvas2D compatibility surface must paint inside the Drums lane, got ${JSON.stringify({ surfaceBounds, drumsLaneBounds })}`,
  )

  const volumeControl = { "aria-label": "Track 1 volume" } as const
  const initialVolumeStyle = app.renderer.styleCustomProps(volumeControl)
  const initialFillStyle = app.renderer.styleTestId("gpuix-css-hard-split-fill")
  requireCondition(
    initialVolumeStyle.backgroundColor === "#9f9fa9" && initialVolumeStyle.background === undefined,
    `source mixer-volume-slider muted side must use native solid paint when GPUIX 0.7 cannot paint the retained gradient, got ${JSON.stringify(initialVolumeStyle)}`,
  )
  requireCondition(
    initialFillStyle.backgroundColor === "#fac547" && initialFillStyle.pointerEvents === "none",
    `source mixer-volume-slider warning side must use a pointer-inert native fill, got ${JSON.stringify(initialFillStyle)}`,
  )

  app.renderer.captureScreenshot("/tmp/gpuix-solid1-daw-source-structured.png")

  // The native screenshot surface is narrower than the fixture's intentional
  // 1180px minimum width. Reveal the source mixer columns explicitly so visual
  // review covers the controls that the interaction suite already exercises.
  app.renderer.scrollTestId("daw-test-viewport", -320, 0)
  const mixerControlBounds = app.renderer.boundsCustomProps({ "aria-label": "Deactivate track 1" })
  const soloBounds = app.renderer.boundsCustomProps({ "aria-label": "Solo track 1" })
  const armBounds = app.renderer.boundsCustomProps({ "aria-label": "Arm track 1 for recording" })
  const volumeBounds = app.renderer.boundsCustomProps(volumeControl)
  const initialFillBounds = app.renderer.boundsTestId("gpuix-css-hard-split-fill")
  const viewportWidth = app.renderer.boundsTestId("daw-test-viewport").width
  requireCondition(
    mixerControlBounds.x >= 0 && mixerControlBounds.x + mixerControlBounds.width <= viewportWidth,
    `mixer visual acceptance must expose the source track button, got ${JSON.stringify(mixerControlBounds)}`,
  )
  requireCondition(
    Math.abs(soloBounds.y - armBounds.y) <= 1 && Math.abs(soloBounds.height - armBounds.height) <= 1,
    `source Solo and Record controls must stay row-aligned before visual capture: ${JSON.stringify({ soloBounds, armBounds })}`,
  )
  requireCondition(
    mixerControlBounds.width >= soloBounds.width * 2.5 && mixerControlBounds.width <= soloBounds.width * 3.5,
    `source 3fr/1fr mixer proportions must survive native layout before visual capture: ${JSON.stringify({ mixerControlBounds, soloBounds })}`,
  )
  requireCondition(
    volumeBounds.width >= soloBounds.width * 2.5 && volumeBounds.width < 70,
    `source mixer volume must remain in its compact 3fr column before visual capture: ${JSON.stringify({ volumeBounds, soloBounds })}`,
  )
  requireCondition(
    Math.abs(initialFillBounds.x - volumeBounds.x) <= 1 &&
      Math.abs(initialFillBounds.y - volumeBounds.y) <= 1 &&
      Math.abs(initialFillBounds.height - volumeBounds.height) <= 1 &&
      initialFillBounds.width > 1 &&
      initialFillBounds.width < volumeBounds.width,
    `source hard-split fill must occupy the leading portion of Track 1 volume, got ${JSON.stringify({ fill: initialFillBounds, volume: volumeBounds })}`,
  )
  app.renderer.captureScreenshot("/tmp/gpuix-solid1-daw-mixer.png")

  const fillWidthBeforeDrag = initialFillBounds.width
  app.renderer.dragCustomProps(volumeControl, 20, 0)
  const draggedFillBounds = app.renderer.boundsTestId("gpuix-css-hard-split-fill")
  requireCondition(
    Math.abs(draggedFillBounds.width - fillWidthBeforeDrag) > 1,
    `source --mixer-volume-percent must update retained native fill geometry during volume drag: ${JSON.stringify({ before: initialFillBounds, after: draggedFillBounds })}`,
  )

  app.unmount()

  // Exercise the exact source automated state separately instead of changing
  // the showcase's deterministic fake project data merely to expose this CSS.
  const [automationRange, setAutomationRange] = createSignal({ min: 0.35, max: 1.3 })
  const automated = createTestRoot(320, 80)
  automated.render(() => (
    <div style={{ width: 280, height: 60, padding: 20, backgroundColor: "#111113" }}>
      <MixerVolumeSlider
        value={0.8}
        disabled={false}
        automated={true}
        automationRange={automationRange()}
        ariaLabel="Automated mixer volume"
        title="Automated mixer volume"
        onSelect={() => {}}
        onPreview={() => {}}
        onCommit={() => {}}
        onCancel={() => {}}
        onReset={() => {}}
      />
    </div>
  ))
  automated.root.flush()
  automated.renderer.flush()

  const automatedControl = { "aria-label": "Automated mixer volume" } as const
  const automatedBounds = automated.renderer.boundsCustomProps(automatedControl)
  const automatedOverlayBounds = automated.renderer.boundsTestId("gpuix-css-interval-overlay")
  const automatedOverlayStyle = automated.renderer.styleTestId("gpuix-css-interval-overlay")
  const firstRange = automationRange()
  const expectedStart = mixerVolumeToSliderPosition(firstRange.min)
  const expectedEnd = mixerVolumeToSliderPosition(firstRange.max)
  requireCondition(
    automatedOverlayStyle.backgroundColor === "#ff643d" && automatedOverlayStyle.pointerEvents === "none",
    `source automated mixer interval must use the exact dark automation paint and remain pointer-inert, got ${JSON.stringify(automatedOverlayStyle)}`,
  )
  requireCondition(
    Math.abs(automatedOverlayBounds.x - (automatedBounds.x + automatedBounds.width * expectedStart)) <= 1 &&
      Math.abs(automatedOverlayBounds.width - automatedBounds.width * (expectedEnd - expectedStart)) <= 1 &&
      Math.abs(automatedOverlayBounds.y - automatedBounds.y) <= 1 &&
      Math.abs(automatedOverlayBounds.height - 4) <= 1,
    `source mixer-volume-slider-automated 4px interval must match exact start/end geometry, got ${JSON.stringify({ overlay: automatedOverlayBounds, volume: automatedBounds, expectedStart, expectedEnd })}`,
  )
  automated.renderer.captureScreenshot("/tmp/gpuix-solid1-daw-mixer-automated.png")

  const firstOverlayBounds = automatedOverlayBounds
  setAutomationRange({ min: 0.6, max: 1.05 })
  automated.root.flush()
  automated.renderer.flush()
  const updatedOverlayBounds = automated.renderer.boundsTestId("gpuix-css-interval-overlay")
  requireCondition(
    Math.abs(updatedOverlayBounds.x - firstOverlayBounds.x) > 1 &&
      Math.abs(updatedOverlayBounds.width - firstOverlayBounds.width) > 1,
    `source automation start/end variables must reactively update retained interval geometry: ${JSON.stringify({ before: firstOverlayBounds, after: updatedOverlayBounds })}`,
  )

  automated.unmount()
  console.log(`solid1 DAW visual acceptance: exact Canvas2D waveform rendered ${waveformBars} retained peak bars; reactive mixer hard-split and automated interval paints passed`)
}
