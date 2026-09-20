import {
  ALL_FORMATS,
  AudioSample,
  AudioSampleSink,
  AudioSampleSource,
  BufferSource,
  BufferTarget,
  EncodedPacketSink,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  VideoSample,
  VideoSampleSink,
  VideoSampleSource,
  canDecodeAudio,
  canDecodeVideo,
  canEncodeAudio,
  canEncodeVideo,
  type AudioCodec,
  type VideoCodec,
} from "mediabunny"

export type BenchmarkBackend = "mediabunny-server" | "napi-webcodecs"

type CapabilityResult = {
  codec: string
  encode: boolean
  decode: boolean
  queryMs: number
  error?: string
}

type Measurement = {
  name: string
  milliseconds: number
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
    video: CapabilityResult[]
    audio: CapabilityResult[]
  }
  measurements: Measurement[]
  roundTrip: RoundTripResult
}

const VIDEO_CODECS: readonly VideoCodec[] = ["avc", "hevc", "vp8", "vp9", "av1", "prores"]
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function videoCapability(codec: VideoCodec): Promise<CapabilityResult> {
  const started = performance.now()
  try {
    const [encode, decode] = await Promise.all([
      canEncodeVideo(codec, {
        width: WIDTH,
        height: HEIGHT,
        frameRate: FRAME_RATE,
        quality: new Quality({ bitrate: 750_000 }),
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
      error: errorMessage(error),
    }
  }
}

async function audioCapability(codec: AudioCodec): Promise<CapabilityResult> {
  const started = performance.now()
  try {
    const [encode, decode] = await Promise.all([
      canEncodeAudio(codec, {
        numberOfChannels: AUDIO_CHANNELS,
        sampleRate: AUDIO_SAMPLE_RATE,
        quality: new Quality({ bitrate: 128_000 }),
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
      error: errorMessage(error),
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

async function encodeFixture(measurements: Measurement[]): Promise<ArrayBuffer> {
  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "fragmented" }),
    target,
  })
  const videoSource = new VideoSampleSource({
    codec: "avc",
    quality: new Quality({ bitrate: 750_000 }),
  })
  const audioSource = new AudioSampleSource({
    codec: "aac",
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
  measurements.push({ name: "encode-mp4-avc-aac", milliseconds: performance.now() - started })

  if (!target.buffer || target.buffer.byteLength === 0) {
    throw new Error("MediaBunny produced an empty MP4 buffer")
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
    if (!(await input.canRead())) throw new Error("MediaBunny cannot read its generated MP4 fixture")

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

    if (!videoTrack || !audioTrack) throw new Error("Generated MP4 is missing its video or audio track")
    if (!format || !mimeType || tracks.length < 2 || !metadata) {
      throw new Error("Generated MP4 metadata inspection returned an incomplete result")
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
    if (!seekSample) throw new Error("VideoSampleSink could not seek into generated MP4")
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

export async function runMediaBunnyBenchmark(backend: BenchmarkBackend): Promise<MediaBunnyBenchmarkReport> {
  const capabilityStarted = performance.now()
  const [video, audio] = await Promise.all([
    Promise.all(VIDEO_CODECS.map(videoCapability)),
    Promise.all(AUDIO_CODECS.map(audioCapability)),
  ])
  const measurements: Measurement[] = [{
    name: "query-codec-capabilities",
    milliseconds: performance.now() - capabilityStarted,
  }]

  const buffer = await encodeFixture(measurements)
  const roundTrip = await inspectFixture(buffer, measurements)

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
    roundTrip,
  }
}
