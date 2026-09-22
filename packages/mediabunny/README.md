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

The same suite covers CanvasSource/CanvasSink, metadata, conversion progress, remuxing, resize/frame-rate/rotate/crop/flip/trim/process transforms, audio resampling/downmixing, fragmented MP4, streams, blobs, ranged sources, CMAF, MPEG-TS, ADTS, HLS, WebVTT subtitles, URL sources, file-path I/O, multi-file filesystem HLS, and GPUix video presentation.

The current GPUix backend scorecard is **50 passes, 0 unsupported, 0 known gaps, 0 timeouts, 0 errors**.

## Native addon

The VideoToolbox addon is macOS-only. Current npm releases require dependency install scripts to be reviewed explicitly. For a fresh npm consumer, install dependencies first, approve this package's reviewed native build, then rebuild it:

```bash
npm install
npm install-scripts approve @jhomra21/gpuix-mediabunny
npm rebuild @jhomra21/gpuix-mediabunny
```

`npm install-scripts approve` records the resolved package identity in the root project's `allowScripts` policy, so the approval can be committed with the workspace. This is the flow the future `diffusion-editor-gpuix` npm workspace should use. We do not blanket-approve unrelated native scripts.

If this package's install script is not approved, the integration still works through MediaBunny Server, but `registration.videoToolbox` is false and AVC/HEVC use the fallback path.

In this repository the addon can also be built explicitly with:

```bash
cd packages/mediabunny
bun install --no-save
bun run build:native
```

If native compilation is unavailable or the supplied AVC/HEVC configuration cannot open a hardware VideoToolbox decoder, the custom decoder declines the configuration and MediaBunny uses the registered server fallback instead. The package remains functional without the addon.

For filesystem-backed multi-file media such as HLS, use `createGpuixFilePathSource(rootPath)`. It preserves MediaBunny's public PathedSource behavior while avoiding MediaBunny 1.59's child `FilePathSource` open-order edge case.

The native path intentionally requires hardware decoding; it does not silently turn a native-performance benchmark into a software decode.

## Current boundaries

A few boundaries are intentionally outside the parity claim:

- browser device APIs such as live `MediaStreamTrack` capture are not emulated in a headless/native Bun process;
- VideoToolbox acceleration is currently implemented for AVC and HEVC. Other codecs are functional through MediaBunny Server rather than a GPUix-specific native decoder.

These are kept separate from the tested MediaBunny file/conversion/codec surface so unsupported environment APIs are not counted as successful parity.
