# Upstream GPUIX parity

GPUix Solid treats `remorses/gpuix` as the native capability baseline. This document separates parity with the published React package from work that exists only on upstream `main`.

## Audit pins

- Upstream repository: `remorses/gpuix`
- Published React baseline: `@gpuix/react@0.6.0`
- Published baseline commit: `322993eecf6134ef652f31b0fb905e77e131d08a`
- Upstream `main` audited at: `09e0caeb1812eece10a3a8a7200ef18567610267`
- Native package used by GPUix Solid: `@gpuix/native ^0.6.0`

The published baseline is the compatibility requirement. Changes present only on upstream `main` stay separate until the corresponding native package is released.

## Example parity

The desktop examples below use the same GPUIX native renderer and reproduce the upstream example's purpose in Solid 2. Framework code differs where React and Solid require different state or lifecycle APIs.

| Upstream example | Upstream location | GPUix Solid | Status |
| --- | --- | --- | --- |
| Counter | `examples/counter.tsx` | `examples/counter/src/index.tsx` | parity |
| Native text | `examples/native-text.tsx` | `examples/counter/src/native-text.tsx` | parity |
| Blurred window | `examples/blurred-window.tsx` | `examples/counter/src/blurred-window.tsx` | parity |
| Todo starter | `example-app/` | `examples/counter/src/todo/` | parity |
| Diff | `examples/diff.tsx` | `examples/counter/src/diff/` | parity |
| Timeline | `examples/timeline.tsx` | `examples/counter/src/timeline/` | parity |
| Chat | `examples/chat.tsx` | `examples/counter/src/chat/` | parity |
| Infinite chat | `examples/infinite-chat.tsx` | `examples/counter/src/infinite-chat/` | parity |
| Browser/WebGPU | root `web` scripts | no Solid wrapper yet | missing |
| Chat performance | `examples/chat.perf.test.tsx` | `examples/counter/src/benchmarks/chat.tsx` | workload parity |
| Timeline performance | `examples/timeline.perf.test.tsx` | `examples/counter/src/benchmarks/timeline.tsx` | workload parity |
| Serialization | `examples/bench-serialization.ts` | `examples/counter/src/benchmarks/serialization.tsx` | Solid-side workload parity |

The Dashboard, CodeImage, TanStack, Kobalte, Tailwind and DAW fixtures are additional Solid coverage. They do not replace an upstream example in this table.

### Timeline coverage

The Timeline port is a separate fixture from the DAW example. Its native tests cover the interactions the upstream Timeline example is designed to exercise:

- two-axis pan and clamping;
- frozen ruler and track column;
- native media scrolling;
- clip movement on one track and across tracks;
- horizontal movement and viewport measurement;
- start and end trimming;
- snapping;
- pointer capture outside the original clip bounds;
- playhead scrubbing and clamping;
- zoom under the pointer;
- marquee selection;
- viewport culling;
- track collapse.

### Chat and infinite history coverage

The Chat port uses native GPUIX controls, a native `<virtual-list>`, composed safe-MDX content, model and option menus, selection, composer input and native animation. Its tests cover scrolling, selection, menu behavior, composer updates, sidebar motion and composed MDX layout.

Infinite Chat builds on the same composed MDX renderer. It keeps a bounded page cache, loads only when a real edge row reaches the viewport, performs separate insert and eviction commits, reads the native logical list anchor, restores that anchor after page changes and supports navigation through links in message content.

## Published 0.6 API parity

The parity branch closes the published React 0.6 host and testing gaps needed by these examples.

| Area | Published React 0.6 capability | GPUix Solid status |
| --- | --- | --- |
| Host events | `onAuxClick`, `onHighlight` | parity |
| Text find | `highlight`, `useTextSearch`, `findRanges` | parity |
| Virtual list | logical `getListScrollTop`, `scrollToItem(..., offsetInItem)` | parity |
| Window | insets and `activateWindow()` | parity |
| Test renderer | painted highlights and logical list anchor | parity |
| Live automation | native click, fill and key input through the renderer | parity |
| Components | Select, Combobox, Tooltip, anchored floating surfaces | parity |
| Animation | React `motion.div` | parity via Solid `animate.div` |

`animate.div` is intentionally named for the Solid package rather than copying React's component name. The native animation behavior is the capability being matched.

## Performance workloads

Run the comparable desktop workloads from the repository root:

```bash
bun run perf:chat
bun run perf:timeline
bun run bench:serialization
```

The Chat benchmark uses the same 1,000-turn class of workload as upstream and measures mount, idle flush, wheel input, text highlighting and sidebar animation. The Timeline benchmark uses a 24-track, 900-second project and measures mount, culled and unculled pan, and pointer-captured clip dragging.

The commands print the upstream React thresholds as reference values, not pass/fail limits for Solid. CI runners are not controlled benchmark hardware, so timings from different machines should not be presented as framework comparisons.

The serialization benchmark captures the actual mutation tuples emitted by Solid's `applyBatch` path. It measures JSON encoding, UTF-8 buffer conversion and style interning. Upstream's Rust decoder benchmark stays in `remorses/gpuix` because this repository consumes the native package rather than owning that Rust code.

## Upstream main ahead of 0.6

At the audit pin above, upstream `main` adds structured two-stop linear gradient backgrounds after the `0.6.0` release. GPUix Solid does not expose that API while it consumes `@gpuix/native@0.6.0`. It moves into the published-baseline table when a matching native release is available.

## Solid-specific coverage

GPUix Solid also exercises capabilities that are not upstream React examples:

- real `@kobalte/core` source compiled through the Solid universal renderer and native GPUIX host;
- Tailwind v4 classes compiled to native style data;
- Solid 1.9 and Solid 2 renderer packages over the same GPUIX native contract;
- a source-first browser DAW slice with native adapters;
- larger Solid 2 Dashboard, CodeImage and TanStack fixtures.

These are concrete differences, not automatic performance claims. React and Solid performance comparisons should use the same native version, equivalent fixture data, the same interaction script and the same machine.
