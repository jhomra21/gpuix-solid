import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import { createElement, setProp } from "../src/compat/gpuix-solid-canvas.ts"
import { drawWaveformPeaks } from "../src/upstream/packages/waveforms/render-waveform.ts"

type CompatCanvas = ReturnType<typeof createElement> & {
  width: number
  height: number
  getContext(contextId: "2d"): CanvasRenderingContext2D | null
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

if (!hasNativeTestRenderer) {
  console.log("DAW Canvas2D compatibility bridge: native TestGpuixRenderer unavailable; skipped")
} else {
  const app = createTestRoot(240, 100)
  app.render(() => {
    // SAFETY: the compatibility createElement facade returns a semantic canvas host instance for the literal "canvas" tag, and this detector immediately validates its Canvas2D contract before use.
    const canvas = createElement("canvas") as CompatCanvas
    setProp(canvas, "style", { width: 100, height: 40, position: "relative" })
    canvas.width = 100
    canvas.height = 40
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Semantic DAW canvas must expose the compatibility 2D context")
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, 100, 40)
    drawWaveformPeaks({
      ctx: context,
      peaks: new Uint8Array([64, 192, 48, 208, 80, 176, 32, 224]),
      drawCols: 4,
      padPx: 0,
      topY: 4,
      contentH: 32,
      cssW: 100,
      cssH: 40,
      fillStyle: "rgba(255,255,255,0.55)",
      boundaryStyle: "rgba(255,255,255,0.35)",
    })
    return canvas
  })

  await Promise.resolve()
  app.root.flush()
  app.renderer.flush()
  const source = app.renderer.customPropStringContainingAll("source", [
    'preserveAspectRatio="none"',
    "<polygon",
    "<polyline",
  ])
  requireCondition(source.includes('viewBox="0 0 100 40"'), `Canvas bridge must preserve backing dimensions, got ${source}`)
  requireCondition(!source.includes("data-native-waveform-placeholder"), "Canvas bridge must not use the old static waveform placeholder")
  app.unmount()
  console.log("DAW Canvas2D compatibility bridge: exact waveform renderer produced native SVG commands")
}
