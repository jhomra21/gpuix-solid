import { createRequire } from "node:module"
import path from "node:path"
import {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} from "mediabunny"

if (process.platform !== "darwin") {
  console.log("Direct VideoToolbox capture smoke skipped: macOS only")
  process.exit(0)
}

type PacketInput = {
  data: Buffer
  timestamp: number
  duration: number
  keyframe: boolean
}

type BatchResult = {
  frames: number
  dropped: number
  frameHandles?: Buffer[]
  hardwareAccelerated: boolean
}

type Decoder = {
  readonly hardwareAccelerated: boolean
  decodeBatch(
    packets: PacketInput[],
    captureFrames?: boolean,
  ): BatchResult
  releaseFrames(): number
  dispose(): void
}

type NativeModule = {
  VideoToolboxH264Decoder: new (description: Buffer) => Decoder
}

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

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
// SAFETY: this repository builds the expected addon at this path.
const native = require(addonPath) as NativeModule

const input = new Input({
  source: new BufferSource(fixture),
  formats: ALL_FORMATS,
})

try {
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error("Capture smoke fixture has no video track")
  if (await track.getCodec() !== "avc") {
    throw new Error("Capture smoke requires AVC")
  }

  const config = await track.getDecoderConfig()
  if (!config?.description) {
    throw new Error("Capture smoke AVC track has no decoder configuration")
  }

  const description = ArrayBuffer.isView(config.description)
    ? Buffer.from(
        new Uint8Array(
          config.description.buffer,
          config.description.byteOffset,
          config.description.byteLength,
        ),
      )
    : Buffer.from(new Uint8Array(config.description))

  const packets: PacketInput[] = []
  const sink = new EncodedPacketSink(track)
  for await (const packet of sink.packets()) {
    packets.push({
      data: Buffer.from(packet.data),
      timestamp: Math.round(packet.microsecondTimestamp),
      duration: Math.round(packet.microsecondDuration),
      keyframe: packet.type === "key",
    })
  }

  const decoder = new native.VideoToolboxH264Decoder(description)
  try {
    if (!decoder.hardwareAccelerated) {
      throw new Error("Capture smoke decoder is not hardware accelerated")
    }

    const result = decoder.decodeBatch(packets, true)
    if (!result.hardwareAccelerated) {
      throw new Error("Capture smoke batch lost hardware acceleration")
    }
    if (result.dropped !== 0) {
      throw new Error(`Capture smoke dropped ${result.dropped} frame(s)`)
    }
    if (result.frames === 0) {
      throw new Error("Capture smoke produced no frames")
    }

    const handles = result.frameHandles ?? []
    if (handles.length !== result.frames) {
      throw new Error(
        `Capture smoke returned ${handles.length} handles for ${result.frames} frame(s)`,
      )
    }
    if (handles.some((handle) => !Buffer.isBuffer(handle) || handle.byteLength === 0)) {
      throw new Error("Capture smoke returned an invalid IOSurface handle")
    }

    const released = decoder.releaseFrames()
    if (released !== handles.length) {
      throw new Error(
        `Capture smoke released ${released} frame(s), expected ${handles.length}`,
      )
    }
    if (decoder.releaseFrames() !== 0) {
      throw new Error("Capture smoke second release was not empty")
    }

    console.log(
      JSON.stringify({
        frames: result.frames,
        handleBytes: handles[0]?.byteLength ?? 0,
        hardwareAccelerated: result.hardwareAccelerated,
        released,
      }),
    )
  } finally {
    decoder.dispose()
  }
} finally {
  input.dispose()
}
