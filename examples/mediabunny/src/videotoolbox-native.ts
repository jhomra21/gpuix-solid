import { createRequire } from "node:module"
import path from "node:path"

export type VideoToolboxCodec = "avc" | "hevc"

export type VideoToolboxPacket = {
  data: Buffer
  timestamp: number
  duration: number
  keyframe: boolean
}

export type VideoToolboxPlane = {
  data: Buffer
  stride: number
  rows: number
}

export type VideoToolboxFrame = {
  readonly width: number
  readonly height: number
  readonly pixelFormat: "NV12" | "BGRA" | null
  readonly fullRange: boolean | null
  readonly iosurfaceHandle: Buffer
  readonly planeCount: number
  copyPlane(index: number): VideoToolboxPlane
  copyRgba(colorSpace?: "srgb" | "display-p3"): Buffer
  close(): void
}

export type VideoToolboxStreamResult = {
  submitted: number
  decoded: number
  delivered: number
  dropped: number
  decodeMs: number
  presentationOrderMonotonic: boolean
  hardwareAccelerated: boolean
  maxPendingFrames: number
}

export type VideoToolboxDecoder = {
  readonly hardwareAccelerated: boolean
  decodeStream(
    packets: VideoToolboxPacket[],
    onFrame: (frame: VideoToolboxFrame, timestampUs: number) => void,
  ): Promise<VideoToolboxStreamResult>
  reset(): void
  dispose(): void
}

type VideoToolboxNativeModule = {
  VideoToolboxVideoDecoder: new (
    codec: VideoToolboxCodec,
    description: Buffer,
  ) => VideoToolboxDecoder
  isVideoToolboxDecoderSupported(
    codec: VideoToolboxCodec,
    description: Buffer,
  ): boolean
}

let cachedNative: VideoToolboxNativeModule | undefined

export function copyDecoderDescription(
  description: AllowSharedBufferSource,
): Buffer {
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

export function loadVideoToolboxNative(): VideoToolboxNativeModule {
  if (process.platform !== "darwin") {
    throw new Error("VideoToolbox native integration requires macOS")
  }
  if (cachedNative) return cachedNative

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
  // SAFETY: this path is built by this repository's node-gyp target and the exported API is exercised by CI smokes.
  cachedNative = require(addonPath) as VideoToolboxNativeModule
  return cachedNative
}
