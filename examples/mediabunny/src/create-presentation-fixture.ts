await import("@mediabunny/server")

const { registerMediabunnyServer } = await import("@mediabunny/server")
registerMediabunnyServer()

const {
  BufferTarget,
  Output,
  Quality,
  VideoSample,
  Mp4OutputFormat,
  VideoSampleSource,
  WebMOutputFormat,
} = await import("mediabunny")

const outputPath = process.argv[2]
if (!outputPath) throw new Error("Expected an output path for the presentation fixture")

const width = Number(process.env.MEDIABUNNY_PRESENTATION_WIDTH ?? 1280)
const height = Number(process.env.MEDIABUNNY_PRESENTATION_HEIGHT ?? 720)
const frameRate = Number(process.env.MEDIABUNNY_PRESENTATION_FPS ?? 30)
const frameCount = Number(process.env.MEDIABUNNY_PRESENTATION_FRAMES ?? 60)
const requestedCodec = process.env.MEDIABUNNY_PRESENTATION_CODEC ?? "vp8"
const codec = requestedCodec === "avc" || requestedCodec === "hevc"
  ? requestedCodec
  : "vp8"

if (![width, height, frameRate, frameCount].every((value) => Number.isInteger(value) && value > 0)) {
  throw new Error("Presentation fixture dimensions, frame rate, and frame count must be positive integers")
}

function makeFrame(index: number) {
  const bytes = new Uint8Array(width * height * 4)
  const phase = index / Math.max(1, frameCount - 1)
  const stripeWidth = Math.max(16, Math.floor(width / 12))
  const stripeStart = Math.round((width - stripeWidth) * phase)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      bytes[offset] = Math.round(255 * x / Math.max(1, width - 1))
      bytes[offset + 1] = Math.round(255 * y / Math.max(1, height - 1))
      bytes[offset + 2] = Math.round(255 * phase)
      bytes[offset + 3] = 255

      if (x >= stripeStart && x < stripeStart + stripeWidth && y > height * 0.2 && y < height * 0.8) {
        bytes[offset] = 255
        bytes[offset + 1] = 255
        bytes[offset + 2] = 255
      }
    }
  }

  return new VideoSample(bytes, {
    format: "RGBA",
    codedWidth: width,
    codedHeight: height,
    timestamp: index / frameRate,
    duration: 1 / frameRate,
  })
}

const target = new BufferTarget()
const output = new Output({
  format: codec === "vp8" ? new WebMOutputFormat() : new Mp4OutputFormat(),
  target,
})
const source = new VideoSampleSource({
  codec,
  quality: new Quality({ bitrate: 4_000_000 }),
})
output.addVideoTrack(source, { frameRate })

await output.start()
for (let index = 0; index < frameCount; index += 1) {
  const sample = makeFrame(index)
  try {
    await source.add(sample)
  } finally {
    sample.close()
  }
}
source.close()
await output.finalize()

if (!target.buffer || target.buffer.byteLength === 0) {
  throw new Error("Presentation fixture encoder produced no bytes")
}

await Bun.write(outputPath, target.buffer)
