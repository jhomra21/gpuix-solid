import { mkdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  ALL_FORMATS,
  AUDIO_CODECS,
  BufferSource,
  FilePathSource,
  FilePathTarget,
  HlsOutputFormat,
  Input,
  MpegTsOutputFormat,
  Output,
  PathedTarget,
  Quality,
  UrlSource,
  VideoSample,
  VideoSampleSource,
  VIDEO_CODECS,
  VideoSampleSink,
  canDecodeAudio,
  canDecodeVideo,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny"
import {
  MediaBunnyGpuixPresenter,
  registerGpuixMediaBunny,
  type GpuixVideoFrameRenderer,
} from "./gpuix-mediabunny.ts"

if (process.platform !== "darwin") {
  console.log("GPUix MediaBunny parity smoke skipped: macOS only")
  process.exit(0)
}

const [nativeFixturePath, fallbackFixturePath] = process.argv.slice(2)
if (!nativeFixturePath || !fallbackFixturePath) {
  throw new Error("Expected native AVC/HEVC and fallback video fixture paths")
}

const registration = registerGpuixMediaBunny()
if (!registration.serverFallback) {
  throw new Error("MediaBunny Server fallback was not registered")
}

const videoDecode: Record<string, boolean> = {}
const videoEncode: Record<string, boolean> = {}
for (const codec of VIDEO_CODECS) {
  videoDecode[codec] = await canDecodeVideo(codec, {
    codedWidth: 64,
    codedHeight: 36,
  })
  videoEncode[codec] = await canEncodeVideo(codec, {
    width: 64,
    height: 36,
    frameRate: 30,
    quality: new Quality("medium"),
  })
}

const audioDecode: Record<string, boolean> = {}
const audioEncode: Record<string, boolean> = {}
for (const codec of AUDIO_CODECS) {
  audioDecode[codec] = await canDecodeAudio(codec, {
    numberOfChannels: 2,
    sampleRate: 48_000,
  })
  audioEncode[codec] = await canEncodeAudio(codec, {
    numberOfChannels: 2,
    sampleRate: 48_000,
    quality: new Quality("medium"),
  })
}

function unsupported(capabilities: Record<string, boolean>): string[] {
  return Object.entries(capabilities)
    .filter(([, supported]) => !supported)
    .map(([codec]) => codec)
}

const missing = {
  videoDecode: unsupported(videoDecode),
  videoEncode: unsupported(videoEncode),
  audioDecode: unsupported(audioDecode),
  audioEncode: unsupported(audioEncode),
}
if (Object.values(missing).some((codecs) => codecs.length > 0)) {
  throw new Error("MediaBunny parity capability gap: " + JSON.stringify(missing))
}

class RecordingRenderer implements GpuixVideoFrameRenderer {
  iosurfaceCalls = 0
  bgraCalls = 0
  lastBytes = 0

  getVideoFrameIosurfaceVersion() {
    return 1
  }

  setVideoFrameIosurface(_elementId: number, handle: Uint8Array) {
    this.iosurfaceCalls += 1
    this.lastBytes = handle.byteLength
  }

  setVideoFrameBgra(
    _elementId: number,
    width: number,
    height: number,
    data: Uint8Array,
  ) {
    if (data.byteLength < width * height * 4) {
      throw new Error("BGRA presenter received a short pixel buffer")
    }
    this.bgraCalls += 1
    this.lastBytes = data.byteLength
  }
}

async function firstSample(path: string) {
  const fixture = await Bun.file(path).arrayBuffer()
  const input = new Input({
    source: new BufferSource(fixture),
    formats: ALL_FORMATS,
  })
  const track = await input.getPrimaryVideoTrack()
  if (!track) {
    input.dispose()
    throw new Error("Parity presenter fixture has no video track")
  }
  const sink = new VideoSampleSink(track)
  const sample = await sink.getSample(await track.getFirstTimestamp())
  if (!sample) {
    input.dispose()
    throw new Error("Parity presenter fixture produced no sample")
  }
  return { input, track, sample }
}

const native = await firstSample(nativeFixturePath)
let nativeCodec = ""
let nativePath = ""
try {
  nativeCodec = await native.track.getCodec()
  const renderer = new RecordingRenderer()
  const presenter = new MediaBunnyGpuixPresenter(renderer, 1)
  const result = await presenter.present(native.sample)
  nativePath = result.path
  if (
    result.path !== "iosurface"
    || renderer.iosurfaceCalls !== 1
    || renderer.bgraCalls !== 0
    || result.bytes === 0
  ) {
    throw new Error("Native MediaBunny sample did not use IOSurface presentation")
  }
} finally {
  native.sample.close()
  native.input.dispose()
}

const fallback = await firstSample(fallbackFixturePath)
let fallbackCodec = ""
let fallbackPath = ""
try {
  fallbackCodec = await fallback.track.getCodec()
  const renderer = new RecordingRenderer()
  const presenter = new MediaBunnyGpuixPresenter(renderer, 1)
  const result = await presenter.present(fallback.sample)
  fallbackPath = result.path
  if (
    result.path !== "bgra"
    || renderer.bgraCalls !== 1
    || renderer.iosurfaceCalls !== 0
    || result.bytes === 0
  ) {
    throw new Error("Fallback MediaBunny sample did not use BGRA presentation")
  }
} finally {
  fallback.sample.close()
  fallback.input.dispose()
}


async function verifyVideoInput(input: Input, label: string) {
  try {
    if (!await input.canRead()) {
      throw new Error(label + " could not read media")
    }
    const track = await input.getPrimaryVideoTrack()
    if (!track) throw new Error(label + " has no video track")
    const sample = await new VideoSampleSink(track).getSample(
      await track.getFirstTimestamp(),
    )
    if (!sample) throw new Error(label + " decoded no sample")
    const result = {
      codec: await track.getCodec(),
      width: sample.codedWidth,
      height: sample.codedHeight,
    }
    sample.close()
    return result
  } finally {
    input.dispose()
  }
}

async function runUrlSourceSmoke(path: string) {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer())
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      if (url.pathname !== "/fixture.mp4") {
        return new Response("not found", { status: 404 })
      }

      const commonHeaders = {
        "accept-ranges": "bytes",
        "content-type": "video/mp4",
      }

      if (request.method === "HEAD") {
        return new Response(null, {
          headers: {
            ...commonHeaders,
            "content-length": String(bytes.byteLength),
          },
        })
      }

      const range = request.headers.get("range")
      const match = range?.match(/^bytes=(\d+)-(\d*)$/)
      if (match) {
        const start = Number(match[1])
        const requestedEnd = match[2] ? Number(match[2]) : bytes.byteLength - 1
        const end = Math.min(requestedEnd, bytes.byteLength - 1)
        if (
          !Number.isInteger(start)
          || !Number.isInteger(end)
          || start < 0
          || start > end
          || start >= bytes.byteLength
        ) {
          return new Response(null, {
            status: 416,
            headers: {
              ...commonHeaders,
              "content-range": "bytes */" + bytes.byteLength,
            },
          })
        }

        const body = bytes.slice(start, end + 1)
        return new Response(body, {
          status: 206,
          headers: {
            ...commonHeaders,
            "content-length": String(body.byteLength),
            "content-range": "bytes " + start + "-" + end + "/" + bytes.byteLength,
          },
        })
      }

      return new Response(bytes.slice(), {
        headers: {
          ...commonHeaders,
          "content-length": String(bytes.byteLength),
        },
      })
    },
  })

  try {
    return await verifyVideoInput(
      new Input({
        source: new UrlSource(
          "http://127.0.0.1:" + server.port + "/fixture.mp4",
        ),
        formats: ALL_FORMATS,
      }),
      "UrlSource",
    )
  } finally {
    server.stop(true)
  }
}

function makeHlsSample(index: number, frameCount: number) {
  const width = 64
  const height = 36
  const bytes = new Uint8Array(width * height * 4)
  const phase = index / Math.max(1, frameCount - 1)
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4
    bytes[offset] = Math.round(255 * phase)
    bytes[offset + 1] = pixel % width
    bytes[offset + 2] = Math.floor(pixel / width)
    bytes[offset + 3] = 255
  }
  return new VideoSample(bytes, {
    format: "RGBA",
    codedWidth: width,
    codedHeight: height,
    timestamp: index / 30,
    duration: 1 / 30,
  })
}

async function runFilePathHlsSmoke() {
  const directory = join(
    tmpdir(),
    "gpuix-mediabunny-hls-" + process.pid + "-" + Date.now(),
  )
  await mkdir(directory, { recursive: true })

  try {
    const target = new PathedTarget("master.m3u8", ({ path }) => (
      new FilePathTarget(join(directory, path))
    ))
    const output = new Output({
      format: new HlsOutputFormat({
        segmentFormat: new MpegTsOutputFormat(),
      }),
      target,
    })
    const source = new VideoSampleSource({
      codec: "avc",
      quality: new Quality("medium"),
    })
    output.addVideoTrack(source, { frameRate: 30 })

    await output.start()
    const frameCount = 12
    for (let index = 0; index < frameCount; index += 1) {
      const sample = makeHlsSample(index, frameCount)
      try {
        await source.add(sample)
      } finally {
        sample.close()
      }
    }
    source.close()
    await output.finalize()

    return await verifyVideoInput(
      new Input({
        source: new FilePathSource(join(directory, "master.m3u8")),
        formats: ALL_FORMATS,
      }),
      "FilePathSource HLS",
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const [urlSource, filePathHls] = await Promise.all([
  runUrlSourceSmoke(nativeFixturePath),
  runFilePathHlsSmoke(),
])

console.log(JSON.stringify({
  registration,
  videoDecode,
  videoEncode,
  audioDecode,
  audioEncode,
  nativeCodec,
  nativePath,
  fallbackCodec,
  fallbackPath,
  urlSource,
  filePathHls,
  urlSourceSupport: true,
  filePathSourceSupport: true,
  filePathTargetSupport: true,
  hlsInputSupport: true,
  fullCodecCapabilitySurface: true,
}))
