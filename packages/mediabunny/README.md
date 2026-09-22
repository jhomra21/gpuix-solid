# @jhomra21/gpuix-mediabunny

MediaBunny integration for GPUix applications.

The package keeps normal MediaBunny APIs in charge of containers, tracks, packets, samples, conversion, muxing, and fallback codecs. On macOS, AVC and HEVC decoding can use a native VideoToolbox path that keeps decoded frames backed by `CVPixelBuffer`/IOSurface resources until GPUix presents them.

## Register the integration

Register GPUix before creating MediaBunny sinks or starting conversions:

```ts
import { registerGpuixMediaBunny } from "@jhomra21/gpuix-mediabunny"

const registration = registerGpuixMediaBunny()
```

Registration installs:

- the VideoToolbox custom decoder when the macOS addon is available;
- `@mediabunny/prores` and `@mediabunny/server` as the broad codec fallback;
- `@napi-rs/canvas` globals needed by MediaBunny Canvas APIs in Bun/Node;
- the GPUix-compatible CanvasSink bridge.

`registration.videoToolbox` reports whether the native decoder was registered. `registration.serverFallback` reports whether the server fallback was registered.

## Present a VideoSample through GPUix

```ts
import {
  MediaBunnyGpuixPresenter,
  registerGpuixMediaBunny,
} from "@jhomra21/gpuix-mediabunny"
import { VideoSampleSink } from "mediabunny"

registerGpuixMediaBunny()

const sink = new VideoSampleSink(videoTrack)
const sample = await sink.getSample(timestamp)

if (sample) {
  try {
    const presenter = new MediaBunnyGpuixPresenter(renderer, videoFrameElementId)
    await presenter.present(sample)
  } finally {
    sample.close()
  }
}
```

For a VideoToolbox-backed AVC/HEVC sample, `MediaBunnyGpuixPresenter` hands the IOSurface directly to GPUix. Other sample resources use MediaBunny's `copyTo(..., { format: "BGRA" })` path and GPUix's BGRA video-frame surface.

The same native sample remains a normal MediaBunny `VideoSample`: cloning, random access, transforms, `copyTo`, and conversion all work. If VideoToolbox returns a hardware pixel format that does not have a direct MediaBunny plane mapping, RGB requests fall back through CoreImage instead of disabling native presentation.

## Codec coverage

The repository acceptance suite currently passes real encode → mux → demux → decode round trips for:

- video: AVC, HEVC, VP8, VP9, AV1, and ProRes;
- audio: AAC, Opus, MP3, Vorbis, FLAC, AC-3, E-AC-3, DTS, PCM u8/s8/s16/s24/s32/f32/f64 in tested endian variants, μ-law, and A-law.

AVC and HEVC use the custom VideoToolbox decoder on supported macOS hardware. The wider codec surface comes from MediaBunny's server extension. Capability registration does not replace MediaBunny's own codec/container rules.

The same suite covers CanvasSource/CanvasSink, metadata, conversion progress, remuxing, resize/frame-rate/rotate/crop/flip/trim/process transforms, audio resampling/downmixing, fragmented MP4, streams, blobs, ranged sources, CMAF, MPEG-TS, ADTS, HLS, WebVTT subtitles, URL sources, file-path I/O, and GPUix video presentation.

The current GPUix backend scorecard is **50 passes, 0 unsupported, 0 known gaps, 0 timeouts, 0 errors**.

## Native addon

The VideoToolbox addon is macOS-only. In this repository it is built with:

```bash
cd packages/mediabunny
bun install --no-save
bun run build:native
```

If the addon is absent or the supplied AVC/HEVC configuration cannot open a hardware VideoToolbox decoder, the custom decoder declines the configuration and MediaBunny can use its registered server fallback instead.

The native path intentionally requires hardware decoding; it does not silently turn a native-performance benchmark into a software decode.

## Current boundaries

A few boundaries are intentionally outside the parity claim:

- browser device APIs such as live `MediaStreamTrack` capture are not emulated in a headless/native Bun process;
- MediaBunny 1.59 can issue a direct child HLS `FilePathSource` read before the child source has been sized/opened; repository HLS file readback uses MediaBunny's `CustomPathedSource` around file bytes instead;
- VideoToolbox acceleration is currently implemented for AVC and HEVC. Other codecs are functional through MediaBunny Server rather than a GPUix-specific native decoder.

These are kept separate from the tested MediaBunny file/conversion/codec surface so unsupported environment APIs are not counted as successful parity.
