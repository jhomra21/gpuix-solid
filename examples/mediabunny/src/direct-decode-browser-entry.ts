import {
  ALL_FORMATS,
  BufferSource,
  EncodedPacketSink,
  Input,
} from "mediabunny"
import {
  type DirectDecodeReport,
  type DirectDecodeRun,
  summarizeArrivals,
} from "./direct-decode-report.ts"

const reportNode = document.querySelector("#report")
if (!(reportNode instanceof HTMLElement)) {
  throw new Error("Direct decode benchmark is missing its report node")
}

const parameters = new URLSearchParams(location.search)
const iterations = Number(parameters.get("iterations") ?? 5)
const warmups = Number(parameters.get("warmups") ?? 2)
const reportEndpoint = parameters.get("reportEndpoint")

type EncodedInput = {
  type: EncodedVideoChunkType
  timestamp: number
  duration: number
  data: Uint8Array
}

function createInput(buffer: ArrayBuffer) {
  return new Input({
    source: new BufferSource(buffer),
    formats: ALL_FORMATS,
  })
}

async function prepareInput(buffer: ArrayBuffer) {
  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Direct decode fixture has no video track")
    if (await track.getCodec() !== "avc") {
      throw new Error("Direct decode benchmark requires AVC")
    }

    const config = await track.getDecoderConfig()
    if (!config) throw new Error("AVC track has no decoder configuration")

    const packets: EncodedInput[] = []
    const sink = new EncodedPacketSink(track)
    for await (const packet of sink.packets()) {
      packets.push({
        type: packet.type,
        timestamp: Math.round(packet.microsecondTimestamp),
        duration: Math.round(packet.microsecondDuration),
        data: packet.data.slice(),
      })
    }

    return {
      config: {
        codec: config.codec,
        codedWidth: config.codedWidth ?? await track.getCodedWidth(),
        codedHeight: config.codedHeight ?? await track.getCodedHeight(),
        description: config.description,
        hardwareAcceleration: "prefer-hardware" as const,
      },
      packets,
    }
  } finally {
    input.dispose()
  }
}

async function runDecode(
  config: VideoDecoderConfig,
  packets: readonly EncodedInput[],
): Promise<DirectDecodeRun> {
  const arrivalMs: number[] = []
  let frames = 0
  let width = config.codedWidth ?? 0
  let height = config.codedHeight ?? 0
  let decoderError: DOMException | undefined
  let started = 0

  const decoder = new VideoDecoder({
    output(frame) {
      const now = performance.now()
      arrivalMs.push(now - started)
      frames += 1
      width = frame.codedWidth
      height = frame.codedHeight
      frame.close()
    },
    error(error) {
      decoderError = error
    },
  })

  try {
    decoder.configure(config)
    started = performance.now()
    for (const packet of packets) {
      decoder.decode(new EncodedVideoChunk({
        type: packet.type,
        timestamp: packet.timestamp,
        duration: packet.duration,
        data: packet.data,
      }))
    }
    await decoder.flush()
    const totalMs = performance.now() - started
    if (decoderError) throw decoderError
    if (frames === 0 || arrivalMs.length === 0) {
      throw new Error("Browser WebCodecs produced no frames")
    }

    return {
      frames,
      width,
      height,
      totalMs,
      firstFrameMs: arrivalMs[0] ?? 0,
      ...summarizeArrivals(arrivalMs),
    }
  } finally {
    decoder.close()
  }
}

try {
  const response = await fetch("/fixture.mp4")
  if (!response.ok) throw new Error(`Could not load direct decode fixture: ${response.status}`)
  const fixture = await response.arrayBuffer()
  const prepared = await prepareInput(fixture)

  for (let index = 0; index < warmups; index += 1) {
    await runDecode(prepared.config, prepared.packets)
  }

  const runs: DirectDecodeRun[] = []
  for (let index = 0; index < iterations; index += 1) {
    runs.push(await runDecode(prepared.config, prepared.packets))
  }

  const report: DirectDecodeReport = {
    schemaVersion: 1,
    backend: "browser-webcodecs-direct",
    generatedAt: new Date().toISOString(),
    workload: {
      codec: "avc",
      fixtureBytes: fixture.byteLength,
      warmups,
      iterations,
    },
    runs,
    verification: {
      packetCount: prepared.packets.length,
      hardwareAccelerationPreference: "prefer-hardware",
      packetPreparationExcludedFromTiming: true,
      outputSpacingIsNotPerFrameDecodeLatency: true,
    },
  }

  const serialized = JSON.stringify(report)
  reportNode.textContent = serialized
  if (reportEndpoint) {
    const submit = await fetch(reportEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: serialized,
    })
    if (!submit.ok) {
      throw new Error(`Could not submit direct decode report: ${submit.status}`)
    }
  }
  document.body.dataset.status = "ready"
} catch (error) {
  reportNode.textContent = error instanceof Error ? (error.stack ?? error.message) : String(error)
  document.body.dataset.status = "error"
}
