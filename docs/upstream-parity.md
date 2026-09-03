# Upstream GPUIX parity

GPUix Solid treats `remorses/gpuix` as the native capability baseline. This document separates parity with the published React package from work that exists only on upstream `main`.

## Audit pins

- Upstream repository: `remorses/gpuix`
- Published React baseline: `@gpuix/react@0.7.0`
- Published/native release commit: `a24b4a42eb516c7b940eb8d34ecebb077df623bd`
- Source snapshot commit: `a24b4a42eb516c7b940eb8d34ecebb077df623bd`
- Native package used by GPUix Solid: `@gpuix/native ^0.7.0`

The published 0.7 release is the compatibility requirement. Source-fidelity snapshots are pinned to that immutable release commit. Work present only on newer upstream `main` remains outside the parity baseline until it is separately audited and supported by a matching native release.

## Source-fidelity contract

For examples with available upstream source, parity means preserving the upstream application as the reference instead of rebuilding a similar-looking fixture.

The repository keeps pinned source snapshots and verifies them with Git blob hashes. React-to-Solid translation, browser/runtime replacement, native controls, deterministic fixture data, and other required substitutions should live at framework or compatibility boundaries. They should not introduce new page hierarchies, copy, assets, or application behavior merely because the original dependency cannot run directly on GPUIX.

`bun run source:check` currently verifies pinned snapshots for:

- `remorses/gpuix@a24b4a42eb516c7b940eb8d34ecebb077df623bd`;
- `riccardoperra/codeimage@27b185f18d36f2baec3a8cc5a43e8794586096c3`;
- `TanStack/router@b6984af74dd561b8ee7e2d7369898a536dda70c2`;
- `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV@47139f07c018dc2ba505bbb5915750fdba19e961`;
- `diffusionstudio/editor@585fb010dcca36919f096f4b1275d535acab0cb9`;
- `jhomra21/daw-browser-convex@2eaad47813b15aa8511bab8dc04625510c977b12` — the DAW fixture currently protects a 68-file exact source closure.

The DAW Tailwind manifest is generated from that copied source rather than from a parallel style rewrite. Compatibility for the fixed 1440×900 native target is handled below the copied components: parent-relative percentage positioning and half-translation are resolved from native geometry, the active desktop `sm:` dialog variants are compiled for the reference viewport, `sr-only` retains its visual-hiding contract, relative line-height is resolved against the final native font size, copied SVG paint classes are serialized into the native inline-SVG source, and source `data-*` state selectors can contribute audited native variants. GPUIX 0.7 gaps such as z-index, letter spacing, browser transitions/focus effects, CSS filters, touch-action policy, CSS auto margins, writing mode and layered/inset shadows stay individually audited instead of being silently ignored as a class of styles.

The exact pinned DAW Compressor now owns the visible device UI. Its `EffectShell`, Knobs, SVG graph, reset/toggle behavior and collapse semantics run from copied source; deterministic fixture state replaces the audio backend only. Browser accessibility metadata (`role` and `aria-*`) is retained through built-in native host nodes so native tests can exercise exact source controls without adding fixture-only IDs, and semantic `hidden` maps to native `display: none` so source collapse behavior affects layout as well as state.

## Example parity

The desktop examples below use the same GPUIX native renderer and preserve the upstream example's application/component purpose and user-visible structure in Solid 2. Framework code differs only where React/Solid lifecycle or runtime boundaries require it.

| Upstream example | Upstream location | GPUix Solid | Status |
| --- | --- | --- | --- |
| Counter | `examples/counter.tsx` | `examples/counter/src/index.tsx` | parity |
| Native text | `examples/native-text.tsx` | `examples/counter/src/native-text.tsx` | parity |
| Blurred window source | `examples/blurred-window.tsx` | source snapshot only; runnable target is the custom showcase | reference |
| Todo starter | `example-app/` | `examples/counter/src/todo/` | parity |
| Diff | `examples/diff.tsx` | `examples/counter/src/diff/` | parity |
| Timeline | `examples/timeline.tsx` | `examples/counter/src/timeline/` | parity |
| Chat | `examples/chat.tsx` | `examples/counter/src/chat/` | parity |
| Infinite chat | `examples/infinite-chat.tsx` | `examples/counter/src/infinite-chat/` | parity |
| Browser/WebGPU | root `web` scripts | no Solid wrapper yet | missing |
| Chat performance | `examples/chat.perf.test.tsx` | `examples/counter/src/benchmarks/chat.tsx` | workload parity |
| Timeline performance | `examples/timeline.perf.test.tsx` | `examples/counter/src/benchmarks/timeline.tsx` | workload parity |
| Serialization | `examples/bench-serialization.ts` | `examples/counter/src/benchmarks/serialization.tsx` | Solid-side workload parity |

The Dashboard, CodeImage, TanStack, Kobalte, Tailwind and DAW fixtures are additional Solid coverage. They do not replace an upstream example in this table. Dashboard, CodeImage, TanStack, and DAW also follow the source-first rule for their own upstream applications.

### Blurred Window boundary

There is deliberately one Solid 2 runnable target: `example:blurred-window`. It is the custom animated username/welcome glass showcase. The exact upstream `examples/blurred-window.tsx` source remains hash-pinned as a reference for the native blur/window contract, but the repository does not advertise a second parity target or a `blurred-window-showcase` command.

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

The Chat port restores the pinned upstream icons, conversation fixtures, model groups, reasoning metadata, project/workspace/branch data, transcript content, diff fixture, menu structure, grouped model picker and footer behavior. Its React-only `SafeMdxRenderer` dependency is replaced by a Solid MDAST adapter whose typography and block structure track the upstream renderer instead of defining a separate design.

The native fixture uses GPUIX controls, a native `<virtual-list>`, composed safe-MDX content, selection, composer input and native animation. Its tests cover scrolling, selection, menu behavior, composer updates, sidebar motion and composed MDX layout.

Infinite Chat builds on the same composed MDX renderer. It keeps a bounded page cache, loads only when a real edge row reaches the viewport, performs separate insert and eviction commits, reads the native logical list anchor, restores that anchor after page changes and supports navigation through links in message content.

## Published 0.7 API parity

The parity branch targets the published React 0.7 host and testing surface required by these examples. The Solid packages expose the same native capabilities while keeping Solid-specific naming where the framework API itself differs.

| Area | Published React 0.7 capability | GPUix Solid status |
| --- | --- | --- |
| Host events | `onAuxClick`, `onHighlight` | parity |
| Text find | `highlight`, `useTextSearch`, `findRanges` | parity |
| Virtual list | logical `getListScrollTop`, `scrollToItem(..., offsetInItem)` | parity |
| Window | insets and `activateWindow()` | parity |
| Structured backgrounds | two-stop `linear-gradient` `StyleDesc` backgrounds | parity |
| Window keyboard | root-level `onKeyDown` / `onKeyUp` through `setWindowKeyEvents` | parity |
| Focus traversal | `focusNext()` / `focusPrevious()` | parity |
| Test renderer | `hasTestGpuixRenderer()` availability, painted highlights and logical list anchor | parity |
| Live automation | native click, fill and key input through the renderer | parity |
| Components | Select, Combobox, Tooltip, anchored floating surfaces | parity |
| Animation | React `motion.div` | parity via Solid `animate.div` |

`animate.div` is intentionally named for the Solid package rather than copying React's component name. The native animation behavior is the capability being matched.

The automation layer also normalizes text fill into GPUI-native keystrokes, including shifted keystrokes for uppercase input. That behavior is covered by a real native controlled-input regression because application fixtures such as Dashboard rely on exact confirmation text rather than test-only state mutation.

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

## 0.7 release deltas adopted

Structured two-stop gradients, root-level window key routing, focus traversal, and the public native test-renderer availability guard are now part of the published 0.7 baseline and are exposed by both Solid renderer packages. The GPUIX source lock points at the same immutable 0.7.0 release commit. Newer upstream-`main`-only work remains outside the compatibility baseline until it is separately audited.

## Solid-specific coverage

GPUix Solid also exercises capabilities that are not upstream React examples:

- real `@kobalte/core` source compiled through the Solid universal renderer and native GPUIX host;
- Tailwind v4 classes compiled to native style data;
- Solid 1.9 and Solid 2 renderer packages over the same GPUIX native contract;
- a source-first browser DAW slice with native adapters;
- a source-first six-route Dashboard port with native router/auth/network/modal compatibility;
- a source-first CodeImage editor composition with native substitutions behind `compat.tsx`;
- a source-pinned TanStack Router Solid 2 kitchen sink with route/query/browser substitutions below the application boundary.

These are concrete differences, not automatic performance claims. React and Solid performance comparisons should use the same native version, equivalent fixture data, the same interaction script and the same machine.
