import type { AVPixelFormat } from "node-av"
import type { PresentationBenchmarkReport, PresentationRun } from "./presentation-report.ts"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const { registerMediabunnyServer, toAvFrame } = await import("@mediabunny/server")
registerMediabunnyServer()

const {
  AV_PIX_FMT_BGRA,
  FFmpegError,
  Frame,
  SoftwareScaleContext,
  SWS_BILINEAR,
} = await import("node-av")
const {
  ALL_FORMATS,
  BufferSource,
  Input,
  VideoSampleSink,
} = await import("mediabunny")
const { createElement, setProp } = await import("../../../packages/solid/src/host/universal.ts")
const {
  createTestRoot,
  hasNativeTestRenderer,
} = await import("../../../packages/solid/src/testing.ts")
const { summarizeFrameSteps } = await import("./presentation-report.ts")

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")
if (!hasNativeTestRenderer) {
  throw new Error("Presentation benchmark requires the source-edge GPUix TestGpuixRenderer")
}

const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const fixture = await Bun.file(fixturePath).arrayBuffer()
const decoderOptions = { hardwareAcceleration: "prefer-software" as const }

function createInput() {
  return new Input({
    source: new BufferSource(fixture),
    formats: ALL_FORMATS,
  })
}

async function runDecodeOnly(): Promise<PresentationRun> {
  const input = createInput()
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")

    const sink = new VideoSampleSink(track, decoderOptions)
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

const initialInput = createInput()
const initialTrack = await initialInput.getPrimaryVideoTrack()
if (!initialTrack) throw new Error("Presentation fixture has no video track")
const surfaceWidth = await initialTrack.getCodedWidth()
const surfaceHeight = await initialTrack.getCodedHeight()
initialInput.dispose()

const testRoot = createTestRoot(surfaceWidth, surfaceHeight)
if (testRoot.renderer.getVideoFrameSurfaceVersion() !== 1) {
  throw new Error("GPUix binary video-frame surface v1 is unavailable")
}
const surface = createElement("video-frame")
setProp(surface, "style", { width: surfaceWidth, height: surfaceHeight })
setProp(surface, "objectFit", "fill")
setProp(surface, "alt", "MediaBunny server AVFrame presentation benchmark")
testRoot.render(() => surface)

async function runNativePresentation(): Promise<PresentationRun> {
  const input = createInput()
  const sourceFrame = new Frame()
  sourceFrame.alloc()

  let bgraFrame: InstanceType<typeof Frame> | undefined
  let scaler: InstanceType<typeof SoftwareScaleContext> | undefined
  let packedBgra: Uint8Array | undefined
  let configuredSourceFormat: AVPixelFormat | undefined
  let configuredWidth = 0
  let configuredHeight = 0
  let lastStride = 0
  let usedPackedFallback = false

  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")

    const sink = new VideoSampleSink(track, decoderOptions)
    const iterator = sink.samples()[Symbol.asyncIterator]()
    const frameSteps: number[] = []
    const started = performance.now()
    let firstFrameMs = 0
    let frames = 0
    let decodeMs = 0
    let allocationMs = 0
    let copyBgraMs = 0
    let uploadMs = 0
    let renderFlushMs = 0
    let firstFrameDecodeMs = 0
    let firstFrameAllocationMs = 0
    let firstFrameCopyBgraMs = 0
    let firstFrameUploadMs = 0
    let firstFrameRenderFlushMs = 0
    let width = 0
    let height = 0

    for (;;) {
      const frameStarted = performance.now()

      const decodeStarted = performance.now()
      const next = await iterator.next()
      const decodeEnded = performance.now()
      const decodeDuration = decodeEnded - decodeStarted
      decodeMs += decodeDuration
      if (next.done) break

      const sample = next.value
      try {
        width = sample.codedWidth
        height = sample.codedHeight

        const refStarted = performance.now()
        await toAvFrame(sample, sourceFrame)
        const refEnded = performance.now()

        const allocationStarted = performance.now()
        const sourceFormat = sourceFrame.format as AVPixelFormat
        if (
          !bgraFrame
          || !scaler
          || configuredSourceFormat !== sourceFormat
          || configuredWidth !== width
          || configuredHeight !== height
        ) {
          scaler?.freeContext()
          bgraFrame?.free()

          scaler = new SoftwareScaleContext()
          scaler.getContext(
            width,
            height,
            sourceFormat,
            width,
            height,
            AV_PIX_FMT_BGRA,
            SWS_BILINEAR,
          )

          bgraFrame = new Frame()
          bgraFrame.alloc()
          bgraFrame.width = width
          bgraFrame.height = height
          bgraFrame.format = AV_PIX_FMT_BGRA
          FFmpegError.throwIfError(bgraFrame.allocBuffer(), "Allocate reusable BGRA AVFrame")

          const rowBytes = width * 4
          const stride = bgraFrame.linesize[0] ?? 0
          if (stride < rowBytes) {
            throw new Error(`BGRA AVFrame stride ${stride} is smaller than row size ${rowBytes}`)
          }
          packedBgra = stride === rowBytes ? undefined : new Uint8Array(rowBytes * height)
          configuredSourceFormat = sourceFormat
          configuredWidth = width
          configuredHeight = height
        }
        const allocationEnded = performance.now()
        const allocationDuration = allocationEnded - allocationStarted
        allocationMs += allocationDuration

        const conversionStarted = performance.now()
        FFmpegError.throwIfError(
          scaler.scaleFrameSync(bgraFrame, sourceFrame),
          "Convert decoded AVFrame to BGRA",
        )

        const planes = bgraFrame.data
        const plane = planes?.[0]
        if (!plane) throw new Error("Reusable BGRA AVFrame has no pixel plane")
        const rowBytes = width * 4
        const stride = bgraFrame.linesize[0] ?? 0
        lastStride = stride

        let data: Uint8Array
        if (stride === rowBytes) {
          data = plane.subarray(0, rowBytes * height)
        } else {
          usedPackedFallback = true
          if (!packedBgra || packedBgra.byteLength !== rowBytes * height) {
            packedBgra = new Uint8Array(rowBytes * height)
          }
          for (let row = 0; row < height; row += 1) {
            const sourceOffset = row * stride
            const destinationOffset = row * rowBytes
            packedBgra.set(
              plane.subarray(sourceOffset, sourceOffset + rowBytes),
              destinationOffset,
            )
          }
          data = packedBgra
        }
        const conversionEnded = performance.now()
        const copyDuration = (refEnded - refStarted) + (conversionEnded - conversionStarted)
        copyBgraMs += copyDuration

        const uploadStarted = performance.now()
        setProp(surface, "frame", { data, width, height })
        const uploadEnded = performance.now()
        const uploadDuration = uploadEnded - uploadStarted
        uploadMs += uploadDuration

        const renderStarted = performance.now()
        testRoot.renderer.flush()
        const renderEnded = performance.now()
        const renderDuration = renderEnded - renderStarted
        renderFlushMs += renderDuration

        const frameEnded = performance.now()
        frameSteps.push(frameEnded - frameStarted)
        if (frames === 0) {
          firstFrameMs = frameEnded - started
          firstFrameDecodeMs = decodeDuration
          firstFrameAllocationMs = allocationDuration
          firstFrameCopyBgraMs = copyDuration
          firstFrameUploadMs = uploadDuration
          firstFrameRenderFlushMs = renderDuration
        }
        frames += 1
      } finally {
        sample.close()
      }
    }

    return {
      frames,
      width,
      height,
      totalMs: performance.now() - started,
      firstFrameMs,
      ...summarizeFrameSteps(frameSteps),
      decodeMs,
      allocationMs,
      copyBgraMs,
      uploadMs,
      renderFlushMs,
      firstFrameDecodeMs,
      firstFrameAllocationMs,
      firstFrameCopyBgraMs,
      firstFrameUploadMs,
      firstFrameRenderFlushMs,
      nativeBgraStride: lastStride,
      nativePackedFallback: usedPackedFallback,
    }
  } finally {
    scaler?.freeContext()
    bgraFrame?.free()
    sourceFrame.free()
    input.dispose()
  }
}

try {
  for (let index = 0; index < warmups; index += 1) {
    await runDecodeOnly()
    await runNativePresentation()
  }

  const decodeOnly: PresentationRun[] = []
  const endToEnd: PresentationRun[] = []
  for (let index = 0; index < iterations; index += 1) {
    decodeOnly.push(await runDecodeOnly())
    endToEnd.push(await runNativePresentation())
  }

  const screenshotPath = path.join(os.tmpdir(), `gpuix-mediabunny-server-presentation-${process.pid}.png`)
  fs.rmSync(screenshotPath, { force: true })
  testRoot.renderer.captureScreenshot(screenshotPath)
  const screenshotBytes = fs.statSync(screenshotPath).size
  fs.rmSync(screenshotPath, { force: true })
  if (screenshotBytes === 0) throw new Error("GPUix server presentation benchmark screenshot was empty")

  const finalRun = endToEnd[endToEnd.length - 1]

  const report: PresentationBenchmarkReport = {
    schemaVersion: 2,
    backend: "mediabunny-server-avframe-gpuix-video-frame",
    generatedAt: new Date().toISOString(),
    workload: {
      codec: "vp8",
      fixtureBytes: fixture.byteLength,
      warmups,
      iterations,
    },
    decodeOnly,
    endToEnd,
    verification: {
      nativeSurfaceVersion: testRoot.renderer.getVideoFrameSurfaceVersion() ?? 0,
      screenshotBytes,
      decoderHardwareAcceleration: "prefer-software",
      avFrameDirect: true,
      bgraStride: finalRun?.nativeBgraStride ?? 0,
      packedFallback: finalRun?.nativePackedFallback ?? false,
    },
  }

  console.log(JSON.stringify(report))
} finally {
  testRoot.unmount()
}
