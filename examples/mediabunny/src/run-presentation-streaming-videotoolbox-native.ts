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
import {
  summarizeFrameSteps,
  type PresentationBenchmarkReport,
  type PresentationRun,
} from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Streaming VideoToolbox IOSurface presentation requires macOS")
}
if (!hasNativeTestRenderer) {
  throw new Error("Streaming VideoToolbox presentation requires source-edge GPUix")
}

type MediaBunnyVideoTrack = NonNullable<
  Awaited<ReturnType<Input["getPrimaryVideoTrack"]>>
>

type NativeVideoCodec = "avc" | "hevc"

type NativePacket = {
  data: Buffer
  timestamp: number
  duration: number
  keyframe: boolean
}

type StreamResult = {
  submitted: number
  decoded: number
  delivered: number
  dropped: number
  decodeMs: number
  presentationOrderMonotonic: boolean
  hardwareAccelerated: boolean
  maxPendingFrames: number
}

type NativeFrame = {
  readonly iosurfaceHandle: Buffer
  close(): void
}

type NativeDecoder = {
  readonly hardwareAccelerated: boolean
  decodeStream(
    packets: NativePacket[],
    onFrame: (frame: NativeFrame, timestampUs: number) => void,
  ): Promise<StreamResult>
  dispose(): void
}

type NativeModule = {
  VideoToolboxVideoDecoder: new (
    codec: NativeVideoCodec,
    description: Buffer,
  ) => NativeDecoder
}

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const fixture = await Bun.file(fixturePath).arrayBuffer()

const addonPath = path.join(
  import.meta.dir,
  "..",
  "native",
  "videotoolbox",
  "build",
  "Release",
  "gpuix_videotoolbox.node",
)
const require = createRequire(import.meta.url)
// SAFETY: this repository builds the expected N-API addon at this path.
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
  const codec = await track.getCodec()
  if (codec !== "avc" && codec !== "hevc") {
    input.dispose()
    throw new Error(`Streaming VideoToolbox presentation does not support ${codec}`)
  }

  const config = await track.getDecoderConfig()
  if (!config?.description) {
    input.dispose()
    throw new Error(`${codec.toUpperCase()} track has no decoder configuration`)
  }

  return {
    input,
    track,
    codec,
    description: copyDescription(config.description),
    width: config.codedWidth ?? await track.getCodedWidth(),
    height: config.codedHeight ?? await track.getCodedHeight(),
  }
}

async function collectPackets(
  track: MediaBunnyVideoTrack,
): Promise<NativePacket[]> {
  const packets: NativePacket[] = []
  const sink = new EncodedPacketSink(track)
  for await (const packet of sink.packets()) {
    packets.push({
      data: packetView(packet.data),
      timestamp: Math.round(packet.microsecondTimestamp),
      duration: Math.round(packet.microsecondDuration),
      keyframe: packet.type === "key",
    })
  }
  return packets
}

function validateStream(
  result: StreamResult,
  packetCount: number,
  callbackCount: number,
) {
  if (!result.hardwareAccelerated) {
    throw new Error("Streaming VideoToolbox lost hardware acceleration")
  }
  if (result.dropped !== 0) {
    throw new Error(`Streaming VideoToolbox dropped ${result.dropped} frame(s)`)
  }
  if (!result.presentationOrderMonotonic) {
    throw new Error("Streaming VideoToolbox callback order was not presentation-monotonic")
  }
  if (
    result.submitted !== packetCount
    || result.decoded !== packetCount
    || result.delivered !== packetCount
    || callbackCount !== packetCount
  ) {
    throw new Error(
      `Streaming VideoToolbox count mismatch packets=${packetCount} submitted=${result.submitted} decoded=${result.decoded} delivered=${result.delivered} callbacks=${callbackCount}`,
    )
  }
}

async function runDecodeOnly(): Promise<PresentationRun> {
  const state = await createTrackState()
  const decoder = new native.VideoToolboxVideoDecoder(state.codec, state.description)
  try {
    if (!decoder.hardwareAccelerated) {
      throw new Error("Streaming VideoToolbox decoder is not hardware accelerated")
    }

    const started = performance.now()
    const packets = await collectPackets(state.track)
    const frameSteps: number[] = []
    let previousFrameAt = started
    let firstFrameMs = 0
    let callbacks = 0

    const result = await decoder.decodeStream(
      packets,
      (frame) => {
        try {
          const now = performance.now()
          frameSteps.push(now - previousFrameAt)
          previousFrameAt = now
          if (callbacks === 0) firstFrameMs = now - started
          callbacks += 1
        } finally {
          frame.close()
        }
      },
    )

    validateStream(result, packets.length, callbacks)

    return {
      frames: callbacks,
      width: state.width,
      height: state.height,
      totalMs: performance.now() - started,
      firstFrameMs,
      ...summarizeFrameSteps(frameSteps),
      decodeMs: result.decodeMs,
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
  const decoder = new native.VideoToolboxVideoDecoder(state.codec, state.description)

  try {
    if (!decoder.hardwareAccelerated) {
      throw new Error("Streaming VideoToolbox decoder is not hardware accelerated")
    }

    const started = performance.now()
    const packets = await collectPackets(state.track)
    const packetPreparationMs = performance.now() - started

    const frameSteps: number[] = []
    let previousPresentedAt = started
    let firstFrameMs = 0
    let firstFrameDecodeMs = 0
    let firstFrameHandoffMs = 0
    let firstFrameRenderFlushMs = 0
    let handoffMs = 0
    let renderFlushMs = 0
    let callbacks = 0

    const streamStarted = performance.now()
    const result = await decoder.decodeStream(
      packets,
      (frame) => {
        try {
          const callbackStarted = performance.now()

          const handoffStarted = performance.now()
          testRoot.renderer.setVideoFrameIosurface(
            surface.id,
            frame.iosurfaceHandle,
          )
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

          if (callbacks === 0) {
            firstFrameMs = presentedAt - started
            firstFrameDecodeMs = callbackStarted - streamStarted + packetPreparationMs
            firstFrameHandoffMs = handoffDuration
            firstFrameRenderFlushMs = renderDuration
          }
          callbacks += 1
        } finally {
          frame.close()
        }
      },
    )

    validateStream(result, packets.length, callbacks)

    return {
      frames: callbacks,
      width: state.width,
      height: state.height,
      totalMs: performance.now() - started,
      firstFrameMs,
      ...summarizeFrameSteps(frameSteps),
      decodeMs: packetPreparationMs + result.decodeMs,
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
    `gpuix-mediabunny-streaming-iosurface-${process.pid}.png`,
  )
  fs.rmSync(screenshotPath, { force: true })
  testRoot.renderer.captureScreenshot(screenshotPath)
  const screenshotBytes = fs.statSync(screenshotPath).size
  fs.rmSync(screenshotPath, { force: true })
  if (screenshotBytes === 0) {
    throw new Error("GPUix streaming VideoToolbox screenshot was empty")
  }

  const report: PresentationBenchmarkReport = {
    schemaVersion: 2,
    backend: "streaming-videotoolbox-iosurface-gpuix-video-frame",
    generatedAt: new Date().toISOString(),
    workload: {
      codec: initial.codec,
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
      codec: initial.codec,
      streamingDelivery: true,
      maxPendingFrames: 2,
      mediaBunnyPacketSink: true,
      packetIterationIncludedInTimer: true,
      presentationOrderMonotonic: true,
      ffmpegInDecodeHotLoop: false,
      nodeAvInDecodeHotLoop: false,
      hardwareFrame: true,
      iosurfaceExport: true,
    },
  }

  console.log(JSON.stringify(report))
} finally {
  testRoot.unmount()
}
