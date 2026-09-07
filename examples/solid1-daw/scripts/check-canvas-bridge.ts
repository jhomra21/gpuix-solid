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

const SVG_DATA_URL_PREFIX = "data:image/svg+xml,"

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function canvasImageSvg(root: TestRoot, requiredFragments: readonly string[]): string {
  const src = root.renderer.customPropStringContainingAll("src", [
    SVG_DATA_URL_PREFIX,
    ...requiredFragments.map((fragment) => encodeURIComponent(fragment)),
  ])
  requireCondition(src.startsWith(SVG_DATA_URL_PREFIX), `Canvas bridge must paint through an SVG image data URL, got ${src}`)
  return decodeURIComponent(src.slice(SVG_DATA_URL_PREFIX.length))
}

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
  const waveformSource = canvasImageSvg(app, [
    'viewBox="0 0 100 40"',
    'preserveAspectRatio="none"',
    "<polygon",
    "<polyline",
  ])
  requireCondition(!waveformSource.includes("data-native-waveform-placeholder"), "Canvas bridge must not use the old static waveform placeholder")
  requireCondition(
    waveformSource.includes('fill="rgba(255,255,255,0.55)"') &&
      waveformSource.includes('stroke="rgba(255,255,255,0.35)"'),
    `waveform Canvas image must retain both source paints, got ${waveformSource}`,
  )
  requireCondition(app.renderer.hasTestId("gpuix-canvas-2d-surface"), "waveform Canvas should retain one native image paint surface")
  requireCondition(!app.renderer.hasTestId("gpuix-canvas-2d-layer-1"), "waveform Canvas should not split multicolor paint across tint-only SVG layers")
  app.unmount()

  const eqApp = createTestRoot(260, 140)
  eqApp.render(() => {
    // SAFETY: this uses the same literal semantic-canvas creation path validated above; the detector immediately requires a non-null 2D context before issuing EQ drawing commands.
    const canvas = createElement("canvas") as CompatCanvas
    setProp(canvas, "style", { width: 160, height: 80, position: "relative" })
    canvas.width = 160
    canvas.height = 80
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Semantic DAW canvas must expose the compatibility 2D context")

    context.fillStyle = "#09090b"
    context.fillRect(0, 0, 160, 80)
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
  const eqSource = canvasImageSvg(eqApp, [
    'viewBox="0 0 160 80"',
    "<polygon",
    ">+12 dB</text>",
    "<circle",
    'font-weight="700"',
    'text-anchor="middle"',
    'dominant-baseline="middle"',
    ">5</text>",
  ])
  requireCondition(eqSource.includes('fill="#09090b"'), `EQ image must retain source background paint, got ${eqSource}`)
  requireCondition(eqSource.includes('fill="#a1a1aa"'), `EQ image must retain source label paint, got ${eqSource}`)
  requireCondition(eqSource.includes('fill="#fac547"'), `EQ image must retain selected-node paint, got ${eqSource}`)
  requireCondition(eqSource.includes(">5</text>"), `EQ image must retain the node number, got ${eqSource}`)
  requireCondition(eqApp.renderer.hasTestId("gpuix-canvas-2d-surface"), "multicolor EQ Canvas should retain one native image paint surface")
  requireCondition(!eqApp.renderer.hasTestId("gpuix-canvas-2d-layer-1"), "multicolor EQ Canvas should not depend on tint-only SVG layers")
  eqApp.unmount()

  console.log("DAW Canvas2D compatibility bridge: unrelated styles preserved and exact multicolor Canvas output retained in one native SVG image")
}
