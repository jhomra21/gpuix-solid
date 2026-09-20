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

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function nativeCanvasDrawList(root: TestRoot, testId: string, requiredFragments: readonly string[]): string {
  const drawList = root.renderer.customPropTestId(testId, "drawList")
  const serialized = JSON.stringify(drawList)
  requireCondition(
    requiredFragments.every((fragment) => serialized.includes(fragment)),
    `Native Canvas draw list for ${testId} is missing required fragments: ${serialized}`,
  )
  return serialized
}

function canvasSvg(root: TestRoot, requiredFragments: readonly string[]): string {
  const source = root.renderer.customPropStringContainingAll("source", ["<svg", ...requiredFragments])
  requireCondition(source.startsWith("<svg"), `Canvas bridge must retain exact SVG command source, got ${source}`)
  return source
}

const canvasBridgeSource = readFileSync(new URL("../src/compat/layered-canvas.ts", import.meta.url), "utf8")
requireCondition(
  canvasBridgeSource.includes("canvasPresentation(source)"),
  "Canvas bridge must choose native presentation from the authored Canvas paint set",
)
requireCondition(
  canvasBridgeSource.includes('base.createElement(presentation.kind)'),
  "Canvas bridge must support both native SVG and image presentation without changing copied source",
)
requireCondition(
  canvasBridgeSource.includes("svgDataUrl(source)"),
  "Canvas bridge must route genuinely polychrome frames through GPUIX image decoding",
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
  let waveformCanvas: CompatCanvas | undefined
  app.render(() => {
    // SAFETY: createElement("canvas") returns the renderer canvas node that this compatibility test exercises through CompatCanvas.
    const canvas = createElement("canvas") as CompatCanvas
    setProp(canvas, "testId", "daw-waveform-canvas")
    setProp(canvas, "style", { width: 100, height: 40, position: "relative" })
    canvas.width = 100
    canvas.height = 40
    waveformCanvas = canvas
    return canvas
  })

  const mountedWaveformCanvas = waveformCanvas
  if (!mountedWaveformCanvas) throw new Error("Semantic DAW waveform canvas must mount")
  const waveformContext = mountedWaveformCanvas.getContext("2d")
  if (!waveformContext) throw new Error("Mounted DAW waveform canvas must expose a 2D context")
  waveformContext.setTransform(1, 0, 0, 1, 0, 0)
  waveformContext.clearRect(0, 0, 100, 40)
  drawWaveformPeaks({
    ctx: waveformContext,
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

  await Promise.resolve()
  app.root.flush()
  app.renderer.flush()
  const nativeCanvasV1 = app.renderer.getCanvasDrawListVersion() === 1
  if (nativeCanvasV1) {
    nativeCanvasDrawList(app, "daw-waveform-canvas", [
      '"version":1',
      '"op":"fillPath"',
      '"color":"rgba(255,255,255,0.55)"',
      '"op":"strokePath"',
      '"color":"rgba(255,255,255,0.35)"',
    ])
    requireCondition(
      !app.renderer.hasTestId("gpuix-canvas-2d-surface"),
      "source-edge DAW waveform must use the native Canvas element instead of the SVG fallback",
    )
  } else {
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
    requireCondition(app.renderer.hasTestId("gpuix-canvas-2d-surface"), "waveform Canvas should retain one active native paint surface")
    requireCondition(!app.renderer.hasTestId("gpuix-canvas-2d-layer-1"), "waveform Canvas should not split same-RGB alpha paint across tint-only SVG layers")
  }
  app.unmount()

  const eqApp = createTestRoot(260, 140)
  let eqCanvas: CompatCanvas | undefined
  eqApp.render(() => {
    // SAFETY: createElement("canvas") returns the renderer canvas node that this compatibility test exercises through CompatCanvas.
    const canvas = createElement("canvas") as CompatCanvas
    setProp(canvas, "testId", "daw-eq-canvas")
    setProp(canvas, "style", { width: 160, height: 80, position: "relative" })
    canvas.width = 160
    canvas.height = 80
    eqCanvas = canvas
    return canvas
  })

  const mountedEqCanvas = eqCanvas
  if (!mountedEqCanvas) throw new Error("Semantic DAW EQ canvas must mount")
  const eqContext = mountedEqCanvas.getContext("2d")
  if (!eqContext) throw new Error("Mounted DAW EQ canvas must expose a 2D context")
  const nativeEqCanvasV1 = eqApp.renderer.getCanvasDrawListVersion() === 1

  eqContext.fillStyle = "#09090b"
  eqContext.fillRect(0, 0, 160, 80)
  eqContext.strokeStyle = "#ffffff29"
  eqContext.lineWidth = 1
  eqContext.beginPath()
  eqContext.moveTo(8, 30)
  eqContext.lineTo(152, 30)
  eqContext.stroke()
  eqContext.fillStyle = "#a1a1aa"
  eqContext.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
  eqContext.textAlign = "left"
  eqContext.fillText("+12 dB", 12, 18)

  let partialArcRejected = false
  try {
    eqContext.beginPath()
    eqContext.arc(80, 40, 8, 0, Math.PI)
  } catch {
    partialArcRejected = true
  }
  requireCondition(
    nativeEqCanvasV1 ? !partialArcRejected : partialArcRejected,
    nativeEqCanvasV1
      ? "native Canvas v1 must lower partial arcs into cubic path segments"
      : "Canvas SVG fallback must fail closed for partial arc paths it does not implement",
  )

  eqContext.beginPath()
  eqContext.arc(80, 40, 8, 0, Math.PI * 2)
  eqContext.fillStyle = "#fac547"
  eqContext.strokeStyle = "#09090b"
  eqContext.lineWidth = 2
  eqContext.fill()
  eqContext.stroke()

  eqContext.fillStyle = "#09090b"
  eqContext.font = "bold 9px ui-monospace, SFMono-Regular, Menlo, monospace"
  eqContext.textAlign = "center"
  eqContext.textBaseline = "middle"
  eqContext.fillText("5", 80, 40.5)

  await Promise.resolve()
  eqApp.root.flush()
  eqApp.renderer.flush()
  if (nativeEqCanvasV1) {
    const eqDrawList = nativeCanvasDrawList(eqApp, "daw-eq-canvas", [
      '"version":1',
      '"color":"#09090b"',
      '"color":"#ffffff29"',
      '"text":"+12 dB"',
      '"color":"#fac547"',
      '"text":"5"',
    ])
    requireCondition(eqDrawList.includes('"op":"fillText"'), `native EQ Canvas must retain source text commands, got ${eqDrawList}`)
    requireCondition(
      !eqApp.renderer.hasTestId("gpuix-canvas-2d-surface"),
      "source-edge DAW EQ must use native Canvas instead of the SVG/image fallback",
    )
  } else {
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
    const eqImageSource = eqApp.renderer.customPropStringContainingAll("src", ["data:image/svg+xml"])
    requireCondition(
      eqImageSource.startsWith("data:image/svg+xml,"),
      `multicolor EQ Canvas must use GPUIX polychrome image presentation, got ${eqImageSource.slice(0, 64)}`,
    )
  }

  eqContext.fillStyle = "rgb(9 9 11)"
  eqContext.fillRect(0, 0, 160, 80)
  eqContext.fillStyle = "#ffffff"
  eqContext.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace"
  eqContext.textAlign = "left"
  eqContext.textBaseline = "alphabetic"
  eqContext.fillText("fresh frame", 12, 18)
  await Promise.resolve()
  eqApp.root.flush()
  eqApp.renderer.flush()
  if (nativeEqCanvasV1) {
    const repaintedDrawList = nativeCanvasDrawList(eqApp, "daw-eq-canvas", ['"text":"fresh frame"'])
    requireCondition(
      !repaintedDrawList.includes("+12 dB") && !repaintedDrawList.includes('"text":"5"'),
      `opaque full-surface native EQ repaint must discard fully occluded retained commands, got ${repaintedDrawList}`,
    )
    requireCondition(
      !eqApp.renderer.hasTestId("gpuix-canvas-2d-surface"),
      "native EQ Canvas must not create an SVG/image fallback surface after repaint",
    )
  } else {
    const repaintedSource = canvasSvg(eqApp, [">fresh frame</text>"])
    requireCondition(
      !repaintedSource.includes("+12 dB") && !repaintedSource.includes(">5</text>"),
      `opaque full-surface EQ repaint must discard fully occluded retained commands, got ${repaintedSource}`,
    )
    requireCondition(eqApp.renderer.hasTestId("gpuix-canvas-2d-surface"), "multicolor EQ Canvas should retain one active native polychrome paint surface")
    requireCondition(!eqApp.renderer.hasTestId("gpuix-canvas-2d-layer-1"), "multicolor EQ Canvas should not depend on tint-only SVG layers")
  }
  eqApp.unmount()

  console.log(
    app.renderer.getCanvasDrawListVersion() === 1
      ? "DAW Canvas2D source-edge path: native draw lists, bounded repaint commands, partial arcs, waveform, and EQ passed"
      : "DAW Canvas2D compatibility bridge: monochrome raw-SVG batching, bounded repaint commands, compact waveform paths, and polychrome EQ routing passed",
  )
}
