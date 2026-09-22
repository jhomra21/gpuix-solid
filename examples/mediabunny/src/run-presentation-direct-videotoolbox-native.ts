import { createRequire } from "node:module"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} from "mediabunny"
import { createElement } from "../../../packages/solid/src/host/universal.ts"
import {
  createTestRoot,
  hasNativeTestRenderer,
} from "../../../packages/solid/src/testing.ts"
import { summarizeArrivals } from "./direct-decode-report.ts"
import {
  summarizeFrameSteps,
  type PresentationBenchmarkReport,
  type PresentationRun,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Direct VideoToolbox IOSurface presentation requires macOS")
}
if (!hasNativeTestRenderer) {
  throw new Error("Direct VideoToolbox presentation requires the source-edge GPUix TestGpuixRenderer")
}

type NativeBatchPacket = {
  data: Buffer
  timestamp: number
  duration: number
  keyframe: boolean
}

type NativeBatchResult = {
  packets: number
  submitted: number
  frames: number
  dropped: number
  width: number
  height: number
  totalMs: number
  packetParseMs: number
  sampleBuildMs: number
  submitMs: number
  waitMs: number
  firstFrameMs: number
  lastFrameMs: number
  frameArrivalMs: number[]
  frameHandles?: Buffer[]
  hardwareAccelerated: boolean
}

type NativeDecoder = {
  readonly hardwareAccelerated: boolean
  decodeBatch(
    packets: NativeBatchPacket[],
    captureFrames?: boolean,
    finish?: boolean,
  ): NativeBatchResult
  releaseFrames(): number
  dispose(): void
}

type NativeModule = {
  VideoToolboxH264Decoder: new (description: Buffer) => NativeDecoder
}

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const steadyBatchSize = Number(process.env.GPUIX_MEDIA_DIRECT_FRAME_BATCH ?? 8)
if (!Number.isInteger(steadyBatchSize) || steadyBatchSize < 1) {
  throw new Error("GPUIX_MEDIA_DIRECT_FRAME_BATCH must be a positive integer")
}

const fixture = await Bun.file(fixturePath).arrayBuffer()
const sourceDirectory = import.meta.dir
const addonPath = path.join(
  sourceDirectory,
  "..",
  "native",
  "videotoolbox",
  "build",
  "Release",
  "gpuix_videotoolbox.node",
)
const require = createRequire(import.meta.url)
// SAFETY: this repository builds the expected N-API constructor at this exact path.
const native = require(addonPath) as NativeModule

function createInput() {
  return new Input({
    source: new BufferSource(fixture),
    formats: ALL_FORMATS,
  })
}

function copyDescription(description: AllowSharedBufferSource): Buffer {
  if (ArrayBuffer.isView(description)) {
    return Buffer.from(
      new Uint8Array(
        description.buffer,
        description.byteOffset,
        description.byteLength,
      ),
    )
  }
  return Buffer.from(new Uint8Array(description))
}

function packetView(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
}

async function createTrackState() {
  const input = createInput()
  const track = await input.getPrimaryVideoTrack()
  if (!track) {
    input.dispose()
    throw new Error("Presentation fixture has no video track")
  }
  if (await track.getCodec() !== "avc") {
    input.dispose()
    throw new Error("Direct VideoToolbox presentation requires an AVC fixture")
  }

  const config = await track.getDecoderConfig()
  if (!config?.description) {
    input.dispose()
    throw new Error("AVC track has no decoder configuration description")
  }

  return {
    input,
    track,
    description: copyDescription(config.description),
    width: config.codedWidth ?? await track.getCodedWidth(),
    height: config.codedHeight ?? await track.getCodedHeight(),
  }
}

async function runDecodeOnly(): Promise<PresentationRun> {
  const state = await createTrackState()
  const decoder = new native.VideoToolboxH264Decoder(state.description)
  if (!decoder.hardwareAccelerated) {
    decoder.dispose()
    state.input.dispose()
    throw new Error("Direct VideoToolbox decoder is not hardware accelerated")
  }

  try {
    const sink = new EncodedPacketSink(state.track)
    const packets: NativeBatchPacket[] = []
    const started = performance.now()

    for await (const packet of sink.packets()) {
      packets.push({
        data: packetView(packet.data),
        timestamp: Math.round(packet.microsecondTimestamp),
        duration: Math.round(packet.microsecondDuration),
        keyframe: packet.type === "key",
      })
    }

    const decodeStarted = performance.now()
    const result = decoder.decodeBatch(packets, false, true)
    const decodeOffsetMs = decodeStarted - started

    if (!result.hardwareAccelerated) {
      throw new Error("Direct VideoToolbox batch lost hardware acceleration")
    }
    if (result.dropped !== 0) {
      throw new Error(`Direct VideoToolbox decoder dropped ${result.dropped} frame(s)`)
    }

    return {
      frames: result.frames,
      width: result.width,
      height: result.height,
      totalMs: performance.now() - started,
      firstFrameMs: decodeOffsetMs + result.firstFrameMs,
      ...summarizeArrivals(result.frameArrivalMs),
      decodeMs: result.totalMs,
    }
  } finally {
    decoder.dispose()
    state.input.dispose()
  }
}

const initial = await createTrackState()
const surfaceWidth = initial.width
const surfaceHeight = initial.height
initial.input.dispose()

const testRoot = createTestRoot(surfaceWidth, surfaceHeight)
if (testRoot.renderer.getVideoFrameIosurfaceVersion() !== 1) {
  testRoot.unmount()
  throw new Error("GPUix direct IOSurface video-frame surface v1 is unavailable")
}
const surface = createElement("video-frame")
testRoot.render(() => surface)
testRoot.renderer.flush()
if (surface.id <= 0) {
  testRoot.unmount()
  throw new Error("GPUix video-frame element did not receive a native id")
}

async function runPresentation(): Promise<PresentationRun> {
  const state = await createTrackState()
  const decoder = new native.VideoToolboxH264Decoder(state.description)
  if (!decoder.hardwareAccelerated) {
    decoder.dispose()
    state.input.dispose()
    throw new Error("Direct VideoToolbox decoder is not hardware accelerated")
  }

  const sink = new EncodedPacketSink(state.track)
  const frameSteps: number[] = []
  const started = performance.now()
  let previousPresentedAt = started
  let firstFrameMs = 0
  let frames = 0
  let decodeMs = 0
  let handoffMs = 0
  let renderFlushMs = 0
  let firstFrameDecodeMs = 0
  let firstFrameHandoffMs = 0
  let firstFrameRenderFlushMs = 0
  let packetBatch: NativeBatchPacket[] = []

  const presentBatch = (finish: boolean) => {
    const decodeStarted = performance.now()
    const result = decoder.decodeBatch(packetBatch, true, finish)
    const decodeEnded = performance.now()
    const decodeDuration = decodeEnded - decodeStarted
    decodeMs += decodeDuration

    if (!result.hardwareAccelerated) {
      throw new Error("Direct VideoToolbox batch lost hardware acceleration")
    }
    if (result.dropped !== 0) {
      throw new Error(`Direct VideoToolbox decoder dropped ${result.dropped} frame(s)`)
    }

    const handles = result.frameHandles ?? []
    if (handles.length !== result.frames) {
      throw new Error(
        `Direct VideoToolbox returned ${handles.length} IOSurface handles for ${result.frames} frame(s)`,
      )
    }

    try {
      for (const handle of handles) {
        const handoffStarted = performance.now()
        testRoot.renderer.setVideoFrameIosurface(surface.id, handle)
        const handoffEnded = performance.now()
        const handoffDuration = handoffEnded - handoffStarted
        handoffMs += handoffDuration

        const renderStarted = performance.now()
        testRoot.renderer.flush()
        const renderEnded = performance.now()
        const renderDuration = renderEnded - renderStarted
        renderFlushMs += renderDuration

        const presentedAt = performance.now()
        frameSteps.push(presentedAt - previousPresentedAt)
        previousPresentedAt = presentedAt
        if (frames === 0) {
          firstFrameMs = presentedAt - started
          firstFrameDecodeMs = decodeDuration
          firstFrameHandoffMs = handoffDuration
          firstFrameRenderFlushMs = renderDuration
        }
        frames += 1
      }
    } finally {
      const released = decoder.releaseFrames()
      if (released !== handles.length) {
        throw new Error(
          `Direct VideoToolbox released ${released} retained frame(s), expected ${handles.length}`,
        )
      }
    }

    packetBatch = []
  }

  try {
    for await (const packet of sink.packets()) {
      packetBatch.push({
        data: packetView(packet.data),
        timestamp: Math.round(packet.microsecondTimestamp),
        duration: Math.round(packet.microsecondDuration),
        keyframe: packet.type === "key",
      })

      const targetBatchSize = frames === 0 ? 1 : steadyBatchSize
      if (packetBatch.length >= targetBatchSize) {
        presentBatch(false)
      }
    }

    if (packetBatch.length > 0) presentBatch(false)
    presentBatch(true)

    return {
      frames,
      width: state.width,
      height: state.height,
      totalMs: performance.now() - started,
      firstFrameMs,
      ...summarizeFrameSteps(frameSteps),
      decodeMs,
      allocationMs: 0,
      copyBgraMs: 0,
      uploadMs: handoffMs,
      renderFlushMs,
      firstFrameDecodeMs,
      firstFrameAllocationMs: 0,
      firstFrameCopyBgraMs: 0,
      firstFrameUploadMs: firstFrameHandoffMs,
      firstFrameRenderFlushMs,
    }
  } finally {
    decoder.releaseFrames()
    decoder.dispose()
    state.input.dispose()
  }
}

try {
  for (let index = 0; index < warmups; index += 1) {
    await runDecodeOnly()
    await runPresentation()
  }

  const decodeOnly: PresentationRun[] = []
  const endToEnd: PresentationRun[] = []
  for (let index = 0; index < iterations; index += 1) {
    decodeOnly.push(await runDecodeOnly())
    endToEnd.push(await runPresentation())
  }

  const screenshotPath = path.join(
    os.tmpdir(),
    `gpuix-mediabunny-direct-iosurface-${process.pid}.png`,
  )
  fs.rmSync(screenshotPath, { force: true })
  testRoot.renderer.captureScreenshot(screenshotPath)
  const screenshotBytes = fs.statSync(screenshotPath).size
  fs.rmSync(screenshotPath, { force: true })
  if (screenshotBytes === 0) {
    throw new Error("GPUix direct VideoToolbox screenshot was empty")
  }

  const report: PresentationBenchmarkReport = {
    schemaVersion: 2,
    backend: "direct-videotoolbox-iosurface-gpuix-video-frame",
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
      decoderHardwareAcceleration: "videotoolbox",
      directVideoToolbox: true,
      ffmpegInDecodeHotLoop: false,
      nodeAvInDecodeHotLoop: false,
      boundedRetainedFrameBatches: true,
      firstPresentedFramePacketBatch: 1,
      steadyPacketBatch: steadyBatchSize,
      mediaBunnyPacketSink: true,
      hardwareFrame: true,
      iosurfaceExport: true,
    },
  }

  console.log(JSON.stringify(report))
} finally {
  testRoot.unmount()
}
