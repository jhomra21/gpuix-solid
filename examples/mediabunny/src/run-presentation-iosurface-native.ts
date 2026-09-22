import type { PresentationBenchmarkReport, PresentationRun } from "./presentation-report.ts"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

if (process.platform !== "darwin") {
  throw new Error("IOSurface presentation benchmark requires macOS")
}

const { Frame, HardwareContext } = await import("node-av")
const {
  registerMediabunnyServer,
  toAvFrame,
} = await import("@mediabunny/server")

const hardware = HardwareContext.create("videotoolbox")
if (!hardware) {
  throw new Error("NodeAV could not create a VideoToolbox hardware context")
}
if (hardware.deviceTypeName !== "videotoolbox") {
  hardware.dispose()
  throw new Error(`Expected VideoToolbox hardware, got ${hardware.deviceTypeName}`)
}

registerMediabunnyServer({ hardwareContext: hardware })

const {
  ALL_FORMATS,
  BufferSource,
  Input,
  VideoSampleSink,
} = await import("mediabunny")
const { createElement } = await import("../../../packages/solid/src/host/universal.ts")
const {
  createTestRoot,
  hasNativeTestRenderer,
} = await import("../../../packages/solid/src/testing.ts")
const { summarizeFrameSteps } = await import("./presentation-report.ts")

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")
if (!hasNativeTestRenderer) {
  throw new Error("IOSurface benchmark requires the source-edge GPUix TestGpuixRenderer")
}

const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const fixture = await Bun.file(fixturePath).arrayBuffer()

function createInput() {
  return new Input({
    source: new BufferSource(fixture),
    formats: ALL_FORMATS,
  })
}

type MediaBunnyVideoTrack = Awaited<ReturnType<Input["getPrimaryVideoTrack"]>>

function createSampleSink(track: NonNullable<MediaBunnyVideoTrack>) {
  return new VideoSampleSink(track, {
    hardwareAcceleration: "prefer-hardware",
  })
}

async function runDecodeOnly(): Promise<PresentationRun> {
  const input = createInput()
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")
    if (await track.getCodec() !== "avc") {
      throw new Error("IOSurface benchmark requires an AVC fixture")
    }

    const iterator = createSampleSink(track).samples()[Symbol.asyncIterator]()
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

      const sample = next.value
      try {
        frameSteps.push(stepEnded - stepStarted)
        if (frames === 0) firstFrameMs = stepEnded - started
        width = sample.codedWidth
        height = sample.codedHeight
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
    }
  } finally {
    input.dispose()
  }
}

const initialInput = createInput()
const initialTrack = await initialInput.getPrimaryVideoTrack()
if (!initialTrack) throw new Error("Presentation fixture has no video track")
if (await initialTrack.getCodec() !== "avc") {
  throw new Error("IOSurface benchmark requires an AVC fixture")
}
const surfaceWidth = await initialTrack.getCodedWidth()
const surfaceHeight = await initialTrack.getCodedHeight()
initialInput.dispose()

const testRoot = createTestRoot(surfaceWidth, surfaceHeight)
if (testRoot.renderer.getVideoFrameIosurfaceVersion() !== 1) {
  throw new Error("GPUix direct IOSurface video-frame surface v1 is unavailable")
}
const surface = createElement("video-frame")
testRoot.render(() => surface)
testRoot.renderer.flush()
if (surface.id <= 0) throw new Error("GPUix video-frame element did not receive a native id")

async function runIosurfacePresentation(): Promise<PresentationRun> {
  const input = createInput()
  const avFrame = new Frame()
  avFrame.alloc()
  let sourcePixelFormat = 0

  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")

    const iterator = createSampleSink(track).samples()[Symbol.asyncIterator]()
    const frameSteps: number[] = []
    const started = performance.now()
    let firstFrameMs = 0
    let frames = 0
    let decodeMs = 0
    let handoffPrepMs = 0
    let iosurfaceHandoffMs = 0
    let renderFlushMs = 0
    let firstFrameDecodeMs = 0
    let firstFramePrepMs = 0
    let firstFrameHandoffMs = 0
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

        const prepStarted = performance.now()
        await toAvFrame(sample, avFrame)
        if (!avFrame.isHwFrame()) {
          throw new Error(
            `MediaBunny server decoder returned a software AVFrame with pixel format ${avFrame.format}`,
          )
        }
        sourcePixelFormat = avFrame.format
        const handle = avFrame.exportIOSurface()
        if (!handle) {
          throw new Error(
            `MediaBunny server AVFrame did not expose an IOSurface; pixel format was ${avFrame.format}`,
          )
        }
        const prepEnded = performance.now()
        const prepDuration = prepEnded - prepStarted
        handoffPrepMs += prepDuration

        const handoffStarted = performance.now()
        testRoot.renderer.setVideoFrameIosurface(surface.id, handle)
        const handoffEnded = performance.now()
        const handoffDuration = handoffEnded - handoffStarted
        iosurfaceHandoffMs += handoffDuration

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
          firstFramePrepMs = prepDuration
          firstFrameHandoffMs = handoffDuration
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
      allocationMs: 0,
      copyBgraMs: handoffPrepMs,
      uploadMs: iosurfaceHandoffMs,
      renderFlushMs,
      firstFrameDecodeMs,
      firstFrameAllocationMs: 0,
      firstFrameCopyBgraMs: firstFramePrepMs,
      firstFrameUploadMs: firstFrameHandoffMs,
      firstFrameRenderFlushMs,
      nativeSourcePixelFormat: sourcePixelFormat,
    }
  } finally {
    avFrame.free()
    input.dispose()
  }
}

try {
  for (let index = 0; index < warmups; index += 1) {
    await runDecodeOnly()
    await runIosurfacePresentation()
  }

  const decodeOnly: PresentationRun[] = []
  const endToEnd: PresentationRun[] = []
  for (let index = 0; index < iterations; index += 1) {
    decodeOnly.push(await runDecodeOnly())
    endToEnd.push(await runIosurfacePresentation())
  }

  const screenshotPath = path.join(os.tmpdir(), `gpuix-mediabunny-iosurface-${process.pid}.png`)
  fs.rmSync(screenshotPath, { force: true })
  testRoot.renderer.captureScreenshot(screenshotPath)
  const screenshotBytes = fs.statSync(screenshotPath).size
  fs.rmSync(screenshotPath, { force: true })
  if (screenshotBytes === 0) throw new Error("GPUix IOSurface benchmark screenshot was empty")

  const finalRun = endToEnd[endToEnd.length - 1]
  const report: PresentationBenchmarkReport = {
    schemaVersion: 2,
    backend: "mediabunny-videotoolbox-iosurface-gpuix-video-frame",
    generatedAt: new Date().toISOString(),
    workload: {
      codec: "avc",
      fixtureBytes: fixture.byteLength,
      warmups,
      iterations,
    },
    decodeOnly,
    endToEnd,
    verification: {
      nativeSurfaceVersion: testRoot.renderer.getVideoFrameIosurfaceVersion() ?? 0,
      screenshotBytes,
      decoderHardwareAcceleration: hardware.deviceTypeName,
      mediaBunnyServerDecoder: true,
      hardwareFrame: true,
      iosurfaceExport: true,
      sourcePixelFormat: finalRun?.nativeSourcePixelFormat ?? 0,
    },
  }

  console.log(JSON.stringify(report))
} finally {
  testRoot.unmount()
  hardware.dispose()
}
