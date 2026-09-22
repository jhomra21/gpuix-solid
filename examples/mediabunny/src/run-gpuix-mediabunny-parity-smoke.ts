import {
  ALL_FORMATS,
  AUDIO_CODECS,
  BufferSource,
  Input,
  Quality,
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
  fullCodecCapabilitySurface: true,
}))
