import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  CustomVideoDecoder,
  EncodedPacket,
  VideoSample,
  VideoSampleColorSpace,
  VideoSampleResource,
  registerDecoder,
  type SetRequired,
  type VideoCodec,
  type VideoDataPlane,
  type VideoSampleInit,
  type VideoSamplePixelFormat,
} from "mediabunny"

type NativeVideoCodec = "avc" | "hevc"

type NativePacket = {
  data: Buffer
  timestamp: number
  duration: number
  keyframe: boolean
}

type NativeFramePlane = {
  data: Buffer
  stride: number
  rows: number
}

export type NativeVideoToolboxFrame = {
  readonly width: number
  readonly height: number
  readonly pixelFormat: "NV12" | "BGRA" | null
  readonly fullRange: boolean | null
  readonly iosurfaceHandle: Buffer
  readonly planeCount: number
  copyPlane(index: number): NativeFramePlane
  copyRgba(colorSpace?: "srgb" | "display-p3"): Buffer
  close(): void
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

type NativeDecoder = {
  readonly hardwareAccelerated: boolean
  decodeStream(
    packets: NativePacket[],
    onFrame: (frame: NativeVideoToolboxFrame, timestampUs: number) => void,
    finish?: boolean,
  ): Promise<StreamResult>
  reset(): void
  dispose(): void
}

type NativeModule = {
  VideoToolboxVideoDecoder: new (
    codec: NativeVideoCodec,
    description: Buffer,
  ) => NativeDecoder
  isVideoToolboxDecoderSupported(
    codec: NativeVideoCodec,
    description: Buffer,
  ): boolean
}

const require = createRequire(import.meta.url)
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url))
const addonPath = path.join(
  sourceDirectory,
  "..",
  "native",
  "videotoolbox",
  "build",
  "Release",
  "gpuix_videotoolbox.node",
)

let nativeModule: NativeModule | undefined
function getNativeModule(): NativeModule {
  if (process.platform !== "darwin") {
    throw new Error("VideoToolbox MediaBunny integration requires macOS")
  }

  if (!nativeModule) {
    // SAFETY: this repository builds the N-API target at this exact path and all exported members are checked by use.
    nativeModule = require(addonPath) as NativeModule
  }
  return nativeModule
}

function toBuffer(source: AllowSharedBufferSource): Buffer {
  if (ArrayBuffer.isView(source)) {
    return Buffer.from(
      new Uint8Array(
        source.buffer,
        source.byteOffset,
        source.byteLength,
      ),
    )
  }
  return Buffer.from(new Uint8Array(source))
}

function isNativeCodec(codec: VideoCodec): codec is NativeVideoCodec {
  return codec === "avc" || codec === "hevc"
}

export class VideoToolboxVideoSampleResource extends VideoSampleResource {
  #frame: NativeVideoToolboxFrame | null
  #colorSpace: VideoSampleColorSpace
  #squarePixelWidth: number
  #squarePixelHeight: number

  constructor(
    frame: NativeVideoToolboxFrame,
    config: VideoDecoderConfig,
  ) {
    super()
    this.#frame = frame
    const fullRange = config.colorSpace?.fullRange ?? frame.fullRange
    this.#colorSpace = new VideoSampleColorSpace({
      ...config.colorSpace,
      ...(fullRange === null || fullRange === undefined ? {} : { fullRange }),
    })
    this.#squarePixelWidth = config.displayAspectWidth ?? frame.width
    this.#squarePixelHeight = config.displayAspectHeight ?? frame.height
  }

  get frame(): NativeVideoToolboxFrame {
    if (!this.#frame) {
      throw new Error("VideoToolboxVideoSampleResource is closed")
    }
    return this.#frame
  }

  get iosurfaceHandle(): Buffer {
    return this.frame.iosurfaceHandle
  }

  getFormat(): VideoSamplePixelFormat | null {
    return this.frame.pixelFormat
  }

  getCodedWidth(): number {
    return this.frame.width
  }

  getCodedHeight(): number {
    return this.frame.height
  }

  getSquarePixelWidth(): number {
    return this.#squarePixelWidth
  }

  getSquarePixelHeight(): number {
    return this.#squarePixelHeight
  }

  getColorSpace(): VideoSampleColorSpace {
    return this.#colorSpace
  }

  close(): void {
    this.#frame?.close()
    this.#frame = null
  }

  getDataPlanes(): VideoDataPlane[] {
    if (!this.frame.pixelFormat) {
      throw new Error(
        "This VideoToolbox pixel format has no direct MediaBunny plane mapping; convert the sample to RGB instead",
      )
    }

    const planes: VideoDataPlane[] = []
    for (let index = 0; index < this.frame.planeCount; index += 1) {
      const plane = this.frame.copyPlane(index)
      planes.push({
        data: plane.data,
        stride: plane.stride,
      })
    }
    return planes
  }

  toRgbSample(
    init: SetRequired<VideoSampleInit, "timestamp">,
    colorSpace: PredefinedColorSpace,
  ): VideoSample {
    const nativeColorSpace = colorSpace === "display-p3"
      ? "display-p3"
      : "srgb"
    const rgba = this.frame.copyRgba(nativeColorSpace)

    return new VideoSample(rgba, {
      ...init,
      format: "RGBA",
      codedWidth: this.frame.width,
      codedHeight: this.frame.height,
    })
  }
}

type VideoSampleInternals = VideoSample & {
  _data: unknown
}

export function getVideoToolboxVideoSampleResource(
  sample: VideoSample,
): VideoToolboxVideoSampleResource | null {
  // SAFETY: MediaBunny 1.59 stores a custom VideoSampleResource directly in _data,
  // and clone() preserves that resource. We only inspect it with instanceof.
  const data = (sample as VideoSampleInternals)._data
  return data instanceof VideoToolboxVideoSampleResource ? data : null
}

type PacketTiming = {
  timestamp: number
  duration: number
}

export class VideoToolboxMediaDecoder extends CustomVideoDecoder {
  static override supports(
    codec: VideoCodec,
    config: VideoDecoderConfig,
  ): boolean {
    if (
      process.platform !== "darwin"
      || !isNativeCodec(codec)
      || !config.description
    ) {
      return false
    }

    try {
      return getNativeModule().isVideoToolboxDecoderSupported(
        codec,
        toBuffer(config.description),
      )
    } catch {
      return false
    }
  }

  #decoder: NativeDecoder | null = null
  #packetBuffer: NativePacket[] = []
  #timings = new Map<number, PacketTiming[]>()
  #lastTimestampUs = -Infinity
  #closed = false
  readonly #packetBatchSize = 8

  init(): void {
    if (!isNativeCodec(this.codec) || !this.config.description) {
      throw new Error("VideoToolboxMediaDecoder requires AVC or HEVC decoder configuration")
    }

    this.#decoder = new (getNativeModule().VideoToolboxVideoDecoder)(
      this.codec,
      toBuffer(this.config.description),
    )

    if (!this.#decoder.hardwareAccelerated) {
      this.#decoder.dispose()
      this.#decoder = null
      throw new Error("VideoToolboxMediaDecoder could not create a hardware decoder")
    }
  }

  async decode(packet: EncodedPacket): Promise<void> {
    this.#assertOpen()

    const timestampUs = packet.microsecondTimestamp
    const timings = this.#timings.get(timestampUs) ?? []
    timings.push({
      timestamp: packet.timestamp,
      duration: packet.duration,
    })
    this.#timings.set(timestampUs, timings)

    this.#packetBuffer.push({
      data: Buffer.from(packet.data),
      timestamp: timestampUs,
      duration: packet.microsecondDuration,
      keyframe: packet.type === "key",
    })

    if (this.#packetBuffer.length >= this.#packetBatchSize) {
      await this.#drain(false)
    }
  }

  async flush(): Promise<void> {
    this.#assertOpen()
    await this.#drain(true)
    this.#decoder?.reset()
    this.#timings.clear()
    this.#lastTimestampUs = -Infinity
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true
    this.#packetBuffer.length = 0
    this.#timings.clear()
    this.#decoder?.dispose()
    this.#decoder = null
  }

  async #drain(finish: boolean): Promise<void> {
    if (this.#packetBuffer.length === 0 && !finish) return

    const decoder = this.#decoder
    if (!decoder) {
      throw new Error("VideoToolboxMediaDecoder is not initialized")
    }

    const packets = this.#packetBuffer.splice(0)
    const outputs: { frame: NativeVideoToolboxFrame; timestampUs: number }[] = []
    const result = await decoder.decodeStream(
      packets,
      (frame, timestampUs) => {
        outputs.push({ frame, timestampUs })
      },
      finish,
    )

    if (!result.hardwareAccelerated) {
      for (const output of outputs) output.frame.close()
      throw new Error("VideoToolbox stream lost hardware acceleration")
    }
    if (result.dropped !== 0) {
      for (const output of outputs) output.frame.close()
      throw new Error("VideoToolbox stream dropped " + result.dropped + " frame(s)")
    }
    outputs.sort((left, right) => left.timestampUs - right.timestampUs)

    for (let index = 0; index < outputs.length; index += 1) {
      const output = outputs[index]
      if (!output) continue

      if (output.timestampUs < this.#lastTimestampUs) {
        for (let closeIndex = index; closeIndex < outputs.length; closeIndex += 1) {
          outputs[closeIndex]?.frame.close()
        }
        throw new Error(
          "VideoToolbox stream crossed a MediaBunny batch boundary out of presentation order",
        )
      }

      this.#lastTimestampUs = output.timestampUs
      try {
        this.#emitFrame(output.frame, output.timestampUs)
      } catch (error) {
        for (let closeIndex = index + 1; closeIndex < outputs.length; closeIndex += 1) {
          outputs[closeIndex]?.frame.close()
        }
        throw error
      }
    }
  }

  #emitFrame(frame: NativeVideoToolboxFrame, timestampUs: number): void {
    const timings = this.#timings.get(timestampUs)
    const timing = timings?.shift()
    if (timings?.length === 0) this.#timings.delete(timestampUs)

    const timestamp = timing?.timestamp ?? timestampUs / 1_000_000
    const duration = timing?.duration ?? 0
    const resource = new VideoToolboxVideoSampleResource(frame, this.config)
    const sample = new VideoSample(resource, {
      timestamp,
      duration,
    })
    try {
      this.onSample(sample)
    } catch (error) {
      sample.close()
      throw error
    }
  }

  #assertOpen(): void {
    if (this.#closed || !this.#decoder) {
      throw new Error("VideoToolboxMediaDecoder is closed")
    }
  }
}

let registered = false

export function registerVideoToolboxMediaDecoder(): boolean {
  if (registered) return process.platform === "darwin"
  if (process.platform !== "darwin") return false

  registerDecoder(VideoToolboxMediaDecoder)
  registered = true
  return true
}
