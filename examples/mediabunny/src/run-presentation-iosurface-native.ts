import type { PresentationBenchmarkReport, PresentationRun } from "./presentation-report.ts"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

if (process.platform !== "darwin") {
  throw new Error("IOSurface presentation benchmark requires macOS")
}

const {
  AV_CODEC_ID_H264,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  AVMEDIA_TYPE_VIDEO,
  AV_NOPTS_VALUE,
  AV_PIX_FMT_NONE,
  CodecContext,
  FFmpegError,
  Frame,
  HardwareContext,
  Packet,
} = await import("node-av")
const {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink: MediaBunnyEncodedPacketSink,
  Input,
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

function bufferFromDescription(description: AllowSharedBufferSource): Buffer {
  if (ArrayBuffer.isView(description)) {
    return Buffer.from(
      new Uint8Array(description.buffer, description.byteOffset, description.byteLength),
    )
  }
  return Buffer.from(new Uint8Array(description))
}

function bufferView(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

async function* hardwareFrames(track: NonNullable<MediaBunnyVideoTrack>) {
  const decoderConfig = await track.getDecoderConfig()
  if (!decoderConfig) throw new Error("AVC track has no decoder configuration")

  const hardware = HardwareContext.create("videotoolbox")
  if (!hardware) {
    throw new Error("NodeAV could not create a VideoToolbox hardware context")
  }
  if (hardware.deviceTypeName !== "videotoolbox") {
    hardware.dispose()
    throw new Error(`Expected VideoToolbox hardware, got ${hardware.deviceTypeName}`)
  }

  const codec = hardware.getDecoderCodec(AV_CODEC_ID_H264)
  if (!codec) {
    hardware.dispose()
    throw new Error("VideoToolbox does not expose an H.264 decoder")
  }

  const codecContext = new CodecContext()
  codecContext.allocContext3(codec)
  codecContext.width = decoderConfig.codedWidth ?? await track.getCodedWidth()
  codecContext.height = decoderConfig.codedHeight ?? await track.getCodedHeight()
  codecContext.codecType = AVMEDIA_TYPE_VIDEO
  codecContext.codecId = AV_CODEC_ID_H264
  if (decoderConfig.description) {
    codecContext.extraData = bufferFromDescription(decoderConfig.description)
  }
  codecContext.hwDeviceCtx = hardware.deviceContext
  codecContext.setHardwarePixelFormat(hardware.devicePixelFormat, AV_PIX_FMT_NONE)

  const openResult = codecContext.open2Sync(codec, null)
  FFmpegError.throwIfError(openResult, "Open VideoToolbox H.264 decoder")

  const packet = new Packet()
  packet.alloc()
  const frame = new Frame()
  frame.alloc()

  const drain = function* () {
    for (;;) {
      frame.unref()
      const receiveResult = codecContext.receiveFrameSync(frame)
      if (receiveResult === AVERROR_EAGAIN || receiveResult === AVERROR_EOF) return
      FFmpegError.throwIfError(receiveResult, "Receive VideoToolbox frame")
      if (!frame.isHwFrame()) {
        throw new Error(
          `VideoToolbox decoder returned a software frame with pixel format ${frame.format}`,
        )
      }
      yield frame
    }
  }

  try {
    const sink = new MediaBunnyEncodedPacketSink(track)
    for await (const encoded of sink.packets()) {
      packet.unref()
      packet.data = bufferView(encoded.data)
      packet.isKeyframe = encoded.type === "key"
      packet.timeBase = { num: 1, den: 1_000_000 }
      packet.pts = BigInt(Math.round(encoded.microsecondTimestamp))
      packet.dts = AV_NOPTS_VALUE
      packet.duration = BigInt(Math.round(encoded.microsecondDuration))

      const sendResult = codecContext.sendPacketSync(packet)
      packet.unref()
      FFmpegError.throwIfError(sendResult, "Send MediaBunny packet to VideoToolbox")

      for (const decoded of drain()) yield decoded
    }

    const flushResult = codecContext.sendPacketSync(null)
    FFmpegError.throwIfError(flushResult, "Flush VideoToolbox decoder")
    for (const decoded of drain()) yield decoded
  } finally {
    frame.free()
    packet.free()
    codecContext.freeContext()
    hardware.dispose()
  }
}

async function runDecodeOnly(): Promise<PresentationRun> {
  const input = createInput()
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")
    if (await track.getCodec() !== "avc") {
      throw new Error("IOSurface benchmark requires an AVC fixture")
    }

    const frameSteps: number[] = []
    const started = performance.now()
    let previousFrameAt = started
    let firstFrameMs = 0
    let frames = 0
    let width = 0
    let height = 0

    for await (const frame of hardwareFrames(track)) {
      const frameAt = performance.now()
      frameSteps.push(frameAt - previousFrameAt)
      previousFrameAt = frameAt
      if (frames === 0) firstFrameMs = frameAt - started
      width = frame.width
      height = frame.height
      frames += 1
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
  let sourcePixelFormat = 0

  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")

    const iterator = hardwareFrames(track)[Symbol.asyncIterator]()
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

      const decodedFrame = next.value
      width = decodedFrame.width
      height = decodedFrame.height

      const prepStarted = performance.now()
      sourcePixelFormat = decodedFrame.format
      const handle = decodedFrame.exportIOSurface()
      if (!handle) {
        throw new Error(
          `VideoToolbox AVFrame did not expose an IOSurface; pixel format was ${decodedFrame.format}`,
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
      decoderHardwareAcceleration: "videotoolbox",
      nodeAvDecodeCalls: "sync",
      mediaBunnyPacketSink: true,
      hardwareFrame: true,
      iosurfaceExport: true,
      sourcePixelFormat: finalRun?.nativeSourcePixelFormat ?? 0,
    },
  }

  console.log(JSON.stringify(report))
} finally {
  testRoot.unmount()
}
