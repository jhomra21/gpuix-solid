import {
  ALL_FORMATS,
  BufferSource,
  CanvasSink,
  Input,
  VideoSampleSink,
} from "mediabunny"
import {
  summarizeFrameSteps,
  type PresentationBenchmarkReport,
  type PresentationRun,
} from "./presentation-report.ts"

const reportNode = document.querySelector("#report")
if (!(reportNode instanceof HTMLElement)) {
  throw new Error("Presentation benchmark is missing its report node")
}

const parameters = new URLSearchParams(location.search)
const iterations = Number(parameters.get("iterations") ?? 3)
const warmups = Number(parameters.get("warmups") ?? 1)
const codec = parameters.get("codec") === "avc" ? "avc" : "vp8"
const reportEndpoint = parameters.get("reportEndpoint")

function createInput(buffer: ArrayBuffer) {
  return new Input({
    source: new BufferSource(buffer),
    formats: ALL_FORMATS,
  })
}

async function runDecodeOnly(buffer: ArrayBuffer): Promise<PresentationRun> {
  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")

    const sink = new VideoSampleSink(track)
    const iterator = sink.samples()[Symbol.asyncIterator]()
    const frameSteps: number[] = []
    const started = performance.now()
    let firstFrameMs = 0
    let frames = 0
    let width = 0
    let height = 0

    for (;;) {
      const stepStarted = performance.now()
      const next = await iterator.next()
      const stepEnded = performance.now()
      if (next.done) break

      frameSteps.push(stepEnded - stepStarted)
      if (frames === 0) firstFrameMs = stepEnded - started
      width = next.value.codedWidth
      height = next.value.codedHeight
      frames += 1
      next.value.close()
    }

    return {
      frames,
      width,
      height,
      totalMs: performance.now() - started,
      firstFrameMs,
      ...summarizeFrameSteps(frameSteps),
    }
  } finally {
    input.dispose()
  }
}

async function runCanvasPresentation(buffer: ArrayBuffer): Promise<{
  run: PresentationRun
  finalTimestamp: number
  finalPixel: string
}> {
  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")

    const width = await track.getCodedWidth()
    const height = await track.getCodedHeight()
    const sink = new CanvasSink(track, {
      width,
      height,
      fit: "fill",
      poolSize: 2,
    })
    const iterator = sink.canvases()[Symbol.asyncIterator]()
    const frameSteps: number[] = []
    const started = performance.now()
    let firstFrameMs = 0
    let frames = 0
    let finalTimestamp = 0
    let finalCanvas: HTMLCanvasElement | OffscreenCanvas | null = null

    for (;;) {
      const stepStarted = performance.now()
      const next = await iterator.next()
      const stepEnded = performance.now()
      if (next.done) break

      frameSteps.push(stepEnded - stepStarted)
      if (frames === 0) firstFrameMs = stepEnded - started
      frames += 1
      finalTimestamp = next.value.timestamp
      finalCanvas = next.value.canvas
    }

    const totalMs = performance.now() - started
    if (!finalCanvas) throw new Error("CanvasSink produced no canvases")
    const context = finalCanvas.getContext("2d")
    if (!context) throw new Error("CanvasSink final canvas has no 2D context")
    const x = Math.max(0, Math.floor(finalCanvas.width / 2))
    const y = Math.max(0, Math.floor(finalCanvas.height / 2))
    const pixel = context.getImageData(x, y, 1, 1).data
    const finalPixel = Array.from(pixel).join(",")

    return {
      run: {
        frames,
        width: finalCanvas.width,
        height: finalCanvas.height,
        totalMs,
        firstFrameMs,
        ...summarizeFrameSteps(frameSteps),
      },
      finalTimestamp,
      finalPixel,
    }
  } finally {
    input.dispose()
  }
}

try {
  const response = await fetch("/fixture.webm")
  if (!response.ok) throw new Error(`Could not load presentation fixture: ${response.status}`)
  const fixture = await response.arrayBuffer()

  for (let index = 0; index < warmups; index += 1) {
    await runDecodeOnly(fixture)
    await runCanvasPresentation(fixture)
  }

  const decodeOnly: PresentationRun[] = []
  const endToEnd: PresentationRun[] = []
  let finalTimestamp = 0
  let finalPixel = ""

  for (let index = 0; index < iterations; index += 1) {
    decodeOnly.push(await runDecodeOnly(fixture))
    const presented = await runCanvasPresentation(fixture)
    endToEnd.push(presented.run)
    finalTimestamp = presented.finalTimestamp
    finalPixel = presented.finalPixel
  }

  const report: PresentationBenchmarkReport = {
    schemaVersion: 2,
    backend: "browser-webcodecs-canvas",
    generatedAt: new Date().toISOString(),
    workload: {
      codec,
      fixtureBytes: fixture.byteLength,
      warmups,
      iterations,
    },
    decodeOnly,
    endToEnd,
    verification: {
      finalTimestamp,
      finalPixel,
    },
  }

  const serializedReport = JSON.stringify(report)
  reportNode.textContent = serializedReport
  if (reportEndpoint) {
    const response = await fetch(reportEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: serializedReport,
    })
    if (!response.ok) {
      throw new Error(`Could not submit presentation report: ${response.status}`)
    }
  }
  document.body.dataset.status = "ready"
} catch (error) {
  reportNode.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error)
  document.body.dataset.status = "error"
}
