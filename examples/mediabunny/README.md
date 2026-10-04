# MediaBunny dogfood

This fixture validates MediaBunny through the codec, I/O, conversion, Canvas, and GPUix presentation paths a native editor can use.

There are four useful execution modes:

- Browser WebCodecs: Chromium's native WebCodecs implementation.
- `@napi-rs/webcodecs`: a WebCodecs-compatible native implementation used as a compatibility reference.
- `@mediabunny/server`: MediaBunny's official NodeAV/FFmpeg server extension.
- GPUix MediaBunny: `@jhomra21/gpuix-mediabunny`, which adds macOS VideoToolbox and IOSurface decoding for AVC, HEVC, and supported ProRes sample entries. It also adds a Bun-safe ProRes fallback and keeps MediaBunny Server for the remaining codecs.

MediaBunny is pinned to 1.59.0 so capability and benchmark results are reproducible.

## GPUix parity result

The GPUix backend runs the same MediaBunny APIs rather than a parallel media abstraction. The current full suite reports:

```text
passes:      54
unsupported: 0
known gaps:  0
timeouts:    0
errors:      0
```

Real encode → mux → demux → decode round trips pass for all tested video codecs:

- AVC
- HEVC
- VP8
- VP9
- AV1
- ProRes

The audio round-trip matrix passes AAC, Opus, MP3, Vorbis, FLAC, AC-3, E-AC-3, DTS, PCM variants, μ-law, and A-law.

The feature suite also covers:

- sequential and random-access video/audio decoding;
- `VideoSample.clone()`, `copyTo()`, transforms, and MediaBunny custom sample resources;
- CanvasSource and CanvasSink under Bun/Node through `@napi-rs/canvas`;
- metadata tags, including MediaBunny 1.59 BPM metadata, and conversion progress;
- remux/copy conversion;
- resize, frame-rate conversion, rotation, crop, flip, trim, and processing callbacks;
- audio resampling and downmixing;
- StreamTarget fragmented MP4;
- ReadableStreamSource, BlobSource, and ranged sources;
- CMAF, MPEG-TS, ADTS, HLS, and WebVTT subtitle output;
- UrlSource with HTTP range requests;
- FilePathSource and FilePathTarget;
- HLS file readback through `createGpuixFilePathSource()`;
- zero-copy IOSurface GPUix presentation for native AVC, HEVC, and supported ProRes samples;
- BGRA GPUix presentation for fallback-decoded samples.

AV1 and ProRes round trips run in isolated child processes with a bounded timeout because codec implementations can stall independently of the rest of the suite. Both currently pass. CI also runs the full GPUix MediaBunny matrix on macOS with Bun 1.4.2 because that runtime reproduced the earlier local ProRes timeout.

## Native AVC, HEVC, and ProRes path

On supported macOS hardware, MediaBunny's normal `VideoSampleSink` selects the registered VideoToolbox custom decoder for AVC, HEVC, and ProRes sample entries that can open a hardware session. ProRes currently recognizes `apco`, `apcs`, `apcn`, `apch`, `ap4h`, and `ap4x`.

The path is:

```text
MediaBunny Input / VideoSampleSink
        ↓
encoded AVC, HEVC, or ProRes packets
        ↓
native VideoToolbox worker
        ↓
CVPixelBuffer-backed VideoSampleResource
        ↓
IOSurface → GPUix → GPUI
```

Decoded frame delivery is asynchronous and bounded to two pending native frames. The JavaScript presentation thread does not wait on synchronous packet batches.

The native resource is still a regular MediaBunny `VideoSample`. Repository smokes verify:

- sequential sample iteration;
- presentation timestamps remain ordered;
- IOSurface access;
- `copyTo()`;
- clones preserving the native resource;
- transforms producing valid pixels;
- random-access seeking.

CoreVideo NV12 and planar 8-bit 4:2:0 frames map directly to MediaBunny sample formats. For other hardware layouts without a direct MediaBunny mapping, CPU copy/transform requests fall back lazily through CoreImage while IOSurface presentation remains native.

## Broad fallback

`registerGpuixMediaBunny()` registers VideoToolbox first. Under Bun it then registers a ProRes decoder backed by TurboRes with shared memory disabled and `concurrency: 0`, which avoids the worker and shared-memory path that stalled in the Bun 1.4.2 local acceptance run. MediaBunny Server is registered after those decoders for the remaining codec coverage.

The ProRes parity case keeps software `prores_ks` encoding because automatic macOS hardware ProRes encoding was not reliable in CI. The decode side can still use VideoToolbox when a hardware session is available, then the Bun-safe TurboRes decoder, then the remaining MediaBunny Server fallback behavior.

## Run

Install the dogfood dependencies:

```bash
cd examples/mediabunny
bun install --no-save
```

Prepare the reusable integration package and native addon:

```bash
bun run prepare:gpuix-mediabunny
```

Then run the focused and full checks:

```bash
bun run smoke:videotoolbox-direct
bun run smoke:videotoolbox-stream
bun run smoke:videotoolbox-hevc
bun run smoke:mediabunny-videotoolbox:avc
bun run smoke:mediabunny-videotoolbox:hevc
bun run smoke:mediabunny-videotoolbox:prores
bun run smoke:mediabunny-parity
bun run bench:gpuix-mediabunny
```

The regular comparison backends remain available:

```bash
bun run bench:server
bun run bench:webcodecs
bunx playwright install chromium
bun run bench:browser
```

The integration tests stage `@jhomra21/gpuix-mediabunny` into the dogfood consumer's `node_modules`. This deliberately gives the package and the consumer one shared MediaBunny/server dependency graph, matching a normal installed-package topology and preventing duplicate custom-decoder registries or duplicate NodeAV native libraries.

## Boundaries

The clean parity score applies to the tested file, codec, conversion, Canvas, and native presentation surfaces. A few environment/upstream boundaries remain outside that score:

- live browser-device APIs such as `MediaStreamTrack` capture are not emulated in a headless Bun/GPUI process;
- VideoToolbox acceleration covers AVC, HEVC, and supported ProRes sample entries when macOS exposes a hardware decoder. Bun also has the dedicated TurboRes ProRes fallback. Other codecs pass through MediaBunny Server.

CI treats any new unsupported case, known gap, timeout, or error in the GPUix backend as a failing parity run.

## Browser vs GPUix presentation benchmark

The compatibility suite above answers whether a media feature works. The presentation benchmarks measure the paths an editor would use to decode and display frames.

The macOS IOSurface path is the native performance path:

- MediaBunny owns container parsing and encoded-packet iteration.
- A small N-API addon submits AVC or HEVC packets directly to hardware VideoToolbox. FFmpeg and NodeAV are not in this decode hot loop.
- VideoToolbox runs on a native worker instead of blocking the JavaScript presentation thread.
- Decoded `CVPixelBuffer` frames cross a bounded delivery queue with at most two frames waiting for JavaScript.
- The JavaScript callback hands each IOSurface to GPUix and flushes GPUI synchronously.
- The `CVPixelBuffer` stays retained through that callback and is released immediately afterward.
- The path never downloads the hardware frame to CPU pixels and does not use BGRA conversion or the RenderImage atlas.

This scheduling matters. Synchronous VideoToolbox batches already beat browser WebCodecs on decode throughput, presentation throughput, and first-frame latency, but their inter-batch stalls lost presentation-step p95. Smaller batches traded away throughput without eliminating that regression. Streaming delivery lets decode and presentation overlap while keeping frame retention bounded.

### Run

Prepare the pinned GPUIX source build first:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:prepare

cd examples/mediabunny
bun install --no-save
```

The regular presentation commands use Playwright for their browser half:

```bash
bunx playwright install chromium
bun run bench:presentation
bun run bench:presentation:server
bun run bench:presentation:iosurface
```

`bench:presentation:iosurface` is the canonical macOS hardware comparison. It uses the same AVC fixture for browser MediaBunny `CanvasSink` + WebCodecs and streaming VideoToolbox + IOSurface + GPUix, then writes:

```text
reports/presentation-iosurface-browser.json
reports/presentation-iosurface-gpuix.json
reports/presentation-iosurface-comparison.md
```

For the controlled 720p/1080p/4K comparison in a Codex session, use the in-app browser instead of Playwright:

```bash
bun run bench:presentation:iosurface:scaling

# Run the same scaling harness with HEVC.
bun run bench:presentation:iosurface:hevc:scaling
```

The command prints one localhost URL per resolution. Open each URL in Codex's in-app browser; the page posts its browser report back to the waiting CLI, which then runs the native half and advances to the next resolution. The consolidated report is written to `reports/presentation-streaming-iosurface-scaling.md`.

For a decoder-only regression check, use:

```bash
bun run bench:direct-decode
```

That benchmark intentionally prepares the packet set before timing so it can compare browser `VideoDecoder` against direct VideoToolbox without container/demux cost. The presentation benchmarks include the MediaBunny packet path in their end-to-end measurement.

### Accepted scaling result

The post-Thermos September 22, 2026 acceptance run on merged `main` at gpuix-solid `b80dff83dca18a6f13b2655f4976bbfd9cd7c1c2`, with GPUIX source-edge `410fb56f2e599ef49b1dabfc43872b6ff8047916`, beat browser WebCodecs on all four AVC acceptance metrics at every tested resolution:

| Resolution | Decode speedup | Presentation speedup | First frame native / browser | Presentation p95 native / browser |
| --- | ---: | ---: | ---: | ---: |
| 720p | 1.69x | 2.51x | 2.38 / 9.00 ms | 0.34 / 1.10 ms |
| 1080p | 1.33x | 1.97x | 3.40 / 11.10 ms | 0.73 / 1.60 ms |
| 4K | 1.22x | 1.53x | 7.95 / 30.30 ms | 2.01 / 9.20 ms |

The workload was AVC, 60 frames, two warmups, and five measured runs per backend and resolution on an Apple M3 Pro. Native verification confirmed hardware VideoToolbox decode, IOSurface export, monotonic presentation order, and a maximum of two pending decoded frames. GPUix edge verification passed across the installed consumers used by the repository.

These numbers are benchmark results for this controlled workload, not a claim about sustained real-time playback performance on every machine or codec. GitHub-hosted-runner timings remain correctness/compatibility signals rather than stable performance thresholds.

The default one-resolution presentation workload is 1280×720, 60 frames at 30 fps, one warmup, and three measured runs. You can change it without editing source:

```bash
MEDIABUNNY_PRESENTATION_WIDTH=1920 \
MEDIABUNNY_PRESENTATION_HEIGHT=1080 \
MEDIABUNNY_PRESENTATION_FRAMES=120 \
MEDIABUNNY_PRESENTATION_ITERATIONS=5 \
bun run bench:presentation:iosurface
```

Set `MEDIABUNNY_PRESENTATION_HEADLESS=0` when you want the Playwright browser window visible. Use the same machine and browser mode when comparing performance runs.

The server AVFrame experiment remains useful as the software-decoding counterpart. It refs MediaBunny's FFmpeg-backed AVFrame, converts into reusable BGRA with libswscale, and hands those bytes to GPUix. That path is intentionally not zero-copy. The macOS IOSurface path is the hardware counterpart and bypasses both the YUV→BGRA conversion and the BGRA upload.

## Expansion matrix

The benchmark grows by adding workload cases to the shared suite, not backend-specific scripts. Capability queries already include the full current MediaBunny video/audio codec vocabulary. The common executable round trip starts with VP8 + Opus WebM so every backend processes the same media.

Next cases include broader container read/write and transmux coverage, sparse seeking, transparency/alpha paths, longer playback and replacement loops, and controlled-runner throughput and memory measurements.

The GPUI presentation path is separate from the Canvas draw-list protocol. Video frames are large media resources, so GPUix does not serialize them through retained Canvas commands.
