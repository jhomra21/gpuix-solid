import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} from "mediabunny"
import {
  type DirectDecodeReport,
  type DirectDecodeRun,
  summarizeArrivals,
} from "./direct-decode-report.ts"

if (process.platform !== "darwin") {
  throw new Error("Direct VideoToolbox benchmark requires macOS")
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
  hardwareAccelerated: boolean
}

type NativeDecoder = {
  readonly hardwareAccelerated: boolean
  decodeBatch(packets: NativeBatchPacket[]): NativeBatchResult
  dispose(): void
}

type NativeModule = {
  VideoToolboxH264Decoder: new (description: Buffer) => NativeDecoder
}

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 5)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 2)
const fixture = await Bun.file(fixturePath).arrayBuffer()
const sourceDirectory = dirname(fileURLToPath(import.meta.url))
const addonPath = join(
  sourceDirectory,
  "..",
  "native",
  "videotoolbox",
  "build",
  "Release",
  "gpuix_videotoolbox.node",
)
const require = createRequire(import.meta.url)
// SAFETY: this path is produced by this repository's node-gyp target and the expected constructor is checked by use below.
const native = require(addonPath) as NativeModule

function createInput() {
  return new Input({
    source: new BufferSource(fixture),
    formats: ALL_FORMATS,
  })
}

function toBuffer(description: AllowSharedBufferSource): Buffer {
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

async function prepareInput() {
  const input = createInput()
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Direct decode fixture has no video track")
    if (await track.getCodec() !== "avc") {
      throw new Error("Direct VideoToolbox benchmark requires AVC")
    }

    const config = await track.getDecoderConfig()
    if (!config?.description) {
      throw new Error("AVC track has no decoder configuration description")
    }

    const packets: NativeBatchPacket[] = []
    const sink = new EncodedPacketSink(track)
    for await (const packet of sink.packets()) {
      packets.push({
        data: Buffer.from(packet.data),
        timestamp: Math.round(packet.microsecondTimestamp),
        duration: Math.round(packet.microsecondDuration),
        keyframe: packet.type === "key",
      })
    }

    return {
      description: toBuffer(config.description),
      packets,
    }
  } finally {
    input.dispose()
  }
}

const prepared = await prepareInput()

function runDecode(): DirectDecodeRun {
  const decoder = new native.VideoToolboxH264Decoder(prepared.description)
  try {
    if (!decoder.hardwareAccelerated) {
      throw new Error("Direct VideoToolbox decoder is not hardware accelerated")
    }

    const started = performance.now()
    const result = decoder.decodeBatch(prepared.packets)
    const totalMs = performance.now() - started

    if (!result.hardwareAccelerated) {
      throw new Error("Direct VideoToolbox batch lost hardware acceleration")
    }
    if (result.frames === 0) {
      throw new Error("Direct VideoToolbox decoder produced no frames")
    }
    if (result.dropped !== 0) {
      throw new Error(`Direct VideoToolbox decoder dropped ${result.dropped} frame(s)`)
    }

    return {
      frames: result.frames,
      width: result.width,
      height: result.height,
      totalMs,
      firstFrameMs: result.firstFrameMs,
      ...summarizeArrivals(result.frameArrivalMs),
      nativePacketParseMs: result.packetParseMs,
      nativeSampleBuildMs: result.sampleBuildMs,
      nativeSubmitMs: result.submitMs,
      nativeWaitMs: result.waitMs,
    }
  } finally {
    decoder.dispose()
  }
}

for (let index = 0; index < warmups; index += 1) {
  runDecode()
}

const runs: DirectDecodeRun[] = []
for (let index = 0; index < iterations; index += 1) {
  runs.push(runDecode())
}

const report: DirectDecodeReport = {
  schemaVersion: 1,
  backend: "videotoolbox-direct",
  generatedAt: new Date().toISOString(),
  workload: {
    codec: "avc",
    fixtureBytes: fixture.byteLength,
    warmups,
    iterations,
  },
  runs,
  verification: {
    packetCount: prepared.packets.length,
    packetPreparationExcludedFromTiming: true,
    directVideoToolbox: true,
    hardwareAccelerationRequired: true,
    oneNativeBatchCallPerRun: true,
    ffmpegInDecodeHotLoop: false,
    nodeAvInDecodeHotLoop: false,
    outputSpacingIsNotPerFrameDecodeLatency: true,
  },
}

console.log(JSON.stringify(report))
