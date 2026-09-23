# @jhomra21/gpuix-mediabunny

MediaBunny integration for GPUix applications.

The package keeps normal MediaBunny APIs in charge of containers, tracks, packets, samples, conversion, muxing, and fallback codecs. On macOS, AVC, HEVC, and supported ProRes sample entries can use a native VideoToolbox path that keeps decoded frames backed by `CVPixelBuffer`/IOSurface resources until GPUix presents them.

## Register the integration

Register GPUix before creating MediaBunny sinks or starting conversions:

```ts
import { registerGpuixMediaBunny } from "@jhomra21/gpuix-mediabunny"

const registration = registerGpuixMediaBunny()
```

Registration installs:

- the VideoToolbox custom decoder when the macOS addon is available;
- a Bun-specific ProRes fallback that runs TurboRes without shared memory or worker threads;
- `@mediabunny/server` as the broad codec fallback;
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

For any VideoToolbox-backed sample, including supported ProRes samples, `MediaBunnyGpuixPresenter` hands the IOSurface directly to GPUix. Other sample resources use MediaBunny's `copyTo(..., { format: "BGRA" })` path and GPUix's BGRA video-frame surface.

The same native sample remains a normal MediaBunny `VideoSample`: cloning, random access, transforms, `copyTo`, and conversion all work. CoreVideo NV12 and planar 8-bit 4:2:0 frames map directly to MediaBunny formats. If VideoToolbox returns another hardware layout that MediaBunny does not model directly, CPU reads fall back lazily through CoreImage as RGBA instead of disabling native presentation.

## Codec coverage

The repository acceptance suite currently passes real encode → mux → demux → decode round trips for:

- video: AVC, HEVC, VP8, VP9, AV1, and ProRes;
- audio: AAC, Opus, MP3, Vorbis, FLAC, AC-3, E-AC-3, DTS, PCM u8/s8/s16/s24/s32/f32/f64 in tested endian variants, μ-law, and A-law.

AVC and HEVC use the custom VideoToolbox decoder on supported macOS hardware. ProRes sample entries `apco`, `apcs`, `apcn`, `apch`, `ap4h`, and `ap4x` use the same path when VideoToolbox exposes a hardware decoder. Under Bun, ProRes falls back to a TurboRes decoder with shared memory and worker threads disabled. The remaining codec coverage comes from MediaBunny Server. Capability registration does not replace MediaBunny's own codec or container rules.

The same suite covers CanvasSource/CanvasSink, metadata, conversion progress, remuxing, resize/frame-rate/rotate/crop/flip/trim/process transforms, audio resampling/downmixing, fragmented MP4, streams, blobs, ranged sources, CMAF, MPEG-TS, ADTS, HLS, WebVTT subtitles, URL sources, file-path I/O, multi-file filesystem HLS, and GPUix video presentation.

The current GPUix backend scorecard is **54 passes, 0 unsupported, 0 known gaps, 0 timeouts, 0 errors**.

## Native addon

The VideoToolbox addon is macOS-only. The package does not build it from an install hook, so a normal package install does not run native build scripts.

For an installed consumer:

```bash
bun install
./node_modules/.bin/gpuix-mediabunny-build-native
```

The future `diffusion-editor-gpuix` workspace should expose that command through its normal setup/build scripts. If the native build is not run or cannot compile on the host, the integration still works through the registered fallbacks. `registration.videoToolbox` is false, AVC and HEVC use MediaBunny Server, and Bun ProRes uses the dedicated TurboRes fallback.

Inside this repository the equivalent development command is:

```bash
cd packages/mediabunny
bun install --no-save
bun run build:native
```

If native compilation is unavailable or a supported codec configuration cannot open a hardware VideoToolbox decoder, the custom decoder declines that configuration. AVC and HEVC then use MediaBunny Server. ProRes under Bun can use the dedicated TurboRes fallback. The package remains functional without the addon.

For filesystem-backed multi-file media such as HLS, use `createGpuixFilePathSource(rootPath)`. The helper implements MediaBunny's public `PathedSource` contract and reads child file ranges directly. This avoids the MediaBunny 1.59 child `FilePathSource` open-order assertion without loading whole segment files into memory.

The native path intentionally requires hardware decoding; it does not silently turn a native-performance benchmark into a software decode.

## Current boundaries

A few boundaries are intentionally outside the parity claim:

- browser device APIs such as live `MediaStreamTrack` capture are not emulated in a headless/native Bun process;
- VideoToolbox acceleration covers AVC, HEVC, and the supported ProRes sample entries when macOS exposes a hardware decoder. Other codecs remain functional through MediaBunny Server.

These are kept separate from the tested MediaBunny file/conversion/codec surface so unsupported environment APIs are not counted as successful parity.
