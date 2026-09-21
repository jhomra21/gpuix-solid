import fs from "node:fs"
import os from "node:os"
import path from "node:path"

await import("@napi-rs/webcodecs/polyfill")

const { installNapiCanvasGlobals } = await import("./napi-canvas-globals.ts")
installNapiCanvasGlobals()

const { registerNapiVideoSampleTransformer } = await import("./napi-video-transformer.ts")
registerNapiVideoSampleTransformer()

const {
  ALL_FORMATS,
  BufferSource,
  BufferTarget,
  Input,
  Output,
  Quality,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  WebMOutputFormat,
} = await import("mediabunny")

const { createElement, setProp } = await import("../../../packages/solid/src/host/universal.ts")
const {
  createTestRoot,
  hasNativeTestRenderer,
} = await import("../../../packages/solid/src/testing.ts")
const { createMediaBunnyLiveLayout } = await import("./live-layout.ts")

const WIDTH = 160
const HEIGHT = 90
const FRAME_RATE = 2

function makeFrame(index: number) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4)
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4
      const horizontal = Math.round(255 * x / Math.max(1, WIDTH - 1))
      const vertical = Math.round(255 * y / Math.max(1, HEIGHT - 1))
      if (index === 0) {
        data[offset] = 220
        data[offset + 1] = horizontal
        data[offset + 2] = Math.round(vertical / 4)
      } else {
        data[offset] = Math.round(horizontal / 4)
        data[offset + 1] = vertical
        data[offset + 2] = 220
      }
      data[offset + 3] = 255
    }
  }

  return new VideoSample(data, {
    format: "RGBA",
    codedWidth: WIDTH,
    codedHeight: HEIGHT,
    timestamp: index / FRAME_RATE,
    duration: 1 / FRAME_RATE,
  })
}

async function encodeFixture(): Promise<ArrayBuffer> {
  const target = new BufferTarget()
  const output = new Output({
    format: new WebMOutputFormat(),
    target,
  })
  const source = new VideoSampleSource({
    codec: "vp8",
    quality: new Quality({ bitrate: 600_000 }),
  })

  output.addVideoTrack(source, { frameRate: FRAME_RATE })
  await output.start()
  for (let index = 0; index < 2; index += 1) {
    const sample = makeFrame(index)
    try {
      await source.add(sample)
    } finally {
      sample.close()
    }
  }
  await output.finalize()

  if (!target.buffer || target.buffer.byteLength === 0) {
    throw new Error("MediaBunny VP8 fixture encoded no bytes")
  }
  return target.buffer
}

async function copyBgra(sample: InstanceType<typeof VideoSample>) {
  const options = { format: "BGRA" as const }
  const bytes = new Uint8Array(sample.allocationSize(options))
  await sample.copyTo(bytes, options)
  if (bytes.byteLength !== sample.codedWidth * sample.codedHeight * 4) {
    throw new Error(
      `MediaBunny BGRA copy had ${bytes.byteLength} bytes for ${sample.codedWidth}x${sample.codedHeight}`,
    )
  }
  return {
    data: bytes,
    width: sample.codedWidth,
    height: sample.codedHeight,
  }
}

function screenshotPath(name: string): string {
  const file = path.join(os.tmpdir(), `gpuix-mediabunny-${process.pid}-${name}.png`)
  fs.rmSync(file, { force: true })
  return file
}

if (!hasNativeTestRenderer) {
  throw new Error("MediaBunny GPUix dogfood requires source-edge TestGpuixRenderer")
}

const encoded = await encodeFixture()
const input = new Input({
  source: new BufferSource(encoded),
  formats: ALL_FORMATS,
})

let first: InstanceType<typeof VideoSample> | null = null
let second: InstanceType<typeof VideoSample> | null = null
let testRoot: ReturnType<typeof createTestRoot> | undefined

try {
  if (!(await input.canRead())) throw new Error("MediaBunny cannot read its VP8 dogfood fixture")
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error("MediaBunny dogfood fixture has no video track")

  const sink = new VideoSampleSink(track)
  first = await sink.getSample(0)
  second = await sink.getSample(1 / FRAME_RATE)
  if (!first || !second) throw new Error("MediaBunny did not decode both dogfood frames")

  const firstFrame = await copyBgra(first)
  const secondFrame = await copyBgra(second)
  if (firstFrame.data.every((value, index) => value === secondFrame.data[index])) {
    throw new Error("MediaBunny decoded frames were unexpectedly identical")
  }

  testRoot = createTestRoot(240, 160)
  if (testRoot.renderer.getVideoFrameSurfaceVersion() !== 1) {
    throw new Error("GPUix binary video-frame surface v1 is unavailable")
  }

  const surface = createElement("video-frame")
  if (surface.kind !== "element") throw new Error("video-frame host did not create an element")
  setProp(surface, "style", { width: 200, height: 112 })
  setProp(surface, "objectFit", "contain")
  setProp(surface, "alt", "MediaBunny decoded frame")
  setProp(surface, "frame", firstFrame)

  testRoot.render(() => surface)
  testRoot.renderer.flush()

  const firstPath = screenshotPath("first")
  testRoot.renderer.captureScreenshot(firstPath)
  const firstScreenshot = fs.readFileSync(firstPath)
  if (firstScreenshot.byteLength === 0) throw new Error("First GPUix frame screenshot was empty")

  setProp(surface, "frame", secondFrame)
  testRoot.renderer.flush()

  const secondPath = screenshotPath("second")
  testRoot.renderer.captureScreenshot(secondPath)
  const secondScreenshot = fs.readFileSync(secondPath)
  if (secondScreenshot.byteLength === 0) throw new Error("Second GPUix frame screenshot was empty")
  if (firstScreenshot.equals(secondScreenshot)) {
    throw new Error("GPUix native surface did not repaint the second MediaBunny frame")
  }

  const layoutRoot = createTestRoot(1180, 620)
  try {
    const layout = createMediaBunnyLiveLayout(firstFrame)
    layoutRoot.render(() => layout.root)

    const bounds = layout.surfaces.map((surface) => {
      const value = layoutRoot.renderer.getElementBounds(surface.id)
      if (!value || value.length < 4) {
        throw new Error(`Missing live layout bounds for video-frame ${surface.id}`)
      }
      const [x, y, width, height] = value
      if (x === undefined || y === undefined || width === undefined || height === undefined) {
        throw new Error(`Incomplete live layout bounds for video-frame ${surface.id}`)
      }
      return { x, y, width, height }
    })

    for (const bound of bounds) {
      if (bound.x < 0 || bound.y < 0 || bound.x + bound.width > 1181 || bound.y + bound.height > 621) {
        throw new Error(`MediaBunny live panel escaped the 1180x620 window: ${JSON.stringify(bound)}`)
      }
      if (bound.height <= bound.width) {
        throw new Error(`MediaBunny live panel stayed 16:9-like instead of exercising fit modes: ${JSON.stringify(bound)}`)
      }
    }

    const widths = bounds.map((bound) => bound.width)
    if (Math.max(...widths) - Math.min(...widths) > 2) {
      throw new Error(`MediaBunny live panels did not share the row evenly: ${JSON.stringify(bounds)}`)
    }
  } finally {
    layoutRoot.unmount()
  }

  console.log(JSON.stringify({
    status: "pass",
    codec: "vp8",
    encodedBytes: encoded.byteLength,
    decodedFrames: 2,
    pixelFormat: "BGRA",
    width: firstFrame.width,
    height: firstFrame.height,
    nativeSurfaceVersion: testRoot.renderer.getVideoFrameSurfaceVersion(),
    liveLayout: "contained",
  }, null, 2))
} finally {
  testRoot?.unmount()
  first?.close()
  second?.close()
  input.dispose()
}
