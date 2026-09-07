import "./test"

import {
  configureNativeStyleManifest,
  createTestRoot,
  hasNativeTestRenderer,
  setNativeStyleColorMode,
} from "@jhomra21/gpuix-solid1"
import { DawSolid1Showcase } from "./app"
import { nativeTailwindManifest } from "./native-tailwind.generated"

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

function gradientDetails(background: unknown): {
  split: number
  from: string
  to: string
} | undefined {
  if (!background || typeof background !== "object") return undefined
  const candidate = background as {
    type?: unknown
    stops?: unknown
  }
  if (candidate.type !== "linear-gradient" || !Array.isArray(candidate.stops) || candidate.stops.length !== 2) {
    return undefined
  }
  const from = candidate.stops[0] as { color?: unknown; position?: unknown } | undefined
  const to = candidate.stops[1] as { color?: unknown; position?: unknown } | undefined
  const fromPosition = Number(from?.position)
  const toPosition = Number(to?.position)
  if (
    typeof from?.color !== "string" ||
    typeof to?.color !== "string" ||
    !Number.isFinite(fromPosition) ||
    !Number.isFinite(toPosition) ||
    Math.abs(fromPosition - toPosition) > 0.0001
  ) {
    return undefined
  }
  return {
    split: fromPosition,
    from: from.color,
    to: to.color,
  }
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
  const initialVolumeGradient = gradientDetails(app.renderer.styleCustomProps(volumeControl).background)
  requireCondition(
    initialVolumeGradient !== undefined &&
      initialVolumeGradient.split > 0 &&
      initialVolumeGradient.split < 1 &&
      initialVolumeGradient.from === "#fac547" &&
      initialVolumeGradient.to === "#9f9fa9",
    `source mixer-volume-slider must paint its dark warning/muted hard-split gradient natively, got ${JSON.stringify(initialVolumeGradient)}`,
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
  app.renderer.captureScreenshot("/tmp/gpuix-solid1-daw-mixer.png")

  const splitBeforeDrag = initialVolumeGradient?.split
  app.renderer.dragCustomProps(volumeControl, 20, 0)
  const draggedVolumeGradient = gradientDetails(app.renderer.styleCustomProps(volumeControl).background)
  requireCondition(
    splitBeforeDrag !== undefined &&
      draggedVolumeGradient !== undefined &&
      Math.abs(draggedVolumeGradient.split - splitBeforeDrag) > 0.001,
    `source --mixer-volume-percent must update the retained native gradient during volume drag: ${JSON.stringify({ before: initialVolumeGradient, after: draggedVolumeGradient })}`,
  )

  app.unmount()
  console.log(`solid1 DAW visual acceptance: exact Canvas2D waveform rendered ${waveformBars} retained peak bars; reactive mixer gradient and mixer visual passed`)
}
