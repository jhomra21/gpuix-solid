import {
  CustomVideoDecoder,
  EncodedPacket,
  VideoSample,
  registerDecoder,
  type VideoCodec,
} from "mediabunny"
import type {
  Decoder as TurboResDecoder,
  FilledFrame,
} from "turbores"

type TurboResModule = typeof import("turbores")

function isBunRuntime(): boolean {
  return typeof process !== "undefined"
    && typeof (process.versions as NodeJS.ProcessVersions & { bun?: string }).bun === "string"
}

function displaySize(result: FilledFrame): {
  width: number
  height: number
} {
  const ratio = result.pixelAspectRatio
  if (ratio.num > ratio.den) {
    return {
      width: Math.round(result.visibleWidth * ratio.num / ratio.den),
      height: result.visibleHeight,
    }
  }

  return {
    width: result.visibleWidth,
    height: Math.round(result.visibleHeight * ratio.den / ratio.num),
  }
}

export class BunSafeProResDecoder extends CustomVideoDecoder {
  static override supports(
    codec: VideoCodec,
    _config: VideoDecoderConfig,
  ): boolean {
    return codec === "prores" && isBunRuntime()
  }

  #module: TurboResModule | null = null
  #decoder: TurboResDecoder | null = null

  async init(): Promise<void> {
    const module = await import("turbores")
    const decoder = await module.Decoder.create({
      proresFourCc: this.config.codec as Parameters<typeof module.Decoder.create>[0]["proresFourCc"],
      useSharedMemory: false,
      concurrency: 0,
    })

    if (decoder instanceof Error) throw decoder
    this.#module = module
    this.#decoder = decoder
  }

  async decode(packet: EncodedPacket): Promise<void> {
    if (!this.#decoder || !this.#module) {
      throw new Error("BunSafeProResDecoder is not initialized")
    }

    const frame = new this.#module.Frame()
    try {
      const result = await this.#decoder.decode(packet.data, frame)
      if (result instanceof Error) throw result

      const display = displaySize(result)
      const bytes = result.frameData.slice()
      const sample = new VideoSample(bytes, {
        format: result.pixelFormat,
        codedWidth: result.codedWidth,
        codedHeight: result.codedHeight,
        displayWidth: display.width,
        displayHeight: display.height,
        visibleRect: {
          left: 0,
          top: 0,
          width: result.visibleWidth,
          height: result.visibleHeight,
        },
        timestamp: packet.timestamp,
        duration: packet.duration,
        colorSpace: {
          primaries: result.colorPrimariesString as VideoColorPrimaries | undefined,
          matrix: result.colorMatrixString as VideoMatrixCoefficients | undefined,
          transfer: result.colorTransferString as VideoTransferCharacteristics | undefined,
          fullRange: result.colorRangeFull,
        },
      })

      try {
        this.onSample(sample)
      } catch (error) {
        sample.close()
        throw error
      }
    } finally {
      frame.clear()
    }
  }

  flush(): void {}

  async close(): Promise<void> {
    const decoder = this.#decoder
    this.#decoder = null
    this.#module = null
    if (decoder) await decoder.close()
  }
}

let registered = false

export function registerBunSafeProResDecoder(): boolean {
  if (registered) return isBunRuntime()
  if (!isBunRuntime()) return false

  registerDecoder(BunSafeProResDecoder)
  registered = true
  return true
}
