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

const { render } = await import("../../../packages/solid/src/index.ts")
const {
  createElement,
  createTextNode,
  insertNode,
  setProp,
} = await import("../../../packages/solid/src/host/universal.ts")

const WIDTH = 320
const HEIGHT = 180
const FRAME_RATE = 4
const FRAME_COUNT = 8

function makeSourceSample(index: number) {
  const data = new Uint8Array(WIDTH * HEIGHT * 4)
  const phase = index / Math.max(1, FRAME_COUNT - 1)

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4
      data[offset] = Math.round(255 * x / Math.max(1, WIDTH - 1))
      data[offset + 1] = Math.round(255 * y / Math.max(1, HEIGHT - 1))
      data[offset + 2] = Math.round(255 * phase)
      data[offset + 3] = 255
    }
  }

  const stripeWidth = Math.max(8, Math.floor(WIDTH / 10))
  const stripeStart = Math.round((WIDTH - stripeWidth) * phase)
  for (let y = Math.floor(HEIGHT * 0.2); y < Math.floor(HEIGHT * 0.8); y += 1) {
    for (let x = stripeStart; x < stripeStart + stripeWidth; x += 1) {
      const offset = (y * WIDTH + x) * 4
      data[offset] = 255
      data[offset + 1] = 255
      data[offset + 2] = 255
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
    quality: new Quality({ bitrate: 900_000 }),
  })

  output.addVideoTrack(source, { frameRate: FRAME_RATE })
  await output.start()
  for (let index = 0; index < FRAME_COUNT; index += 1) {
    const sample = makeSourceSample(index)
    try {
      await source.add(sample)
    } finally {
      sample.close()
    }
  }
  source.close()
  await output.finalize()

  if (!target.buffer || target.buffer.byteLength === 0) {
    throw new Error("Live MediaBunny fixture encoded no bytes")
  }
  return target.buffer
}

async function decodeFrames(buffer: ArrayBuffer) {
  const input = new Input({
    source: new BufferSource(buffer),
    formats: ALL_FORMATS,
  })

  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Live MediaBunny fixture has no video track")

    const frames: Array<{ data: Uint8Array; width: number; height: number }> = []
    for await (const sample of new VideoSampleSink(track).samples()) {
      try {
        const options = { format: "BGRA" as const }
        const data = new Uint8Array(sample.allocationSize(options))
        await sample.copyTo(data, options)
        frames.push({
          data,
          width: sample.codedWidth,
          height: sample.codedHeight,
        })
      } finally {
        sample.close()
      }
    }

    if (frames.length < 2) {
      throw new Error(`Expected multiple decoded MediaBunny frames, got ${frames.length}`)
    }
    return frames
  } finally {
    input.dispose()
  }
}

function addText(parent: ReturnType<typeof createElement>, value: string, fontSize: number) {
  const label = createElement("text")
  setProp(label, "style", {
    color: "#d8dee9",
    fontSize,
  })
  insertNode(label, createTextNode(value))
  insertNode(parent, label)
}

function addSurface(
  parent: ReturnType<typeof createElement>,
  label: string,
  objectFit: "contain" | "cover" | "fill",
  frame: { data: Uint8Array; width: number; height: number },
) {
  const column = createElement("div")
  setProp(column, "style", {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 0,
    height: "100%",
  })
  addText(column, label, 14)

  const shell = createElement("div")
  setProp(shell, "style", {
    display: "flex",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: "#20252e",
    borderRadius: 8,
    padding: 8,
  })

  const surface = createElement("video-frame")
  setProp(surface, "testId", `mediabunny-${objectFit}`)
  setProp(surface, "style", {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
  })
  setProp(surface, "objectFit", objectFit)
  setProp(surface, "alt", `MediaBunny ${objectFit} frame`)
  setProp(surface, "frame", frame)

  insertNode(shell, surface)
  insertNode(column, shell)
  insertNode(parent, column)
  return surface
}

const frames = await decodeFrames(await encodeFixture())
const root = createElement("div")
setProp(root, "style", {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  padding: 20,
  backgroundColor: "#101318",
})

addText(root, "MediaBunny → GPUix native video-frame", 22)
addText(root, "Frames update 4×/sec. Resize the window and compare contain / cover / fill.", 13)

const row = createElement("div")
setProp(row, "style", {
  display: "flex",
  flexDirection: "row",
  gap: 14,
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  minHeight: 0,
  width: "100%",
})
insertNode(root, row)

const surfaces = [
  addSurface(row, "contain", "contain", frames[0]),
  addSurface(row, "cover", "cover", frames[0]),
  addSurface(row, "fill", "fill", frames[0]),
]

let frameIndex = 0
render(() => root, {
  title: "MediaBunny Native Frame Dogfood",
  width: 1180,
  height: 620,
  focus: process.env.GPUIX_BACKGROUND !== "1",
})

setInterval(() => {
  frameIndex = (frameIndex + 1) % frames.length
  for (const surface of surfaces) setProp(surface, "frame", frames[frameIndex])
}, 1000 / FRAME_RATE)
