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

  app.renderer.captureScreenshot("/tmp/gpuix-solid1-daw-source-structured.png")
  app.unmount()
  console.log(`solid1 DAW visual acceptance: exact Canvas2D waveform rendered ${waveformBars} retained peak bars`)
}
