# MediaBunny dogfood

This fixture measures MediaBunny through the native codec paths GPUix Solid can realistically use.

The benchmark definition is shared. Backends only prepare the codec environment and then load the same suite:

- `@mediabunny/server`: MediaBunny's official server-side codec/transform extension.
- `@napi-rs/webcodecs`: a WebCodecs-compatible napi-rs implementation installed as globals before MediaBunny loads.
- Browser WebCodecs: the next adapter; it will run this same workload in a real Chromium process rather than maintaining a separate browser benchmark.

Dependencies are pinned because these measurements are only comparable when the MediaBunny and codec implementations are known exactly.

## Current workload

The first checked-in workload establishes a reproducible baseline rather than pretending to cover every MediaBunny API at once. It records:

- video and audio encode/decode capability queries across MediaBunny's current codec vocabulary;
- raw RGBA `VideoSample` and PCM `AudioSample` ingestion;
- AVC + AAC MP4 encoding into a `BufferTarget`;
- MP4 reopening, format/MIME/duration/track/metadata inspection;
- encoded packet iteration;
- sequential video decoding;
- random-access video sample retrieval;
- sequential audio decoding;
- elapsed time and output byte size.

The report is JSON so the browser runner and future GPUI presentation runner can be compared field-for-field.

## Run

```bash
bun install --no-save
bun run bench:server
bun run bench:webcodecs
```

Do not compare absolute GitHub-hosted-runner timings as framework performance claims. CI uses this workload as a correctness and compatibility gate and uploads the reports for inspection. Stable performance regression thresholds should come only after repeated measurements on a controlled runner.

## Expansion matrix

The benchmark will grow by adding workload cases to the shared suite, not backend-specific scripts. The planned matrix includes container read/write and transmux, all supported codec families, packet/sample access, sparse seeking, Conversion API operations, resize/crop/rotate/flip/frame-rate transforms, audio resampling and channel mixing, transparency, processing callbacks, CanvasSource/CanvasSink, and decoded-frame presentation through GPUI.

The GPUI presentation path is deliberately separate from Canvas v1. Video frames are large media resources; they should not be serialized through the retained Canvas draw-list protocol.
