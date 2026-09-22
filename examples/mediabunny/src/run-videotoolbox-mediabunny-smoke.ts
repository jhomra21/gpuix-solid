import { registerMediabunnyServer } from "@mediabunny/server"
import {
  ALL_FORMATS,
  BufferSource,
  Input,
  VideoSampleSink,
} from "mediabunny"
import {
  getVideoToolboxVideoSampleResource,
  registerVideoToolboxMediaDecoder,
} from "./videotoolbox-mediabunny.ts"

if (process.platform !== "darwin") {
  console.log("MediaBunny VideoToolbox integration smoke skipped: macOS only")
  process.exit(0)
}

const fixturePath = process.argv[2]
if (!fixturePath) throw new Error("Expected a fixture path")

if (!registerVideoToolboxMediaDecoder()) {
  throw new Error("Could not register the VideoToolbox MediaBunny decoder")
}
registerMediabunnyServer()

const fixture = await Bun.file(fixturePath).arrayBuffer()
const input = new Input({
  source: new BufferSource(fixture),
  formats: ALL_FORMATS,
})

try {
  const track = await input.getPrimaryVideoTrack()
  if (!track) throw new Error("MediaBunny integration smoke fixture has no video track")

  const codec = await track.getCodec()
  if (codec !== "avc" && codec !== "hevc") {
    throw new Error("MediaBunny integration smoke requires AVC or HEVC")
  }

  if (!await track.canDecode()) {
    throw new Error("MediaBunny did not report the registered native decoder as decodable")
  }

  const sink = new VideoSampleSink(track)
  let frames = 0
  let copiedBytes = 0
  let iosurfaceHandleBytes = 0
  let previousTimestamp = -Infinity
  let cloneIosurface = false
  let transformBytes = 0

  for await (const sample of sink.samples()) {
    try {
      if (sample.timestamp < previousTimestamp) {
        throw new Error("MediaBunny native samples were not presentation ordered")
      }
      previousTimestamp = sample.timestamp

      const resource = getVideoToolboxVideoSampleResource(sample)
      if (!resource) {
        throw new Error("VideoSampleSink did not use the VideoToolbox sample resource")
      }

      const handle = resource.iosurfaceHandle
      if (!Buffer.isBuffer(handle) || handle.byteLength === 0) {
        throw new Error("MediaBunny native sample has no IOSurface handle")
      }
      iosurfaceHandleBytes = handle.byteLength

      if (frames === 0) {
        const bytesNeeded = sample.allocationSize()
        const pixels = new Uint8Array(bytesNeeded)
        await sample.copyTo(pixels)
        if (pixels.byteLength === 0 || !pixels.some((value) => value !== 0)) {
          throw new Error("MediaBunny native sample copyTo() produced no pixel data")
        }
        copiedBytes = pixels.byteLength

        const clone = sample.clone()
        try {
          const cloneResource = getVideoToolboxVideoSampleResource(clone)
          if (!cloneResource || cloneResource.iosurfaceHandle.byteLength === 0) {
            throw new Error("Cloned native VideoSample lost its IOSurface resource")
          }
          cloneIosurface = true
        } finally {
          clone.close()
        }

        const transformed = await sample.transform({
          width: 32,
          height: 18,
          fit: "fill",
        })
        try {
          if (transformed.codedWidth !== 32 || transformed.codedHeight !== 18) {
            throw new Error(
              "Native VideoSample transform returned unexpected dimensions "
              + transformed.codedWidth
              + "x"
              + transformed.codedHeight,
            )
          }
          const transformedPixels = new Uint8Array(
            transformed.allocationSize({ format: "RGBA" }),
          )
          await transformed.copyTo(transformedPixels, { format: "RGBA" })
          if (!transformedPixels.some((value) => value !== 0)) {
            throw new Error("Native VideoSample transform produced no pixel data")
          }
          transformBytes = transformedPixels.byteLength
        } finally {
          transformed.close()
        }
      }

      frames += 1
    } finally {
      sample.close()
    }
  }

  if (frames === 0) {
    throw new Error("MediaBunny VideoToolbox integration produced no samples")
  }

  const duration = await input.computeDuration()
  const seekTimestamp = duration / 2
  const randomSample = await sink.getSample(seekTimestamp)
  if (!randomSample) {
    throw new Error("MediaBunny VideoToolbox random-access decode returned no sample")
  }

  let randomTimestamp = 0
  try {
    const resource = getVideoToolboxVideoSampleResource(randomSample)
    if (!resource) {
      throw new Error("Random-access sample did not use the VideoToolbox resource")
    }
    randomTimestamp = randomSample.timestamp
    if (resource.iosurfaceHandle.byteLength === 0) {
      throw new Error("Random-access sample has no IOSurface handle")
    }
  } finally {
    randomSample.close()
  }

  console.log(
    JSON.stringify({
      codec,
      frames,
      copiedBytes,
      iosurfaceHandleBytes,
      seekTimestamp,
      randomTimestamp,
      nativeMediaBunnyDecoder: true,
      videoSampleSink: true,
      copyTo: true,
      cloneIosurface,
      transformBytes,
      transform: transformBytes > 0,
      randomAccess: true,
    }),
  )
} finally {
  input.dispose()
}
