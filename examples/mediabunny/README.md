# MediaBunny dogfood

This fixture measures MediaBunny through the native codec paths GPUix Solid can realistically use.

The benchmark definition is shared. Backends only prepare the codec environment and then load the same suite:

- `@mediabunny/server`: MediaBunny's official server-side extension. It uses NodeAV and FFmpeg's native libraries and can keep decoded samples backed by FFmpeg AVFrames.
- `@napi-rs/webcodecs`: an FFmpeg-backed WebCodecs-compatible napi-rs implementation installed as globals before MediaBunny loads.
- Browser WebCodecs: MediaBunny core running against Chromium's WebCodecs implementation. MediaBunny itself does not bundle FFmpeg for this browser path.

Dependencies are pinned because these measurements are only comparable when the MediaBunny and codec implementations are known exactly.

## Current workload

The first checked-in workload establishes a reproducible baseline rather than pretending to cover every MediaBunny API at once. It records:

- video and audio encode/decode capability queries across MediaBunny's current codec vocabulary;
- raw RGBA `VideoSample` and PCM `AudioSample` ingestion;
- VP8 + Opus WebM encoding into a `BufferTarget`, chosen as the common baseline across Chromium and both native backends;
- WebM reopening, format/MIME/duration/track/metadata inspection;
- encoded packet iteration, sequential video/audio decoding, and random-access video sample retrieval;
- Conversion API packet-copy/remux, resizing, frame-rate conversion, rotation, cropping, horizontal flip, PCM resampling/downmixing, trimming, and video/audio processing callbacks;
- actual encode → mux → demux → decode round trips for advertised video codecs, using WebM for VP8/VP9/AV1 and MP4 for AVC/HEVC/ProRes;
- native decoded-frame presentation through GPUix's binary BGRA `<video-frame>` element;
- elapsed time, output size, correctness details, documented compatibility gaps, and bounded codec timeouts.

The report is JSON so the browser runner and GPUI presentation runner can be compared field-for-field.

## Run

```bash
bun install --no-save
bun run bench:server
bun run bench:webcodecs
bunx playwright install chromium
bun run bench:browser
bun run dogfood:gpuix-surface
bun run live:gpuix
```

The live command requires the source-edge GPUIX native package to already be prepared and linked. It opens a real GPUI window with three MediaBunny-decoded frame elements using `contain`, `cover`, and `fill`. The decoded frame changes four times per second. Resize the window to inspect fit behavior and repeated frame replacement.

`bench:server` runs the AV1 and ProRes round trips in separate Bun processes because those native codecs can stall on some machines. Each process has a 30-second budget. Set `MEDIABUNNY_SERVER_CODEC_TIMEOUT_MS` to change that budget. A timeout stays visible in the report and does not block the rest of the benchmark.

Reports distinguish four non-success outcomes:

- `unsupported`: the backend does not advertise the capability;
- `known-gap`: a reproduced backend-integration limitation that remains visible but is not treated as a new regression;
- `timeout`: a bounded native probe exceeded its execution budget;
- `error`: an unexpected failure. Benchmark commands return a failing exit code when unexpected errors remain.

Current known gaps stay explicit. Browser-oriented `CanvasSink` cannot draw the native backends' decoded frame/resource types into `@napi-rs/canvas`, so GPUix presents decoded BGRA samples through its binary video-frame element. The napi-WebCodecs VP9 WebM round trip currently fails after MediaBunny's VP9 color-space packet rewrite. The server ProRes path is isolated because its generic round trip can fail or stall.

Do not compare absolute GitHub-hosted-runner timings as framework performance claims. CI uses this workload as a correctness and compatibility gate and uploads the reports for inspection. Stable performance regression thresholds need repeated measurements on a controlled runner.

## Browser vs GPUix presentation benchmark

The compatibility suite above answers whether a media feature works. The presentation benchmarks measure the paths an editor would use to decode and display frames.

The macOS IOSurface path is the native performance path:

- MediaBunny owns container parsing and encoded-packet iteration.
- A small N-API addon submits AVC packets directly to hardware VideoToolbox. FFmpeg and NodeAV are not in this decode hot loop.
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
```

The command prints one localhost URL per resolution. Open each URL in Codex's in-app browser; the page posts its browser report back to the waiting CLI, which then runs the native half and advances to the next resolution. The consolidated report is written to `reports/presentation-streaming-iosurface-scaling.md`.

For a decoder-only regression check, use:

```bash
bun run bench:direct-decode
```

That benchmark intentionally prepares the packet set before timing so it can compare browser `VideoDecoder` against direct VideoToolbox without container/demux cost. The presentation benchmarks include the MediaBunny packet path in their end-to-end measurement.

### Accepted scaling result

On the September 22, 2026 controlled run at gpuix-solid `50a240b07e8a79a9e8b5348dbe6d1f3a26c194ee` with GPUIX source-edge `410fb56f2e599ef49b1dabfc43872b6ff8047916`, the streaming path beat the browser baseline on all four acceptance metrics at every tested resolution:

| Resolution | Decode throughput | Presentation throughput | First presented frame | Presentation-step p95 |
| --- | ---: | ---: | ---: | ---: |
| 720p | 1.73x | 2.38x | 1.85 ms vs 9.00 ms | 0.25 ms vs 0.70 ms |
| 1080p | 1.25x | 1.57x | 2.49 ms vs 9.30 ms | 0.42 ms vs 2.00 ms |
| 4K | 1.21x | 1.38x | 7.30 ms vs 33.50 ms | 1.93 ms vs 7.50 ms |

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

The GPUI presentation path is separate from Canvas v1. Video frames are large media resources, so GPUix does not serialize them through the retained Canvas draw-list protocol.
