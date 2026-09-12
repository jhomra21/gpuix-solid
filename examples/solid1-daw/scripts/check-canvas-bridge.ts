import { readFileSync } from "node:fs"
import { createTestRoot, hasNativeTestRenderer } from "@jhomra21/gpuix-solid1"
import {
  createElement,
  registerCssVariableIntervalOverlay,
  setProp,
} from "../src/compat/gpuix-solid-ui.ts"
import { drawWaveformPeaks } from "../src/upstream/packages/waveforms/render-waveform.ts"

type CompatCanvas = ReturnType<typeof createElement> & {
  width: number
  height: number
  getContext(contextId: "2d"): CanvasRenderingContext2D | null
}

type TestRoot = ReturnType<typeof createTestRoot>

const svgDataUrlPrefix = "data:image/svg+xml,"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function canvasSvg(root: TestRoot, requiredFragments: readonly string[]): string {
  const src = root.renderer.customPropStringContainingAll("src", [svgDataUrlPrefix, ...requiredFragments])
  requireCondition(src.startsWith(svgDataUrlPrefix), `Canvas bridge must paint one SVG image frame, got ${src}`)
  const source = src.slice(svgDataUrlPrefix.length)
  requireCondition(source.startsWith("<svg"), `Canvas image frame must contain raw SVG bytes, got ${source}`)
  return source
}

const canvasBridgeSource = readFileSync(new URL("../src/compat/layered-canvas.ts", import.meta.url), "utf8")
requireCondition(
  canvasBridgeSource.includes('base.createElement("img")'),
  "Canvas bridge must retain one native image surface across frames",
)
requireCondition(
  canvasBridgeSource.includes('base.setProp(surface, "src", `data:image/svg+xml,${source}`)'),
  "Canvas bridge must publish one raw SVG data URL mutation per changed frame",
)
requireCondition(
  !canvasBridgeSource.includes("encodeURIComponent"),
  "Canvas bridge must not percent-encode every SVG frame",
)
requireCondition(
  !canvasBridgeSource.includes('base.setProp(surface, "source"'),
  "Canvas bridge must not duplicate each frame into an unused source property",
)
requireCondition(
  !canvasBridgeSource.includes("driver.flush()"),
  "Canvas bridge must let MutationDriver batch/auto-flush instead of synchronously flushing each draw",
)

if (!hasNativeTestRenderer) {
  console.log("DAW Canvas2D compatibility bridge: native TestGpuixRenderer unavailable; skipped")
} else {
  registerCssVariableIntervalOverlay({
    startProperty: "--compat-isolation-start",
    endProperty: "--compat-isolation-end",
    height: 4,
    light: "#f0491c",
    dark: "#ff643d",
  })

  const isolation = createTestRoot(180, 60)
  isolation.render(() => {
    const plain = createElement("div")
    setProp(plain, "testId", "compat-unrelated-style")
    setProp(plain, "style", { width: 120, height: 20, backgroundColor: "#123456" })
    return plain
  })
  const plainStyle = isolation.renderer.styleTestId("compat-unrelated-style")
  requireCondition(
    plainStyle.width === 120 &&
      plainStyle.height === 20 &&
      plainStyle.backgroundColor === "#123456" &&
      plainStyle.position === undefined &&
      plainStyle.overflow === undefined,
    `registered CSS-variable paint compatibility must leave unrelated source styles unchanged, got ${JSON.stringify(plainStyle)}`,
  )
  isolation.unmount()

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
  const waveformSource = canvasSvg(app, [
    'viewBox="0 0 100 40"',
    'preserveAspectRatio="none"',
    "<path",
  ])
  requireCondition(!waveformSource.includes("data-native-waveform-placeholder"), "Canvas bridge must not use the old static waveform placeholder")
  requireCondition(
    waveformSource.includes('fill="rgba(255,255,255,0.55)"') &&
      waveformSource.includes('stroke="rgba(255,255,255,0.35)"'),
    `waveform Canvas SVG must retain both source paints, got ${waveformSource}`,
  )
  requireCondition(
    !waveformSource.includes("<polygon") && !waveformSource.includes("<polyline"),
    `waveform Canvas SVG should compact repeated bars/segments into shared paths, got ${waveformSource}`,
  )
  requireCondition(app.renderer.hasTestId("gpuix-canvas-2d-surface"), "waveform Canvas should retain one native image paint surface")
  requireCondition(!app.renderer.hasTestId("gpuix-canvas-2d-layer-1"), "waveform Canvas should not split multicolor paint across tint-only layers")
  app.unmount()

  const eqApp = createTestRoot(260, 140)
  let eqContext: CanvasRenderingContext2D | undefined
  eqApp.render(() => {
    // SAFETY: this uses the same literal semantic-canvas creation path validated above; the detector immediately requires a non-null 2D context before issuing EQ drawing commands.
    const canvas = createElement("canvas") as CompatCanvas
    setProp(canvas, "style", { width: 160, height: 80, position: "relative" })
    canvas.width = 160
    canvas.height = 80
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Semantic DAW canvas must expose the compatibility 2D context")
    eqContext = context

    context.fillStyle = "#09090b"
    context.fillRect(0, 0, 160, 80)
    context.strokeStyle = "#ffffff29"
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(8, 30)
    context.lineTo(152, 30)
    context.stroke()
    context.fillStyle = "#a1a1aa"
    context.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
    context.textAlign = "left"
    context.fillText("+12 dB", 12, 18)

    let partialArcRejected = false
    try {
      context.beginPath()
      context.arc(80, 40, 8, 0, Math.PI)
    } catch {
      partialArcRejected = true
    }
    requireCondition(partialArcRejected, "Canvas bridge must fail closed for partial arc paths it does not implement")

    context.beginPath()
    context.arc(80, 40, 8, 0, Math.PI * 2)
    context.fillStyle = "#fac547"
    context.strokeStyle = "#09090b"
    context.lineWidth = 2
    context.fill()
    context.stroke()

    context.fillStyle = "#09090b"
    context.font = "bold 9px ui-monospace, SFMono-Regular, Menlo, monospace"
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.fillText("5", 80, 40.5)
    return canvas
  })

  await Promise.resolve()
  eqApp.root.flush()
  eqApp.renderer.flush()
  const eqSource = canvasSvg(eqApp, [
    'viewBox="0 0 160 80"',
    "<path",
    ">+12 dB</text>",
    "<circle",
    'font-weight="700"',
    'text-anchor="middle"',
    'dominant-baseline="middle"',
    ">5</text>",
  ])
  requireCondition(eqSource.includes('fill="#09090b"'), `EQ SVG must retain source background paint, got ${eqSource}`)
  requireCondition(eqSource.includes('stroke="#ffffff29"'), `EQ SVG must retain source grid paint, got ${eqSource}`)
  requireCondition(eqSource.includes('fill="#a1a1aa"'), `EQ SVG must retain source label paint, got ${eqSource}`)
  requireCondition(eqSource.includes('fill="#fac547"'), `EQ SVG must retain selected-node paint, got ${eqSource}`)
  requireCondition(eqSource.includes(">5</text>"), `EQ SVG must retain the node number, got ${eqSource}`)
  requireCondition(
    !eqSource.includes('transform="matrix(1 0 0 1 0 0)"'),
    `identity Canvas transforms must not be serialized onto EQ circles, got ${eqSource}`,
  )

  const repaint = eqContext
  if (!repaint) throw new Error("EQ Canvas context should remain available for repaint acceptance")
  const initialFrameLength = eqSource.length
  for (let frame = 0; frame < 20; frame += 1) {
    repaint.fillStyle = "oklch(0.11 0.003 286)"
    repaint.fillRect(0, 0, 160, 80)
    repaint.fillStyle = "#ffffff"
    repaint.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
    repaint.textAlign = "left"
    repaint.textBaseline = "alphabetic"
    repaint.fillText(`fresh frame ${frame}`, 12, 18)
    await Promise.resolve()
    eqApp.root.flush()
    eqApp.renderer.flush()
  }
  const repaintedSource = canvasSvg(eqApp, [">fresh frame 19</text>"])
  requireCondition(
    !repaintedSource.includes("+12 dB") && !repaintedSource.includes(">5</text>") && !repaintedSource.includes("fresh frame 18"),
    `opaque full-surface EQ repaint must discard fully occluded retained commands, got ${repaintedSource}`,
  )
  requireCondition(
    repaintedSource.length <= initialFrameLength,
    `repeated opaque EQ repaints must keep the serialized frame bounded, got ${initialFrameLength} -> ${repaintedSource.length} bytes`,
  )

  requireCondition(eqApp.renderer.hasTestId("gpuix-canvas-2d-surface"), "multicolor EQ Canvas should retain one native image paint surface")
  requireCondition(!eqApp.renderer.hasTestId("gpuix-canvas-2d-layer-1"), "multicolor EQ Canvas should not depend on tint-only layers")
  eqApp.unmount()

  console.log("DAW Canvas2D compatibility bridge: image-backed batching, bounded repaint commands, compact waveform paths, and exact multicolor output passed")
}
