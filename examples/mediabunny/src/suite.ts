import {
  ALL_FORMATS,
  AudioSample,
  AudioSampleSink,
  AudioSampleSource,
  BufferSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  CmafOutputFormat,
  Conversion,
  EncodedPacketSink,
  FlacOutputFormat,
  HlsOutputFormat,
  Input,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  MpegTsOutputFormat,
  OggOutputFormat,
  WebMOutputFormat,
  Output,
  PathedTarget,
  Quality,
  ReadableStreamSource,
  StreamTarget,
  TextSubtitleSource,
  AdtsOutputFormat,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  WavOutputFormat,
  canDecodeAudio,
  canDecodeVideo,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type StreamTargetChunk,
  type VideoCodec,
} from "mediabunny"

export type BenchmarkBackend =
  | "browser-webcodecs"
  | "mediabunny-server"
  | "napi-webcodecs"
  | "gpuix-mediabunny"

type CapabilityResult<TCodec extends string = string> = {
  codec: TCodec
  encode: boolean
  decode: boolean
  queryMs: number
  error?: string
}

type Measurement = {
  name: string
  milliseconds: number
}

type FeatureDetail = string | number | boolean | null

type FeatureCaseResult = {
  name: string
  status: "pass" | "unsupported" | "known-gap" | "error"
  milliseconds: number
  details?: Record<string, FeatureDetail>
  error?: string
  note?: string
}

type FeatureExecution =
  | { status: "pass"; details?: Record<string, FeatureDetail> }
  | { status: "unsupported"; details?: Record<string, FeatureDetail> }

export type CodecRoundTripResult = {
  codec: string
  status: "pass" | "unsupported" | "known-gap" | "timeout" | "error"
  encodeMs?: number
  decodeMs?: number
  bytes?: number
  decodedSamples?: number
  decodedFrames?: number
  container?: string
  encoderConfigCodec?: string
  muxPreservedPackets?: boolean
  error?: string
  note?: string
}

type RoundTripResult = {
  bytes: number
  durationSeconds: number
  videoPackets: number
  audioPackets: number
  decodedVideoSamples: number
  decodedAudioFrames: number
  codedWidth: number
  codedHeight: number
  seekTimestamp: number
}

export type MediaBunnyBenchmarkReport = {
  schemaVersion: 2
  backend: BenchmarkBackend
  generatedAt: string
  workload: {
    width: number
    height: number
    frameRate: number
    videoFrames: number
    audioSampleRate: number
    audioChannels: number
    durationSeconds: number
  }
  capabilities: {
    video: CapabilityResult<VideoCodec>[]
    audio: CapabilityResult<AudioCodec>[]
  }
  measurements: Measurement[]
  features: FeatureCaseResult[]
  codecRoundTrips: {
    video: CodecRoundTripResult[]
    audio: CodecRoundTripResult[]
  }
  roundTrip: RoundTripResult
  summary: {
    passes: number
    unsupported: number
    knownGaps: number
    timeouts: number
    errors: number
  }
}

export type MediaBunnyBenchmarkOptions = {
  skipVideoCodecRoundTrips?: readonly VideoCodec[]
}

const VIDEO_CODECS: readonly VideoCodec[] = ["avc", "hevc", "vp8", "vp9", "av1", "prores"]
const LOSSY_AUDIO_CODECS: readonly AudioCodec[] = [
  "aac",
  "opus",
  "mp3",
  "vorbis",
  "ac3",
  "eac3",
  "dts",
]

const AUDIO_CODECS: readonly AudioCodec[] = [
  "aac",
  "opus",
  "mp3",
  "vorbis",
  "flac",
  "ac3",
  "eac3",
  "dts",
  "pcm-u8",
  "pcm-s8",
  "pcm-s16",
  "pcm-s16be",
  "pcm-s24",
  "pcm-s24be",
  "pcm-s32",
  "pcm-s32be",
  "pcm-f32",
  "pcm-f32be",
  "pcm-f64",
  "pcm-f64be",
  "ulaw",
  "alaw",
]

const WIDTH = 320
const HEIGHT = 180
const FRAME_RATE = 30
const VIDEO_FRAMES = 30
const AUDIO_SAMPLE_RATE = 48_000
const AUDIO_CHANNELS = 2
const DURATION_SECONDS = VIDEO_FRAMES / FRAME_RATE

async function videoCapability(codec: VideoCodec): Promise<CapabilityResult<VideoCodec>> {
  const started = performance.now()
  try {
    const [encode, decode] = await Promise.all([
      canEncodeVideo(codec, {
        width: WIDTH,
        height: HEIGHT,
        frameRate: FRAME_RATE,
      }),
      canDecodeVideo(codec, {
        codedWidth: WIDTH,
        codedHeight: HEIGHT,
      }),
    ])
    return { codec, encode, decode, queryMs: performance.now() - started }
  } catch (error) {
    return {
      codec,
      encode: false,
      decode: false,
      queryMs: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function audioCapability(codec: AudioCodec): Promise<CapabilityResult<AudioCodec>> {
  const started = performance.now()
  try {
    const [encode, decode] = await Promise.all([
      canEncodeAudio(codec, {
        numberOfChannels: AUDIO_CHANNELS,
        sampleRate: AUDIO_SAMPLE_RATE,
      }),
      canDecodeAudio(codec, {
        numberOfChannels: AUDIO_CHANNELS,
        sampleRate: AUDIO_SAMPLE_RATE,
      }),
    ])
    return { codec, encode, decode, queryMs: performance.now() - started }
  } catch (error) {
    return {
      codec,
      encode: false,
      decode: false,
      queryMs: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function makeVideoSample(frameIndex: number): VideoSample {
  const bytes = new Uint8Array(WIDTH * HEIGHT * 4)
  const phase = frameIndex / Math.max(1, VIDEO_FRAMES - 1)

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const offset = (y * WIDTH + x) * 4
      bytes[offset] = Math.round(255 * x / Math.max(1, WIDTH - 1))
      bytes[offset + 1] = Math.round(255 * y / Math.max(1, HEIGHT - 1))
      bytes[offset + 2] = Math.round(255 * phase)
      bytes[offset + 3] = 255
    }
  }

  return new VideoSample(bytes, {
    format: "RGBA",
    codedWidth: WIDTH,
    codedHeight: HEIGHT,
    timestamp: frameIndex / FRAME_RATE,
    duration: 1 / FRAME_RATE,
  })
}

function makeAudioSample(): AudioSample {
  const numberOfFrames = Math.round(AUDIO_SAMPLE_RATE * DURATION_SECONDS)
  const data = new Float32Array(numberOfFrames * AUDIO_CHANNELS)

  for (let frame = 0; frame < numberOfFrames; frame += 1) {
    const value = Math.sin(2 * Math.PI * 440 * frame / AUDIO_SAMPLE_RATE) * 0.25
    for (let channel = 0; channel < AUDIO_CHANNELS; channel += 1) {
      data[frame * AUDIO_CHANNELS + channel] = value
    }
  }

  return new AudioSample({
    data,
    format: "f32",
    sampleRate: AUDIO_SAMPLE_RATE,
    numberOfFrames,
    numberOfChannels: AUDIO_CHANNELS,
    timestamp: 0,
  })
}

function createInput(buffer: ArrayBuffer): Input {
  return new Input({
    source: new BufferSource(buffer),
    formats: ALL_FORMATS,
  })
}

type ConversionOptions = Omit<Parameters<typeof Conversion.init>[0], "input" | "output">

async function convertFixture(
  buffer: ArrayBuffer,
  options: ConversionOptions = {},
): Promise<{ status: "pass"; buffer: ArrayBuffer } | { status: "unsupported"; discardedTracks: number }> {
  const input = createInput(buffer)
  const target = new BufferTarget()
  const output = new Output({
    format: new WebMOutputFormat(),
    target,
  })

  try {
    const conversion = await Conversion.init({ input, output, ...options })
    if (!conversion.isValid) {
      return { status: "unsupported", discardedTracks: conversion.discardedTracks.length }
    }

    await conversion.execute()
    if (!target.buffer || target.buffer.byteLength === 0) {
      throw new Error("Conversion produced an empty WebM buffer")
    }

    return { status: "pass", buffer: target.buffer }
  } finally {
    input.dispose()
  }
}

async function convertAudioPcmFixture(
  buffer: ArrayBuffer,
): Promise<{ status: "pass"; buffer: ArrayBuffer } | { status: "unsupported"; discardedTracks: number }> {
  const input = createInput(buffer)
  const target = new BufferTarget()
  const output = new Output({
    format: new WavOutputFormat(),
    target,
  })

  try {
    const conversion = await Conversion.init({
      input,
      output,
      video: { discard: true },
      audio: {
        codec: "pcm-s16",
        numberOfChannels: 1,
        sampleRate: 24_000,
        forceTranscode: true,
      },
    })
    if (!conversion.isValid) {
      return { status: "unsupported", discardedTracks: conversion.discardedTracks.length }
    }

    await conversion.execute()
    if (!target.buffer || target.buffer.byteLength === 0) {
      throw new Error("PCM resample conversion produced an empty WAV buffer")
    }
    return { status: "pass", buffer: target.buffer }
  } finally {
    input.dispose()
  }
}

async function inspectFlipSignature(buffer: ArrayBuffer): Promise<{ leftRed: number; rightRed: number }> {
  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Converted flip output has no video track")

    const sample = await new VideoSampleSink(track).getSample(0)
    if (!sample) throw new Error("Converted flip output has no first video sample")
    try {
      const bytes = new Uint8Array(sample.allocationSize({ format: "RGBA" }))
      await sample.copyTo(bytes, { format: "RGBA" })
      const row = Math.floor(sample.codedHeight / 2)
      const leftOffset = row * sample.codedWidth * 4
      const rightOffset = leftOffset + (sample.codedWidth - 1) * 4
      return {
        leftRed: bytes[leftOffset] ?? 0,
        rightRed: bytes[rightOffset] ?? 0,
      }
    } finally {
      sample.close()
    }
  } finally {
    input.dispose()
  }
}

function knownGapFeature(name: string, note: string): FeatureCaseResult {
  return {
    name,
    status: "known-gap",
    milliseconds: 0,
    note,
  }
}

async function runFeatureCase(
  name: string,
  operation: () => Promise<FeatureExecution>,
): Promise<FeatureCaseResult> {
  const started = performance.now()
  try {
    const result = await operation()
    return {
      name,
      status: result.status,
      milliseconds: performance.now() - started,
      details: result.details,
    }
  } catch (error) {
    return {
      name,
      status: "error",
      milliseconds: performance.now() - started,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function inspectVideoTrack(buffer: ArrayBuffer): Promise<{
  width: number
  height: number
  packets: number
  samples: number
  duration: number
}> {
  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("Converted output has no video track")

    let samples = 0
    for await (const sample of new VideoSampleSink(track).samples()) {
      samples += 1
      sample.close()
    }

    const stats = await track.computePacketStats()
    return {
      width: await track.getCodedWidth(),
      height: await track.getCodedHeight(),
      packets: stats.packetCount,
      samples,
      duration: await track.computeDuration(),
    }
  } finally {
    input.dispose()
  }
}

async function inspectAudioTrack(buffer: ArrayBuffer): Promise<{
  numberOfChannels: number
  sampleRate: number
  decodedFrames: number
  duration: number
}> {
  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryAudioTrack()
    if (!track) throw new Error("Converted output has no audio track")

    let decodedFrames = 0
    for await (const sample of new AudioSampleSink(track).samples()) {
      decodedFrames += sample.numberOfFrames
      sample.close()
    }

    return {
      numberOfChannels: await track.getNumberOfChannels(),
      sampleRate: await track.getSampleRate(),
      decodedFrames,
      duration: await track.computeDuration(),
    }
  } finally {
    input.dispose()
  }
}

async function encodeFixture(measurements: Measurement[]): Promise<ArrayBuffer> {
  const target = new BufferTarget()
  const output = new Output({
    format: new WebMOutputFormat(),
    target,
  })
  const videoSource = new VideoSampleSource({
    codec: "vp8",
    quality: new Quality({ bitrate: 750_000 }),
  })
  const audioSource = new AudioSampleSource({
    codec: "opus",
    quality: new Quality({ bitrate: 128_000 }),
  })

  output.addVideoTrack(videoSource)
  output.addAudioTrack(audioSource)

  const started = performance.now()
  await output.start()

  for (let frame = 0; frame < VIDEO_FRAMES; frame += 1) {
    const sample = makeVideoSample(frame)
    try {
      await videoSource.add(sample)
    } finally {
      sample.close()
    }
  }

  const audio = makeAudioSample()
  try {
    await audioSource.add(audio)
  } finally {
    audio.close()
  }

  videoSource.close()
  audioSource.close()
  await output.finalize()
  measurements.push({ name: "encode-webm-vp8-opus", milliseconds: performance.now() - started })

  if (!target.buffer || target.buffer.byteLength === 0) {
    throw new Error("MediaBunny produced an empty WebM buffer")
  }
  return target.buffer
}

async function inspectFixture(
  buffer: ArrayBuffer,
  measurements: Measurement[],
): Promise<RoundTripResult> {
  const openStarted = performance.now()
  const input = new Input({
    source: new BufferSource(buffer),
    formats: ALL_FORMATS,
  })

  try {
    if (!(await input.canRead())) throw new Error("MediaBunny cannot read its generated WebM fixture")

    const [format, mimeType, durationSeconds, tracks, metadata, videoTrack, audioTrack] = await Promise.all([
      input.getFormat(),
      input.getMimeType(),
      input.computeDuration(),
      input.getTracks(),
      input.getMetadataTags(),
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ])
    measurements.push({ name: "open-and-metadata", milliseconds: performance.now() - openStarted })

    if (!videoTrack || !audioTrack) throw new Error("Generated WebM is missing its video or audio track")
    if (!format || !mimeType || tracks.length < 2 || !metadata) {
      throw new Error("Generated WebM metadata inspection returned an incomplete result")
    }

    const packetStarted = performance.now()
    let videoPackets = 0
    for await (const packet of new EncodedPacketSink(videoTrack).packets()) {
      if (packet.byteLength <= 0) throw new Error("Video packet was empty")
      videoPackets += 1
    }
    let audioPackets = 0
    for await (const packet of new EncodedPacketSink(audioTrack).packets()) {
      if (packet.byteLength <= 0) throw new Error("Audio packet was empty")
      audioPackets += 1
    }
    measurements.push({ name: "iterate-encoded-packets", milliseconds: performance.now() - packetStarted })

    const videoDecodeStarted = performance.now()
    const videoSink = new VideoSampleSink(videoTrack)
    let decodedVideoSamples = 0
    let codedWidth = 0
    let codedHeight = 0
    for await (const sample of videoSink.samples()) {
      try {
        codedWidth = sample.codedWidth
        codedHeight = sample.codedHeight
        decodedVideoSamples += 1
      } finally {
        sample.close()
      }
    }
    measurements.push({ name: "decode-video-sequential", milliseconds: performance.now() - videoDecodeStarted })

    const seekStarted = performance.now()
    const seekSample = await videoSink.getSample(DURATION_SECONDS / 2)
    if (!seekSample) throw new Error("VideoSampleSink could not seek into generated WebM")
    const seekTimestamp = seekSample.timestamp
    seekSample.close()
    measurements.push({ name: "decode-video-seek", milliseconds: performance.now() - seekStarted })

    const audioDecodeStarted = performance.now()
    const audioSink = new AudioSampleSink(audioTrack)
    let decodedAudioFrames = 0
    for await (const sample of audioSink.samples()) {
      try {
        decodedAudioFrames += sample.numberOfFrames
      } finally {
        sample.close()
      }
    }
    measurements.push({ name: "decode-audio-sequential", milliseconds: performance.now() - audioDecodeStarted })

    if (decodedVideoSamples === 0 || decodedAudioFrames === 0) {
      throw new Error("MediaBunny round trip decoded no media samples")
    }

    return {
      bytes: buffer.byteLength,
      durationSeconds,
      videoPackets,
      audioPackets,
      decodedVideoSamples,
      decodedAudioFrames,
      codedWidth,
      codedHeight,
      seekTimestamp,
    }
  } finally {
    input.dispose()
  }
}

function makeCodecVideoSample(
  frameIndex: number,
  frameCount: number,
  width: number,
  height: number,
): VideoSample {
  const bytes = new Uint8Array(width * height * 4)
  const phase = frameIndex / Math.max(1, frameCount - 1)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      bytes[offset] = Math.round(255 * x / Math.max(1, width - 1))
      bytes[offset + 1] = Math.round(255 * y / Math.max(1, height - 1))
      bytes[offset + 2] = Math.round(255 * phase)
      bytes[offset + 3] = 255
    }
  }

  return new VideoSample(bytes, {
    format: "RGBA",
    codedWidth: width,
    codedHeight: height,
    timestamp: frameIndex / FRAME_RATE,
    duration: 1 / FRAME_RATE,
  })
}

function videoCodecOutputFormat(codec: VideoCodec): MovOutputFormat | Mp4OutputFormat | WebMOutputFormat {
  if (codec === "prores") return new Mp4OutputFormat()
  if (codec === "avc" || codec === "hevc") return new Mp4OutputFormat({ fastStart: "fragmented" })
  return new WebMOutputFormat()
}

async function runVideoCodecRoundTrip(
  capability: CapabilityResult<VideoCodec>,
  backend?: BenchmarkBackend,
): Promise<CodecRoundTripResult> {
  if (!capability.encode || !capability.decode) {
    return { codec: capability.codec, status: "unsupported" }
  }

  const codec = capability.codec
  const frameCount = 6
  const width = codec === "prores" ? 640 : 160
  const height = codec === "prores" ? 480 : 90
  const target = new BufferTarget()
  const format = videoCodecOutputFormat(codec)
  if (!format.getSupportedVideoCodecs().includes(codec)) {
    return {
      codec,
      status: "error",
      error: `No selected output format can contain ${codec}`,
    }
  }

  let encoderConfigCodec: string | undefined
  const encodedVp9Packets: Uint8Array[] = []
  let muxPreservedPackets: boolean | undefined

  try {
    const output = new Output({ format, target })
    const source = new VideoSampleSource({
      codec,
      quality: codec === "prores"
        ? new Quality({ quality: 0.75, preferBitrate: true })
        : new Quality("medium"),
      onEncoderConfig(config) {
        encoderConfigCodec = config.codec
      },
      onEncodedPacket(packet) {
        if (codec === "vp9") encodedVp9Packets.push(packet.data.slice())
      },
    })
    output.addVideoTrack(source, { frameRate: FRAME_RATE })

    const encodeStarted = performance.now()
    await output.start()
    for (let frame = 0; frame < frameCount; frame += 1) {
      const sample = makeCodecVideoSample(frame, frameCount, width, height)
      try {
        await source.add(sample)
      } finally {
        sample.close()
      }
    }
    source.close()
    await output.finalize()
    const encodeMs = performance.now() - encodeStarted

    if (!target.buffer || target.buffer.byteLength === 0) {
      throw new Error(`${codec} round trip produced an empty output buffer`)
    }

    const decodeStarted = performance.now()
    const input = createInput(target.buffer)
    let decodedSamples = 0
    try {
      const track = await input.getPrimaryVideoTrack()
      if (!track) throw new Error(`${codec} round trip output has no video track`)

      if (codec === "vp9") {
        const demuxedPackets: Uint8Array[] = []
        for await (const packet of new EncodedPacketSink(track).packets()) {
          demuxedPackets.push(packet.data.slice())
        }

        muxPreservedPackets = demuxedPackets.length === encodedVp9Packets.length
          && demuxedPackets.every((packet, index) => {
            const encoded = encodedVp9Packets[index]
            return encoded !== undefined
              && packet.byteLength === encoded.byteLength
              && packet.every((byte, byteIndex) => byte === encoded[byteIndex])
          })
      }

      for await (const sample of new VideoSampleSink(track).samples()) {
        decodedSamples += 1
        sample.close()
      }
    } finally {
      input.dispose()
    }
    const decodeMs = performance.now() - decodeStarted

    if (decodedSamples === 0) {
      throw new Error(`${codec} round trip decoded no video samples`)
    }

    return {
      codec,
      status: "pass",
      encodeMs,
      decodeMs,
      bytes: target.buffer.byteLength,
      decodedSamples,
      encoderConfigCodec,
      muxPreservedPackets,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (backend === "napi-webcodecs" && codec === "vp9") {
      return {
        codec,
        status: "known-gap",
        encoderConfigCodec,
        muxPreservedPackets,
        error: message,
        note: "MediaBunny's WebM VP9 color-space rewrite changes napi-WebCodecs packet bytes; the rewritten stream currently fails FFmpeg decode.",
      }
    }
    if (backend === "mediabunny-server" && codec === "prores") {
      return {
        codec,
        status: "known-gap",
        encoderConfigCodec,
        muxPreservedPackets,
        error: message,
        note: "The server backend currently advertises this ProRes path but the generic encode→mux→decode round trip does not complete.",
      }
    }
    return {
      codec,
      status: "error",
      encoderConfigCodec,
      muxPreservedPackets,
      error: message,
    }
  }
}

async function runVideoCodecRoundTrips(
  capabilities: readonly CapabilityResult<VideoCodec>[],
  backend: BenchmarkBackend,
  skip: ReadonlySet<VideoCodec>,
): Promise<CodecRoundTripResult[]> {
  const results: CodecRoundTripResult[] = []
  for (const capability of capabilities) {
    if (skip.has(capability.codec)) {
      results.push({
        codec: capability.codec,
        status: "timeout",
        note: "Round trip is executed in an isolated backend process so a native codec cannot stall the full benchmark.",
      })
      continue
    }
    results.push(await runVideoCodecRoundTrip(capability, backend))
  }
  return results
}

export async function runVideoCodecRoundTripForCodec(
  backend: BenchmarkBackend,
  codec: VideoCodec,
): Promise<CodecRoundTripResult> {
  const capability = await videoCapability(codec)
  return runVideoCodecRoundTrip(capability, backend)
}

function makeCodecAudioSample(): AudioSample {
  const durationSeconds = 0.2
  const numberOfFrames = Math.round(AUDIO_SAMPLE_RATE * durationSeconds)
  const data = new Float32Array(numberOfFrames * AUDIO_CHANNELS)

  for (let frame = 0; frame < numberOfFrames; frame += 1) {
    const value = Math.sin(2 * Math.PI * 440 * frame / AUDIO_SAMPLE_RATE) * 0.25
    for (let channel = 0; channel < AUDIO_CHANNELS; channel += 1) {
      data[frame * AUDIO_CHANNELS + channel] = value
    }
  }

  return new AudioSample({
    data,
    format: "f32",
    sampleRate: AUDIO_SAMPLE_RATE,
    numberOfFrames,
    numberOfChannels: AUDIO_CHANNELS,
    timestamp: 0,
  })
}

function audioCodecOutputFormat(codec: AudioCodec) {
  const formats = [
    new WavOutputFormat(),
    new OggOutputFormat(),
    new Mp3OutputFormat(),
    new FlacOutputFormat(),
    new Mp4OutputFormat({ fastStart: "fragmented" }),
    new MovOutputFormat(),
    new MkvOutputFormat(),
  ]

  return formats.find((format) => format.getSupportedAudioCodecs().includes(codec))
}

async function runAudioCodecRoundTrip(
  capability: CapabilityResult<AudioCodec>,
): Promise<CodecRoundTripResult> {
  if (!capability.encode || !capability.decode) {
    return { codec: capability.codec, status: "unsupported" }
  }

  const codec = capability.codec
  const format = audioCodecOutputFormat(codec)
  if (!format) {
    return {
      codec,
      status: "error",
      error: `No tested output format can contain ${codec}`,
    }
  }

  const target = new BufferTarget()
  try {
    const output = new Output({ format, target })
    const source = new AudioSampleSource(
      LOSSY_AUDIO_CODECS.includes(codec)
        ? { codec, quality: new Quality("medium") }
        : { codec },
    )
    output.addAudioTrack(source)

    const encodeStarted = performance.now()
    await output.start()
    const sample = makeCodecAudioSample()
    try {
      await source.add(sample)
    } finally {
      sample.close()
    }
    source.close()
    await output.finalize()
    const encodeMs = performance.now() - encodeStarted

    if (!target.buffer || target.buffer.byteLength === 0) {
      throw new Error(`${codec} round trip produced an empty output buffer`)
    }

    const decodeStarted = performance.now()
    const input = createInput(target.buffer)
    let decodedFrames = 0
    try {
      const track = await input.getPrimaryAudioTrack()
      if (!track) throw new Error(`${codec} round trip output has no audio track`)
      for await (const decoded of new AudioSampleSink(track).samples()) {
        decodedFrames += decoded.numberOfFrames
        decoded.close()
      }
    } finally {
      input.dispose()
    }
    const decodeMs = performance.now() - decodeStarted

    if (decodedFrames === 0) {
      throw new Error(`${codec} round trip decoded no audio frames`)
    }

    return {
      codec,
      status: "pass",
      encodeMs,
      decodeMs,
      bytes: target.buffer.byteLength,
      decodedFrames,
      container: format.constructor.name,
    }
  } catch (error) {
    return {
      codec,
      status: "error",
      container: format.constructor.name,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runAudioCodecRoundTrips(
  capabilities: readonly CapabilityResult<AudioCodec>[],
): Promise<CodecRoundTripResult[]> {
  const results: CodecRoundTripResult[] = []
  for (const capability of capabilities) {
    results.push(await runAudioCodecRoundTrip(capability))
  }
  return results
}

async function runCanvasSourceFeature(): Promise<FeatureExecution> {
  if (!Reflect.has(globalThis, "OffscreenCanvas")) {
    return {
      status: "unsupported",
      details: { reason: "OffscreenCanvas is unavailable" },
    }
  }

  const canvas = new OffscreenCanvas(160, 90)
  const context = canvas.getContext("2d")
  if (!context) {
    return {
      status: "unsupported",
      details: { reason: "2D canvas context is unavailable" },
    }
  }

  const target = new BufferTarget()
  const output = new Output({
    format: new WebMOutputFormat(),
    target,
  })
  const source = new CanvasSource(canvas, {
    codec: "vp8",
    quality: new Quality("medium"),
  })
  output.addVideoTrack(source, { frameRate: FRAME_RATE })

  await output.start()
  const frameCount = 6
  for (let frame = 0; frame < frameCount; frame += 1) {
    const phase = frame / Math.max(1, frameCount - 1)
    context.fillStyle = `rgb(${Math.round(255 * phase)} 32 ${Math.round(255 * (1 - phase))})`
    context.fillRect(0, 0, canvas.width, canvas.height)
    await source.add(frame / FRAME_RATE, 1 / FRAME_RATE)
  }
  source.close()
  await output.finalize()

  if (!target.buffer || target.buffer.byteLength === 0) {
    throw new Error("CanvasSource produced an empty WebM buffer")
  }

  const video = await inspectVideoTrack(target.buffer)
  if (video.width !== 160 || video.height !== 90 || video.samples !== frameCount) {
    throw new Error(`Unexpected CanvasSource output: ${JSON.stringify(video)}`)
  }

  return {
    status: "pass",
    details: {
      bytes: target.buffer.byteLength,
      width: video.width,
      height: video.height,
      samples: video.samples,
    },
  }
}

async function runCanvasSinkFeature(buffer: ArrayBuffer): Promise<FeatureExecution> {
  if (!Reflect.has(globalThis, "OffscreenCanvas") && !Reflect.has(globalThis, "document")) {
    return {
      status: "unsupported",
      details: { reason: "No canvas implementation is available" },
    }
  }

  const input = createInput(buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("CanvasSink input has no video track")

    const sink = new CanvasSink(track, {
      width: 160,
      height: 90,
      fit: "fill",
      poolSize: 1,
    })
    const wrapped = await sink.getCanvas(0.5)
    if (!wrapped) throw new Error("CanvasSink returned no canvas at 0.5 seconds")

    const context = wrapped.canvas.getContext("2d")
    if (!context) throw new Error("CanvasSink canvas has no 2D context")

    const pixels = context.getImageData(0, 0, wrapped.canvas.width, wrapped.canvas.height).data
    const row = Math.floor(wrapped.canvas.height / 2)
    const leftOffset = row * wrapped.canvas.width * 4
    const rightOffset = leftOffset + (wrapped.canvas.width - 1) * 4
    const leftRed = pixels[leftOffset] ?? 0
    const rightRed = pixels[rightOffset] ?? 0

    if (rightRed <= leftRed + 40) {
      throw new Error(
        `CanvasSink did not preserve the source horizontal red gradient: left=${leftRed}, right=${rightRed}`,
      )
    }

    return {
      status: "pass",
      details: {
        width: wrapped.canvas.width,
        height: wrapped.canvas.height,
        timestamp: wrapped.timestamp,
        leftRed,
        rightRed,
      },
    }
  } finally {
    input.dispose()
  }
}

async function encodeShortVideo(
  output: Output,
  codec: VideoCodec = "avc",
  frames = 12,
): Promise<void> {
  const source = new VideoSampleSource({
    codec,
    quality: new Quality("medium"),
  })
  output.addVideoTrack(source, { frameRate: FRAME_RATE })

  await output.start()
  for (let frame = 0; frame < frames; frame += 1) {
    const sample = makeCodecVideoSample(frame, frames, 160, 90)
    try {
      await source.add(sample)
    } finally {
      sample.close()
    }
  }
  source.close()
  await output.finalize()
}

async function encodeShortAudio(
  output: Output,
  codec: AudioCodec = "aac",
): Promise<void> {
  const source = new AudioSampleSource({
    codec,
    quality: new Quality("medium"),
  })
  output.addAudioTrack(source)

  await output.start()
  const sample = makeCodecAudioSample()
  try {
    await source.add(sample)
  } finally {
    sample.close()
  }
  source.close()
  await output.finalize()
}

async function runCmafOutputFeature(): Promise<FeatureExecution> {
  const target = new BufferTarget()
  const initTarget = new BufferTarget()
  const output = new Output({
    format: new CmafOutputFormat(),
    target,
    initTarget,
  })
  await encodeShortVideo(output)

  if (!target.buffer || !initTarget.buffer) {
    throw new Error("CMAF output did not produce both init and media segments")
  }

  const initInput = createInput(initTarget.buffer)
  const segmentInput = new Input({
    source: new BufferSource(target.buffer),
    formats: ALL_FORMATS,
    initInput,
  })
  try {
    const track = await segmentInput.getPrimaryVideoTrack()
    if (!track) throw new Error("CMAF read-back has no video track")
    const sample = await new VideoSampleSink(track).getSample(0)
    if (!sample) throw new Error("CMAF read-back produced no video sample")
    sample.close()

    return {
      status: "pass",
      details: {
        initBytes: initTarget.buffer.byteLength,
        mediaBytes: target.buffer.byteLength,
      },
    }
  } finally {
    segmentInput.dispose()
    initInput.dispose()
  }
}

async function runMpegTsOutputFeature(): Promise<FeatureExecution> {
  const target = new BufferTarget()
  const output = new Output({
    format: new MpegTsOutputFormat(),
    target,
  })

  const video = new VideoSampleSource({
    codec: "avc",
    quality: new Quality("medium"),
  })
  const audio = new AudioSampleSource({
    codec: "aac",
    quality: new Quality("medium"),
  })
  output.addVideoTrack(video, { frameRate: FRAME_RATE })
  output.addAudioTrack(audio)

  await output.start()
  const frames = 12
  for (let frame = 0; frame < frames; frame += 1) {
    const sample = makeCodecVideoSample(frame, frames, 160, 90)
    try {
      await video.add(sample)
    } finally {
      sample.close()
    }
  }
  const audioSample = makeCodecAudioSample()
  try {
    await audio.add(audioSample)
  } finally {
    audioSample.close()
  }
  video.close()
  audio.close()
  await output.finalize()

  if (!target.buffer) throw new Error("MPEG-TS output was empty")
  const input = createInput(target.buffer)
  try {
    const [videoTrack, audioTrack] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ])
    if (!videoTrack || !audioTrack) {
      throw new Error("MPEG-TS read-back is missing video or audio")
    }

    const videoSample = await new VideoSampleSink(videoTrack).getSample(0)
    if (!videoSample) throw new Error("MPEG-TS video did not decode")
    videoSample.close()

    let audioFrames = 0
    for await (const sample of new AudioSampleSink(audioTrack).samples()) {
      audioFrames += sample.numberOfFrames
      sample.close()
    }
    if (audioFrames === 0) throw new Error("MPEG-TS audio did not decode")

    return {
      status: "pass",
      details: {
        bytes: target.buffer.byteLength,
        audioFrames,
      },
    }
  } finally {
    input.dispose()
  }
}

async function runAdtsOutputFeature(): Promise<FeatureExecution> {
  const target = new BufferTarget()
  const output = new Output({
    format: new AdtsOutputFormat(),
    target,
  })
  await encodeShortAudio(output, "aac")

  if (!target.buffer) throw new Error("ADTS output was empty")
  const input = createInput(target.buffer)
  try {
    const track = await input.getPrimaryAudioTrack()
    if (!track) throw new Error("ADTS read-back has no audio track")

    let decodedFrames = 0
    for await (const sample of new AudioSampleSink(track).samples()) {
      decodedFrames += sample.numberOfFrames
      sample.close()
    }
    if (decodedFrames === 0) throw new Error("ADTS read-back decoded no audio")

    return {
      status: "pass",
      details: {
        bytes: target.buffer.byteLength,
        decodedFrames,
      },
    }
  } finally {
    input.dispose()
  }
}

async function runStreamTargetFeature(): Promise<FeatureExecution> {
  const chunks: Uint8Array[] = []
  let nextPosition = 0
  const writable = new WritableStream<StreamTargetChunk>({
    write(chunk) {
      if (chunk.position !== nextPosition) {
        throw new Error(
          "Fragmented MP4 StreamTarget write was not append-only: expected "
          + nextPosition
          + ", got "
          + chunk.position,
        )
      }
      chunks.push(chunk.data.slice())
      nextPosition += chunk.data.byteLength
    },
  })

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "fragmented" }),
    target: new StreamTarget(writable, { chunked: true }),
  })
  await encodeShortVideo(output, "avc", 12)

  const bytes = new Uint8Array(nextPosition)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  if (bytes.byteLength === 0 || chunks.length === 0) {
    throw new Error("StreamTarget produced no MP4 bytes")
  }

  const input = createInput(bytes.buffer)
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("StreamTarget MP4 read-back has no video track")
    const sample = await new VideoSampleSink(track).getSample(0)
    if (!sample) throw new Error("StreamTarget MP4 read-back did not decode")
    sample.close()
  } finally {
    input.dispose()
  }

  return {
    status: "pass",
    details: {
      chunks: chunks.length,
      bytes: bytes.byteLength,
    },
  }
}

async function runReadableStreamSourceFeature(
  buffer: ArrayBuffer,
): Promise<FeatureExecution> {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 1024
  let offset = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.byteLength) {
        controller.close()
        return
      }

      const end = Math.min(bytes.byteLength, offset + chunkSize)
      controller.enqueue(bytes.slice(offset, end))
      offset = end
    },
  })

  const input = new Input({
    source: new ReadableStreamSource(stream),
    formats: ALL_FORMATS,
  })
  try {
    if (!await input.canRead()) {
      throw new Error("ReadableStreamSource could not read the generated WebM")
    }

    const [videoTrack, audioTrack] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ])
    if (!videoTrack || !audioTrack) {
      throw new Error("ReadableStreamSource lost video or audio tracks")
    }

    let videoSamples = 0
    for await (const sample of new VideoSampleSink(videoTrack).samples()) {
      videoSamples += 1
      sample.close()
    }
    let audioFrames = 0
    for await (const sample of new AudioSampleSink(audioTrack).samples()) {
      audioFrames += sample.numberOfFrames
      sample.close()
    }

    if (videoSamples === 0 || audioFrames === 0) {
      throw new Error("ReadableStreamSource decoded no media")
    }

    return {
      status: "pass",
      details: {
        chunks: Math.ceil(bytes.byteLength / chunkSize),
        videoSamples,
        audioFrames,
      },
    }
  } finally {
    input.dispose()
  }
}

async function runHlsOutputFeature(): Promise<FeatureExecution> {
  const files = new Map<string, ArrayBuffer>()
  let playlist = ""
  const target = new PathedTarget("", ({ path }) => {
    const bufferTarget = new BufferTarget()
    bufferTarget.on("finalized", () => {
      if (bufferTarget.buffer) files.set(path, bufferTarget.buffer)
    })
    return bufferTarget
  })
  const output = new Output({
    format: new HlsOutputFormat({
      segmentFormat: new MpegTsOutputFormat(),
      onPlaylist(text) {
        playlist = text
      },
    }),
    target,
  })

  await encodeShortVideo(output, "avc", 30)

  if (!playlist.includes("#EXTM3U") || !playlist.includes("#EXT-X-ENDLIST")) {
    throw new Error("HLS output did not produce a finalized playlist")
  }

  const segment = [...files.entries()].find(([path]) => path.endsWith(".ts"))
  if (!segment) {
    throw new Error("HLS output did not produce an MPEG-TS segment")
  }

  const input = createInput(segment[1])
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error("HLS MPEG-TS segment has no video track")
    const sample = await new VideoSampleSink(track).getSample(0)
    if (!sample) throw new Error("HLS MPEG-TS segment did not decode")
    sample.close()
  } finally {
    input.dispose()
  }

  return {
    status: "pass",
    details: {
      files: files.size,
      segmentBytes: segment[1].byteLength,
      playlistBytes: new TextEncoder().encode(playlist).byteLength,
    },
  }
}

async function writeSubtitleFixture(
  format: Mp4OutputFormat | MkvOutputFormat,
): Promise<number> {
  const target = new BufferTarget()
  const output = new Output({ format, target })
  const source = new TextSubtitleSource("webvtt")
  output.addSubtitleTrack(source)

  await output.start()
  await source.add(`WEBVTT

00:00.000 --> 00:00.500
GPUix MediaBunny parity

00:00.500 --> 00:01.000
WebVTT output works
`)
  await output.finalize()

  if (!target.buffer || target.buffer.byteLength === 0) {
    throw new Error(format.constructor.name + " WebVTT output was empty")
  }
  return target.buffer.byteLength
}

async function runFeatureCases(
  backend: BenchmarkBackend,
  buffer: ArrayBuffer,
): Promise<FeatureCaseResult[]> {
  const canvasSink =
    backend === "browser-webcodecs" || backend === "gpuix-mediabunny"
      ? await runFeatureCase("canvas-sink", () => runCanvasSinkFeature(buffer))
      : knownGapFeature(
          "canvas-sink",
          "The generic native backend does not install a Canvas implementation. The GPUix MediaBunny backend does and exercises CanvasSink directly.",
        )

  return [
    await runFeatureCase("canvas-source", runCanvasSourceFeature),
    canvasSink,

    await runFeatureCase("stream-target-fragmented-mp4", runStreamTargetFeature),
    await runFeatureCase(
      "readable-stream-source",
      () => runReadableStreamSourceFeature(buffer),
    ),

    await runFeatureCase("cmaf-output", runCmafOutputFeature),
    await runFeatureCase("mpeg-ts-output", runMpegTsOutputFeature),
    await runFeatureCase("adts-output", runAdtsOutputFeature),
    await runFeatureCase("hls-output", runHlsOutputFeature),

    await runFeatureCase("webvtt-output", async () => {
      const [mp4Bytes, mkvBytes] = await Promise.all([
        writeSubtitleFixture(new Mp4OutputFormat()),
        writeSubtitleFixture(new MkvOutputFormat()),
      ])
      return {
        status: "pass",
        details: {
          mp4Bytes,
          mkvBytes,
          subtitleReadSupport: false,
        },
      }
    }),

    await runFeatureCase("conversion-copy", async () => {
      const converted = await convertFixture(buffer, {
        copy: { mode: "forced" },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const input = createInput(converted.buffer)
      try {
        const tracks = await input.getTracks()
        if (tracks.length !== 2) throw new Error(`Expected 2 copied tracks, got ${tracks.length}`)
        return {
          status: "pass",
          details: {
            bytes: converted.buffer.byteLength,
            tracks: tracks.length,
            duration: await input.computeDuration(),
          },
        }
      } finally {
        input.dispose()
      }
    }),

    await runFeatureCase("video-resize", async () => {
      const converted = await convertFixture(buffer, {
        video: {
          codec: "vp8",
          width: 160,
          height: 90,
          fit: "fill",
          forceTranscode: true,
        },
        audio: { discard: true },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const video = await inspectVideoTrack(converted.buffer)
      if (video.width !== 160 || video.height !== 90 || video.samples === 0) {
        throw new Error(`Unexpected resized video result: ${JSON.stringify(video)}`)
      }
      return { status: "pass", details: video }
    }),

    await runFeatureCase("video-frame-rate", async () => {
      const converted = await convertFixture(buffer, {
        video: {
          codec: "vp8",
          frameRate: 15,
          forceTranscode: true,
        },
        audio: { discard: true },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const video = await inspectVideoTrack(converted.buffer)
      if (video.samples < 14 || video.samples > 16) {
        throw new Error(`Expected about 15 frames after frame-rate conversion, got ${video.samples}`)
      }
      return { status: "pass", details: video }
    }),

    await runFeatureCase("audio-resample-downmix", async () => {
      const converted = await convertAudioPcmFixture(buffer)
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const audio = await inspectAudioTrack(converted.buffer)
      if (audio.numberOfChannels !== 1 || audio.sampleRate !== 24_000 || audio.decodedFrames === 0) {
        throw new Error(`Unexpected resampled audio result: ${JSON.stringify(audio)}`)
      }
      return { status: "pass", details: audio }
    }),

    await runFeatureCase("video-rotate-90", async () => {
      const converted = await convertFixture(buffer, {
        video: {
          codec: "vp8",
          rotate: 90,
          allowTransformationMetadata: false,
          forceTranscode: true,
        },
        audio: { discard: true },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const video = await inspectVideoTrack(converted.buffer)
      if (video.width !== HEIGHT || video.height !== WIDTH || video.samples === 0) {
        throw new Error(`Unexpected rotated video result: ${JSON.stringify(video)}`)
      }
      return { status: "pass", details: video }
    }),

    await runFeatureCase("video-crop", async () => {
      const converted = await convertFixture(buffer, {
        video: {
          codec: "vp8",
          crop: { left: 80, top: 45, width: 160, height: 90 },
          allowTransformationMetadata: false,
          forceTranscode: true,
        },
        audio: { discard: true },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const video = await inspectVideoTrack(converted.buffer)
      if (video.width !== 160 || video.height !== 90 || video.samples === 0) {
        throw new Error(`Unexpected cropped video result: ${JSON.stringify(video)}`)
      }
      return { status: "pass", details: video }
    }),

    await runFeatureCase("video-flip", async () => {
      const converted = await convertFixture(buffer, {
        video: {
          codec: "vp8",
          flip: true,
          allowTransformationMetadata: false,
          forceTranscode: true,
        },
        audio: { discard: true },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const signature = await inspectFlipSignature(converted.buffer)
      if (signature.leftRed <= signature.rightRed + 40) {
        throw new Error(`Horizontal flip did not reverse the source red gradient: ${JSON.stringify(signature)}`)
      }
      return { status: "pass", details: signature }
    }),

    await runFeatureCase("trim", async () => {
      const converted = await convertFixture(buffer, {
        trim: { start: 0.2, end: 0.8 },
        video: { codec: "vp8" },
        audio: { codec: "opus" },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }

      const input = createInput(converted.buffer)
      try {
        const duration = await input.computeDuration()
        if (duration < 0.5 || duration > 0.7) {
          throw new Error(`Expected roughly 0.6s trimmed duration, got ${duration}`)
        }
        return {
          status: "pass",
          details: { duration, bytes: converted.buffer.byteLength },
        }
      } finally {
        input.dispose()
      }
    }),

    await runFeatureCase("process-callbacks", async () => {
      let videoCalls = 0
      let audioCalls = 0
      const converted = await convertFixture(buffer, {
        video: {
          codec: "vp8",
          forceTranscode: true,
          process(sample) {
            videoCalls += 1
            return sample
          },
        },
        audio: {
          codec: "opus",
          forceTranscode: true,
          process(sample) {
            audioCalls += 1
            return sample
          },
        },
      })
      if (converted.status === "unsupported") {
        return {
          status: "unsupported",
          details: { discardedTracks: converted.discardedTracks },
        }
      }
      if (videoCalls === 0 || audioCalls === 0) {
        throw new Error(`Expected both processing callbacks to run, got video=${videoCalls}, audio=${audioCalls}`)
      }
      return {
        status: "pass",
        details: {
          videoCalls,
          audioCalls,
          bytes: converted.buffer.byteLength,
        },
      }
    }),
  ]
}

function buildSummary(
  features: readonly FeatureCaseResult[],
  video: readonly CodecRoundTripResult[],
  audio: readonly CodecRoundTripResult[],
): MediaBunnyBenchmarkReport["summary"] {
  const statuses = [
    ...features.map((entry) => entry.status),
    ...video.map((entry) => entry.status),
    ...audio.map((entry) => entry.status),
  ]

  return {
    passes: statuses.filter((status) => status === "pass").length,
    unsupported: statuses.filter((status) => status === "unsupported").length,
    knownGaps: statuses.filter((status) => status === "known-gap").length,
    timeouts: statuses.filter((status) => status === "timeout").length,
    errors: statuses.filter((status) => status === "error").length,
  }
}

export function refreshMediaBunnyBenchmarkSummary(report: MediaBunnyBenchmarkReport): void {
  report.summary = buildSummary(
    report.features,
    report.codecRoundTrips.video,
    report.codecRoundTrips.audio,
  )
}

export async function runMediaBunnyBenchmark(
  backend: BenchmarkBackend,
  options: MediaBunnyBenchmarkOptions = {},
): Promise<MediaBunnyBenchmarkReport> {
  const capabilityStarted = performance.now()
  const video: CapabilityResult<VideoCodec>[] = []
  for (const codec of VIDEO_CODECS) video.push(await videoCapability(codec))
  const audio: CapabilityResult<AudioCodec>[] = []
  for (const codec of AUDIO_CODECS) audio.push(await audioCapability(codec))

  const measurements: Measurement[] = [{
    name: "query-codec-capabilities",
    milliseconds: performance.now() - capabilityStarted,
  }]

  const buffer = await encodeFixture(measurements)
  const roundTrip = await inspectFixture(buffer, measurements)
  const features = await runFeatureCases(backend, buffer)
  const skippedVideoCodecs = new Set(options.skipVideoCodecRoundTrips ?? [])
  const videoCodecRoundTrips = await runVideoCodecRoundTrips(video, backend, skippedVideoCodecs)
  const audioCodecRoundTrips = await runAudioCodecRoundTrips(audio)

  return {
    schemaVersion: 2,
    backend,
    generatedAt: new Date().toISOString(),
    workload: {
      width: WIDTH,
      height: HEIGHT,
      frameRate: FRAME_RATE,
      videoFrames: VIDEO_FRAMES,
      audioSampleRate: AUDIO_SAMPLE_RATE,
      audioChannels: AUDIO_CHANNELS,
      durationSeconds: DURATION_SECONDS,
    },
    capabilities: { video, audio },
    measurements,
    features,
    codecRoundTrips: {
      video: videoCodecRoundTrips,
      audio: audioCodecRoundTrips,
    },
    roundTrip,
    summary: buildSummary(features, videoCodecRoundTrips, audioCodecRoundTrips),
  }
}
