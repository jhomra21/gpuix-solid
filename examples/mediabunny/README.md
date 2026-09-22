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

The compatibility suite above answers whether a feature works. The presentation benchmark measures the path an editor would use to decode and display frames.

It generates one VP8 WebM fixture, then gives the exact same encoded bytes to both implementations:

- Chromium uses MediaBunny with browser WebCodecs and `CanvasSink`.
- GPUix uses MediaBunny with `@napi-rs/webcodecs`, copies each decoded sample to BGRA, uploads it through the binary `video-frame` API, and flushes GPUI rendering.
- The server AVFrame experiment uses MediaBunny's official `@mediabunny/server` decoder, refs its native FFmpeg AVFrame without copying it, converts into one reusable BGRA AVFrame with libswscale, then uses the same GPUix `video-frame` surface.
- The macOS IOSurface experiment uses an AVC fixture so both Chromium and the native path can use hardware H.264 decode. MediaBunny demuxes and yields encoded packets; NodeAV decodes those packets through VideoToolbox into hardware AVFrames. GPUix then paints the exported IOSurface through GPUI's CoreVideo surface path without a BGRA conversion or RenderImage atlas upload.

The benchmark reports decode-only throughput, end-to-end presentation throughput, steady-state throughput after the first frame, time to the first presented frame, and p95 frame-step latency. The BGRA backends reuse one destination buffer while the decoded resolution is unchanged, matching how a long-running editor can avoid allocating a multi-megabyte array every frame. Reports separate decoder wait from presentation work. BGRA runs measure allocation or resize, conversion/copy, GPUix upload, and native render flush. The IOSurface run measures AVFrame ref + IOSurface export, GPUix IOSurface handoff, and native render flush. Each backend records the same stage breakdown for the first frame.

Prepare the pinned native build first:

```bash
bun install --frozen-lockfile
bun run gpuix:edge:prepare

cd examples/mediabunny
bun install --no-save
bunx playwright install chromium
bun run bench:presentation
bun run bench:presentation:server
bun run bench:presentation:iosurface
bun run bench:presentation:iosurface:decode-matrix
bun run bench:presentation:iosurface:decode-scaling
```

`bench:presentation:iosurface:decode-matrix` keeps the browser path fixed and reruns the native VideoToolbox path with isolated decoder variables: an extra JavaScript packet copy versus a Buffer view, async versus synchronous NodeAV codec calls, packet queue depths from 1 through 40, low-latency first-frame scheduling, and extra hardware-frame pool capacity. It defaults to two warmups and five measured runs so small timing changes are less likely to be mistaken for improvements. The matrix also reports decoder receive calls per frame and send-side `EAGAIN` counts so a throughput change can be tied back to queue pressure instead of timing noise. The regular IOSurface benchmark remains unchanged by default. `bench:presentation:iosurface:decode-scaling` runs that matrix at 1280×720, 1920×1080, and 3840×2160, preserves every raw report with its resolution in the filename, and writes `reports/presentation-iosurface-decode-scaling.md`.

The default workload is 1280×720, 60 frames at 30 fps, one warmup, and three measured runs. `bench:presentation` compares Chromium with the napi-WebCodecs path. `bench:presentation:server` compares Chromium with the direct MediaBunny server AVFrame path. On macOS, `bench:presentation:iosurface` switches the shared fixture to AVC and compares Chromium with the VideoToolbox/IOSurface GPUix path. The commands write:

```text
reports/presentation-browser.json
reports/presentation-gpuix.json
reports/presentation-comparison.md
reports/presentation-server-browser.json
reports/presentation-server-gpuix.json
reports/presentation-server-comparison.md
reports/presentation-iosurface-browser.json
reports/presentation-iosurface-gpuix.json
reports/presentation-iosurface-comparison.md
```

You can change the workload without editing source:

```bash
MEDIABUNNY_PRESENTATION_WIDTH=1920 \
MEDIABUNNY_PRESENTATION_HEIGHT=1080 \
MEDIABUNNY_PRESENTATION_FRAMES=120 \
MEDIABUNNY_PRESENTATION_ITERATIONS=5 \
bun run bench:presentation
```

Set `MEDIABUNNY_PRESENTATION_HEADLESS=0` to run Chromium with a visible window. Use the same machine and browser mode when comparing runs. The benchmark does not set pass/fail performance thresholds.

For scaling checks, rerun the same command at 1920×1080 and 3840×2160. Keep decode-only and presentation throughput separate: the IOSurface path can reduce display cost even when the native decoder is slower than browser WebCodecs. The stage-per-frame table shows whether time is being spent in decode, BGRA conversion/upload, or the IOSurface handoff and native render flush. The v1 BGRA GPUix frame upload still copies supplied bytes synchronously into native-owned image data; the macOS IOSurface path bypasses that upload.

The direct server experiment deliberately asks MediaBunny for software decoding first. That isolates the AVFrame-to-BGRA and GPUix costs without adding a GPU-to-CPU readback. It is not zero-copy end to end: the MediaBunny sample-to-AVFrame handoff is a ref, but libswscale still converts YUV to BGRA and GPUix still copies the BGRA bytes into native-owned image data.

The IOSurface experiment is the hardware counterpart. It requires macOS and an AVC fixture. MediaBunny still owns demuxing and encoded-packet iteration, but the benchmark configures NodeAV's VideoToolbox decoder directly because MediaBunny 1.58.1's server decoder selects a hardware-capable codec without attaching the NodeAV hardware device context needed to return hardware AVFrames. The decoded AVFrame must expose an IOSurface, and GPUix wraps that IOSurface as a retained CoreVideo pixel buffer before GPUI paints it with `paint_surface`. The benchmark fails instead of falling back to software frames or BGRA.

## Expansion matrix

The benchmark grows by adding workload cases to the shared suite, not backend-specific scripts. Capability queries already include the full current MediaBunny video/audio codec vocabulary. The common executable round trip starts with VP8 + Opus WebM so every backend processes the same media.

Next cases include broader container read/write and transmux coverage, sparse seeking, transparency/alpha paths, longer playback and replacement loops, and controlled-runner throughput and memory measurements.

The GPUI presentation path is separate from Canvas v1. Video frames are large media resources, so GPUix does not serialize them through the retained Canvas draw-list protocol.
