import type { PresentationRun } from "./presentation-report.ts"

if (process.platform !== "darwin") {
  throw new Error("napi-WebCodecs hardware decode benchmark requires macOS")
}

const {
  EncodedVideoChunk,
  VideoDecoder,
} = await import("@napi-rs/webcodecs")
const {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} = await import("mediabunny")
const { summarizeFrameSteps } = await import("./presentation-report.ts")

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

const iterations = Number(process.env.MEDIABUNNY_PRESENTATION_ITERATIONS ?? 3)
const warmups = Number(process.env.MEDIABUNNY_PRESENTATION_WARMUPS ?? 1)
const fixture = await Bun.file(fixturePath).arrayBuffer()

type DecodeWorkerReport = {
  schemaVersion: 1
  backend: "napi-webcodecs-worker"
  generatedAt: string
  workload: {
    codec: "avc"
    fixtureBytes: number
    warmups: number
    iterations: number
  }
  decodeOnly: PresentationRun[]
  verification: Record<string, string | number | boolean>
}

function createInput() {
  return new Input({
    source: new BufferSource(fixture),
    formats: ALL_FORMATS,
  })
}

function normalizeDescription(description: AllowSharedBufferSource): Uint8Array {
  if (ArrayBuffer.isView(description)) {
    return new Uint8Array(
      description.buffer,
      description.byteOffset,
      description.byteLength,
    )
  }
  return new Uint8Array(description)
}

async function runDecodeOnly(): Promise<PresentationRun> {
  const input = createInput()
  let decoder: InstanceType<typeof VideoDecoder> | undefined

  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Presentation fixture has no video track")
    if (await track.getCodec() !== "avc") {
      throw new Error("napi-WebCodecs worker benchmark requires an AVC fixture")
    }

    const decoderConfig = await track.getDecoderConfig()
    if (!decoderConfig) throw new Error("AVC track has no decoder configuration")

    const width = decoderConfig.codedWidth ?? await track.getCodedWidth()
    const height = decoderConfig.codedHeight ?? await track.getCodedHeight()
    const frameSteps: number[] = []
    const started = performance.now()
    let previousFrameAt = started
    let firstFrameMs = 0
    let frames = 0
    let decoderError: Error | undefined

    decoder = new VideoDecoder({
      output(frame) {
        const frameAt = performance.now()
        frameSteps.push(frameAt - previousFrameAt)
        previousFrameAt = frameAt
        if (frames === 0) firstFrameMs = frameAt - started
        frames += 1
        frame.close()
      },
      error(error) {
        decoderError = error instanceof Error
          ? error
          : new Error(String(error))
      },
    })

    decoder.configure({
      codec: decoderConfig.codec,
      codedWidth: width,
      codedHeight: height,
      description: decoderConfig.description
        ? normalizeDescription(decoderConfig.description)
        : undefined,
      hardwareAcceleration: "prefer-hardware",
    })

    const sink = new EncodedPacketSink(track)
    for await (const packet of sink.packets()) {
      decoder.decode(new EncodedVideoChunk({
        type: packet.type,
        timestamp: Math.round(packet.microsecondTimestamp),
        duration: Math.round(packet.microsecondDuration),
        data: packet.data,
      }))
    }

    await decoder.flush()
    if (decoderError) throw decoderError
    if (frames === 0) throw new Error("napi-WebCodecs worker decoder produced no frames")

    return {
      frames,
      width,
      height,
      totalMs: performance.now() - started,
      firstFrameMs,
      ...summarizeFrameSteps(frameSteps),
    }
  } finally {
    decoder?.close()
    input.dispose()
  }
}

for (let index = 0; index < warmups; index += 1) {
  await runDecodeOnly()
}

const decodeOnly: PresentationRun[] = []
for (let index = 0; index < iterations; index += 1) {
  decodeOnly.push(await runDecodeOnly())
}

const report: DecodeWorkerReport = {
  schemaVersion: 1,
  backend: "napi-webcodecs-worker",
  generatedAt: new Date().toISOString(),
  workload: {
    codec: "avc",
    fixtureBytes: fixture.byteLength,
    warmups,
    iterations,
  },
  decodeOnly,
  verification: {
    mediaBunnyPacketSink: true,
    webCodecsWorker: true,
    hardwareAccelerationPreference: "prefer-hardware",
    hardwareFramePreserved: false,
    currentNapiWebCodecsDownloadsHardwareFrames: true,
  },
}

console.log(JSON.stringify(report))
