import { createRequire } from "node:module"
import path from "node:path"
import {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} from "mediabunny"

if (process.platform !== "darwin") {
  console.log("Direct VideoToolbox stream smoke skipped: macOS only")
  process.exit(0)
}

type NativeVideoCodec = "avc" | "hevc"

type PacketInput = {
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

type NativeFramePlane = {
  data: Buffer
  stride: number
  rows: number
}

type NativeFrame = {
  readonly width: number
  readonly height: number
  readonly pixelFormat: "NV12" | "BGRA" | null
  readonly fullRange: boolean | null
  readonly iosurfaceHandle: Buffer
  readonly planeCount: number
  copyPlane(index: number): NativeFramePlane
  copyRgba(): Buffer
  close(): void
}

type Decoder = {
  readonly hardwareAccelerated: boolean
  decodeStream(
    packets: PacketInput[],
    onFrame: (frame: NativeFrame, timestampUs: number) => void,
  ): Promise<StreamResult>
  dispose(): void
}

type NativeModule = {
  VideoToolboxVideoDecoder: new (
    codec: NativeVideoCodec,
    description: Buffer,
  ) => Decoder
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
  if (!track) throw new Error("Stream smoke fixture has no video track")
  const codec = await track.getCodec()
  if (codec !== "avc" && codec !== "hevc") {
    throw new Error(`Stream smoke does not support ${codec}`)
  }

  const config = await track.getDecoderConfig()
  if (!config?.description) {
    throw new Error(`Stream smoke ${codec.toUpperCase()} track has no decoder configuration`)
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

  const decoder = new native.VideoToolboxVideoDecoder(codec, description)
  try {
    if (!decoder.hardwareAccelerated) {
      throw new Error("Stream smoke decoder is not hardware accelerated")
    }

    let callbacks = 0
    let handleBytes = 0
    let planeBytes = 0
    let rgbaBytes = 0
    let previousTimestamp = -Infinity
    let callbackOrderMonotonic = true

    const result = await decoder.decodeStream(
      packets,
      (frame, timestampUs) => {
        try {
          const handle = frame.iosurfaceHandle
          if (!Buffer.isBuffer(handle) || handle.byteLength === 0) {
            throw new Error("Stream smoke received an invalid IOSurface handle")
          }
          if (frame.width <= 0 || frame.height <= 0 || frame.planeCount <= 0) {
            throw new Error("Stream smoke received invalid frame geometry")
          }

          if (callbacks === 0) {
            const plane = frame.copyPlane(0)
            if (
              !Buffer.isBuffer(plane.data)
              || plane.data.byteLength === 0
              || plane.stride <= 0
              || plane.rows <= 0
            ) {
              throw new Error("Stream smoke could not copy the native frame plane")
            }
            planeBytes = plane.data.byteLength

            const rgba = frame.copyRgba()
            if (
              !Buffer.isBuffer(rgba)
              || rgba.byteLength !== frame.width * frame.height * 4
            ) {
              throw new Error("Stream smoke could not convert the native frame to RGBA")
            }
            rgbaBytes = rgba.byteLength
          }

          if (timestampUs < previousTimestamp) callbackOrderMonotonic = false
          previousTimestamp = timestampUs
          callbacks += 1
          handleBytes = handle.byteLength
        } finally {
          frame.close()
        }
      },
    )

    if (!result.hardwareAccelerated) {
      throw new Error("Stream smoke lost hardware acceleration")
    }
    if (result.dropped !== 0) {
      throw new Error(`Stream smoke dropped ${result.dropped} frame(s)`)
    }
    if (
      result.submitted !== packets.length
      || result.decoded !== packets.length
      || result.delivered !== packets.length
      || callbacks !== packets.length
    ) {
      throw new Error(
        `Stream smoke count mismatch packets=${packets.length} submitted=${result.submitted} decoded=${result.decoded} delivered=${result.delivered} callbacks=${callbacks}`,
      )
    }
    if (!result.presentationOrderMonotonic || !callbackOrderMonotonic) {
      throw new Error("Stream smoke frame presentation order was not monotonic")
    }
    if (result.maxPendingFrames !== 2) {
      throw new Error(
        `Stream smoke expected maxPendingFrames=2, got ${result.maxPendingFrames}`,
      )
    }

    let failureCallbacks = 0
    let rejectedAsExpected = false
    try {
      await decoder.decodeStream(
        packets,
        (frame) => {
          frame.close()
          failureCallbacks += 1
          if (failureCallbacks === 2) {
            throw new Error("intentional stream smoke callback failure")
          }
        },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      rejectedAsExpected = message.includes("intentional stream smoke callback failure")
    }
    if (!rejectedAsExpected) {
      throw new Error("Stream smoke callback failure did not reject as expected")
    }

    let recoveryCallbacks = 0
    const recovery = await decoder.decodeStream(
      packets,
      (frame) => {
        frame.close()
        recoveryCallbacks += 1
      },
    )
    if (
      recoveryCallbacks !== packets.length
      || recovery.delivered !== packets.length
      || recovery.dropped !== 0
    ) {
      throw new Error(
        `Stream smoke did not recover after callback failure callbacks=${recoveryCallbacks} delivered=${recovery.delivered} dropped=${recovery.dropped}`,
      )
    }

    console.log(
      JSON.stringify({
        codec,
        packets: packets.length,
        callbacks,
        handleBytes,
        planeBytes,
        rgbaBytes,
        decodeMs: result.decodeMs,
        hardwareAccelerated: result.hardwareAccelerated,
        maxPendingFrames: result.maxPendingFrames,
        presentationOrderMonotonic: result.presentationOrderMonotonic,
        callbackFailureRejected: rejectedAsExpected,
        recoveryCallbacks,
      }),
    )
  } finally {
    decoder.dispose()
  }
} finally {
  input.dispose()
}
