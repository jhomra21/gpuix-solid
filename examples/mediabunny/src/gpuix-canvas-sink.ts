import { Canvas, ImageData } from "@napi-rs/canvas"
import {
  CanvasSink,
  type VideoSample,
  type VideoSampleSink,
} from "mediabunny"

type CanvasLike = InstanceType<typeof Canvas>

type CanvasSinkInternals = {
  _alpha: boolean
  _width: number
  _height: number
  _fit: "fill" | "contain" | "cover"
  _rotation: 0 | 90 | 180 | 270
  _flip: boolean
  _crop?: { left: number; top: number; width: number; height: number }
  _canvasPool: (CanvasLike | null)[]
  _nextCanvasIndex: number
  _videoSampleSink: VideoSampleSink
  _ensureInit(): Promise<void>
}

type WrappedNapiCanvas = {
  canvas: CanvasLike
  timestamp: number
  duration: number
}

let installed = false

function nextCanvas(sink: CanvasSinkInternals): CanvasLike {
  let canvas = sink._canvasPool[sink._nextCanvasIndex]
  if (!canvas) {
    canvas = new Canvas(sink._width, sink._height)
    if (sink._canvasPool.length > 0) {
      sink._canvasPool[sink._nextCanvasIndex] = canvas
    }
  } else if (canvas.width !== sink._width || canvas.height !== sink._height) {
    canvas.width = sink._width
    canvas.height = sink._height
  }

  if (sink._canvasPool.length > 0) {
    sink._nextCanvasIndex = (sink._nextCanvasIndex + 1) % sink._canvasPool.length
  }

  return canvas
}

async function renderSample(
  sink: CanvasSinkInternals,
  sample: VideoSample,
): Promise<WrappedNapiCanvas> {
  let transformed: VideoSample | null = null
  try {
    transformed = await sample.transform({
      width: sink._width,
      height: sink._height,
      fit: sink._fit,
      rotation: sink._rotation,
      flip: sink._flip,
      crop: sink._crop,
      alpha: sink._alpha ? "keep" : "discard",
    })
  } finally {
    sample.close()
  }

  if (!transformed) {
    throw new Error("GPUix CanvasSink bridge could not transform the video sample")
  }

  try {
    const bytes = new Uint8Array(
      transformed.allocationSize({ format: "RGBA" }),
    )
    await transformed.copyTo(bytes, { format: "RGBA" })

    const canvas = nextCanvas(sink)
    const context = canvas.getContext("2d")
    const pixels = new Uint8ClampedArray(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    )
    context.putImageData(
      new ImageData(pixels, sink._width, sink._height),
      0,
      0,
    )

    return {
      canvas,
      timestamp: transformed.timestamp,
      duration: transformed.duration,
    }
  } finally {
    transformed.close()
  }
}

export function installGpuixCanvasSinkBridge(): void {
  if (installed) return
  installed = true

  Object.defineProperty(CanvasSink.prototype, "getCanvas", {
    configurable: true,
    writable: true,
    async value(
      this: CanvasSink,
      timestamp: number,
      options?: Parameters<CanvasSink["getCanvas"]>[1],
    ) {
      const sink = this as unknown as CanvasSinkInternals
      await sink._ensureInit()
      const sample = await sink._videoSampleSink.getSample(timestamp, options)
      return sample ? renderSample(sink, sample) : null
    },
  })

  Object.defineProperty(CanvasSink.prototype, "canvases", {
    configurable: true,
    writable: true,
    async *value(
      this: CanvasSink,
      startTimestamp?: number,
      endTimestamp?: number,
      options?: Parameters<CanvasSink["canvases"]>[2],
    ) {
      const sink = this as unknown as CanvasSinkInternals
      await sink._ensureInit()
      for await (
        const sample of sink._videoSampleSink.samples(
          startTimestamp,
          endTimestamp,
          options,
        )
      ) {
        yield await renderSample(sink, sample)
      }
    },
  })

  Object.defineProperty(CanvasSink.prototype, "canvasesAtTimestamps", {
    configurable: true,
    writable: true,
    async *value(
      this: CanvasSink,
      timestamps: Parameters<CanvasSink["canvasesAtTimestamps"]>[0],
      options?: Parameters<CanvasSink["canvasesAtTimestamps"]>[1],
    ) {
      const sink = this as unknown as CanvasSinkInternals
      await sink._ensureInit()
      for await (
        const sample of sink._videoSampleSink.samplesAtTimestamps(
          timestamps,
          options,
        )
      ) {
        yield sample ? await renderSample(sink, sample) : null
      }
    },
  })
}
