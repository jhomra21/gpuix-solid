import { ImageData, createCanvas } from "@napi-rs/canvas"
import { VideoSample, registerVideoSampleTransformer } from "mediabunny"

type NapiCanvas = ReturnType<typeof createCanvas>

function drawResized(source: NapiCanvas, width: number, height: number): NapiCanvas {
  if (source.width === width && source.height === height) return source

  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")
  context.drawImage(source, 0, 0, width, height)
  return canvas
}

function drawRotated(source: NapiCanvas, rotation: 0 | 90 | 180 | 270): NapiCanvas {
  if (rotation === 0) return source

  const width = rotation % 180 === 0 ? source.width : source.height
  const height = rotation % 180 === 0 ? source.height : source.width
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")

  if (rotation === 90) {
    context.translate(width, 0)
    context.rotate(Math.PI / 2)
  } else if (rotation === 180) {
    context.translate(width, height)
    context.rotate(Math.PI)
  } else {
    context.translate(0, height)
    context.rotate(-Math.PI / 2)
  }

  context.drawImage(source, 0, 0)
  return canvas
}

function drawFlipped(source: NapiCanvas): NapiCanvas {
  const canvas = createCanvas(source.width, source.height)
  const context = canvas.getContext("2d")
  context.translate(source.width, 0)
  context.scale(-1, 1)
  context.drawImage(source, 0, 0)
  return canvas
}

function drawCropped(
  source: NapiCanvas,
  crop: { left: number; top: number; width: number; height: number },
): NapiCanvas {
  const width = Math.max(1, Math.round(crop.width))
  const height = Math.max(1, Math.round(crop.height))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")
  context.drawImage(
    source,
    crop.left,
    crop.top,
    crop.width,
    crop.height,
    0,
    0,
    width,
    height,
  )
  return canvas
}

function drawFitted(
  source: NapiCanvas,
  width: number,
  height: number,
  fit: "fill" | "contain" | "cover",
  discardAlpha: boolean,
): NapiCanvas {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext("2d")

  if (discardAlpha) {
    context.fillStyle = "black"
    context.fillRect(0, 0, width, height)
  }

  if (fit === "fill") {
    context.drawImage(source, 0, 0, width, height)
    return canvas
  }

  const scale = fit === "contain"
    ? Math.min(width / source.width, height / source.height)
    : Math.max(width / source.width, height / source.height)
  const drawWidth = source.width * scale
  const drawHeight = source.height * scale
  const x = (width - drawWidth) / 2
  const y = (height - drawHeight) / 2

  context.drawImage(source, x, y, drawWidth, drawHeight)
  return canvas
}

async function sampleToCanvas(sample: VideoSample): Promise<NapiCanvas | null> {
  if (sample.format === null) return null

  const bytes = new Uint8Array(sample.allocationSize({ format: "RGBA" }))
  await sample.copyTo(bytes, { format: "RGBA" })

  const canvas = createCanvas(sample.codedWidth, sample.codedHeight)
  const context = canvas.getContext("2d")
  const pixels = new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  context.putImageData(new ImageData(pixels, sample.codedWidth, sample.codedHeight), 0, 0)
  return canvas
}

export function registerNapiVideoSampleTransformer(): void {
  registerVideoSampleTransformer(async (sample, description) => {
    let canvas = await sampleToCanvas(sample)
    if (!canvas) return null

    canvas = drawResized(canvas, sample.squarePixelWidth, sample.squarePixelHeight)
    canvas = drawRotated(canvas, description.rotation)
    if (description.flip) canvas = drawFlipped(canvas)
    canvas = drawCropped(canvas, description.crop)
    canvas = drawFitted(
      canvas,
      description.width,
      description.height,
      description.fit,
      description.alpha === "discard",
    )

    const context = canvas.getContext("2d")
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)

    return new VideoSample(bytes, {
      format: "RGBA",
      codedWidth: canvas.width,
      codedHeight: canvas.height,
      timestamp: sample.timestamp,
      duration: sample.duration,
      rotation: 0,
      flip: false,
    })
  })
}
