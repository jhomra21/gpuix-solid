import {
  CustomVideoDecoder,
  EncodedPacket,
  VideoSample,
  registerDecoder,
  type VideoCodec,
} from "mediabunny"
import type {
  Decoder as TurboResDecoder,
  DecoderOptions,
  FilledFrame,
} from "turbores"

type TurboResModule = typeof import("turbores")
type BunProcessVersions = NodeJS.ProcessVersions & { bun?: string }

function isBunRuntime(): boolean {
  // SAFETY: Bun exposes process.versions.bun, while the Node type omits the optional Bun-owned field.
  const versions = process.versions as BunProcessVersions
  return versions.bun !== undefined
}

function parseProResFourCc(codec: string): DecoderOptions["proresFourCc"] | null {
  switch (codec) {
    case "ap4x":
    case "ap4h":
    case "apch":
    case "apcn":
    case "apcs":
    case "apco":
      return codec
    default:
      return null
  }
}

function parseColorPrimaries(value: string | undefined): VideoColorPrimaries | undefined {
  switch (value) {
    case "bt709":
      return "bt709"
    case "bt470bg":
      return "bt470bg"
    case "smpte170m":
      return "smpte170m"
    case "bt2020":
      return "bt2020"
    case "smpte432":
      return "smpte432"
    default:
      return undefined
  }
}

function parseMatrixCoefficients(
  value: string | undefined,
): VideoMatrixCoefficients | undefined {
  switch (value) {
    case "rgb":
      return "rgb"
    case "bt709":
      return "bt709"
    case "bt470bg":
      return "bt470bg"
    case "smpte170m":
      return "smpte170m"
    case "bt2020-ncl":
      return "bt2020-ncl"
    default:
      return undefined
  }
}

function parseTransferCharacteristics(
  value: string | undefined,
): VideoTransferCharacteristics | undefined {
  switch (value) {
    case "bt709":
      return "bt709"
    case "smpte170m":
      return "smpte170m"
    case "linear":
      return "linear"
    case "iec61966-2-1":
      return "iec61966-2-1"
    case "pq":
      return "pq"
    case "hlg":
      return "hlg"
    default:
      return undefined
  }
}

function displaySize(result: FilledFrame) {
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
    const proresFourCc = parseProResFourCc(this.config.codec)
    if (!proresFourCc) {
      throw new Error("BunSafeProResDecoder requires a supported ProRes sample entry")
    }

    const module = await import("turbores")
    const decoder = await module.Decoder.create({
      proresFourCc,
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
      const colorSpace: VideoColorSpaceInit = {
        fullRange: result.colorRangeFull,
      }
      const primaries = parseColorPrimaries(result.colorPrimariesString)
      const matrix = parseMatrixCoefficients(result.colorMatrixString)
      const transfer = parseTransferCharacteristics(result.colorTransferString)
      if (primaries) colorSpace.primaries = primaries
      if (matrix) colorSpace.matrix = matrix
      if (transfer) colorSpace.transfer = transfer

      const sample = new VideoSample(result.frameData, {
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
        colorSpace,
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
