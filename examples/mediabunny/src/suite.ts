import {
  ALL_FORMATS,
  AudioSample,
  AudioSampleSink,
  AudioSampleSource,
  BufferSource,
  BufferTarget,
  Conversion,
  EncodedPacketSink,
  FlacOutputFormat,
  Input,
  MkvOutputFormat,
  MovOutputFormat,
  Mp3OutputFormat,
  Mp4OutputFormat,
  OggOutputFormat,
  WebMOutputFormat,
  Output,
  Quality,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  WavOutputFormat,
  canDecodeAudio,
  canDecodeVideo,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type VideoCodec,
} from "mediabunny"

export type BenchmarkBackend = "browser-webcodecs" | "mediabunny-server" | "napi-webcodecs"

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
  status: "pass" | "unsupported" | "error"
  milliseconds: number
  details?: Record<string, FeatureDetail>
  error?: string
}

type FeatureExecution =
  | { status: "pass"; details?: Record<string, FeatureDetail> }
  | { status: "unsupported"; details?: Record<string, FeatureDetail> }

type CodecRoundTripResult = {
  codec: string
  status: "pass" | "unsupported" | "error"
  encodeMs?: number
  decodeMs?: number
  bytes?: number
  decodedSamples?: number
  decodedFrames?: number
  container?: string
  error?: string
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
  schemaVersion: 1
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

function makeCodecVideoSample(frameIndex: number, frameCount: number): VideoSample {
  const width = 160
  const height = 90
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
  if (codec === "prores") return new MovOutputFormat()
  if (codec === "avc" || codec === "hevc") return new Mp4OutputFormat({ fastStart: "fragmented" })
  return new WebMOutputFormat()
}

async function runVideoCodecRoundTrip(
  capability: CapabilityResult<VideoCodec>,
): Promise<CodecRoundTripResult> {
  if (!capability.encode || !capability.decode) {
    return { codec: capability.codec, status: "unsupported" }
  }

  const codec = capability.codec
  const frameCount = 6
  const target = new BufferTarget()
  const format = videoCodecOutputFormat(codec)
  if (!format.getSupportedVideoCodecs().includes(codec)) {
    return {
      codec,
      status: "error",
      error: `No selected output format can contain ${codec}`,
    }
  }

  try {
    const output = new Output({ format, target })
    const source = new VideoSampleSource({
      codec,
      quality: new Quality("medium"),
    })
    output.addVideoTrack(source, { frameRate: FRAME_RATE })

    const encodeStarted = performance.now()
    await output.start()
    for (let frame = 0; frame < frameCount; frame += 1) {
      const sample = makeCodecVideoSample(frame, frameCount)
      try {
        await source.add(sample)
      } finally {
        sample.close()
      }
    }
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
    }
  } catch (error) {
    return {
      codec,
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runVideoCodecRoundTrips(
  capabilities: readonly CapabilityResult<VideoCodec>[],
): Promise<CodecRoundTripResult[]> {
  const results: CodecRoundTripResult[] = []
  for (const capability of capabilities) {
    results.push(await runVideoCodecRoundTrip(capability))
  }
  return results
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

async function runFeatureCases(buffer: ArrayBuffer): Promise<FeatureCaseResult[]> {
  return [
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

export async function runMediaBunnyBenchmark(backend: BenchmarkBackend): Promise<MediaBunnyBenchmarkReport> {
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
  const features = await runFeatureCases(buffer)
  const videoCodecRoundTrips = await runVideoCodecRoundTrips(video)
  const audioCodecRoundTrips = await runAudioCodecRoundTrips(audio)

  return {
    schemaVersion: 1,
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
  }
}
