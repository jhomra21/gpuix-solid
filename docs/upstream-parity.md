# Upstream GPUIX parity

GPUix Solid treats `remorses/gpuix` as the native capability baseline. This document separates parity with the latest published React package from work that exists only on upstream `main`.

## Audit pins

- Upstream repository: `remorses/gpuix`
- Published React baseline: `@gpuix/react@0.6.0`
- Published baseline commit: `322993eecf6134ef652f31b0fb905e77e131d08a`
- Upstream `main` audited at: `09e0caeb1812eece10a3a8a7200ef18567610267`
- Native package used by GPUix Solid: `@gpuix/native ^0.6.0`

The published baseline is the compatibility requirement. Changes present only on upstream `main` are tracked separately until the corresponding native package is released.

## Example parity

| Upstream example | Upstream location | GPUix Solid | Status |
| --- | --- | --- | --- |
| Counter | `examples/counter.tsx` | `examples/counter/src/index.tsx` | parity |
| Native text | `examples/native-text.tsx` | `examples/counter/src/native-text.tsx` | parity |
| Blurred window | `examples/blurred-window.tsx` | `examples/counter/src/blurred-window.tsx` | parity |
| Todo starter | `example-app/` | planned Solid 2 starter | missing |
| Diff | `examples/diff.tsx` | planned Solid 2 port | missing |
| Timeline | `examples/timeline.tsx` | planned Solid 2 port | missing |
| Chat | `examples/chat.tsx` | planned Solid 2 port | missing |
| Infinite chat | `examples/infinite-chat.tsx` | planned Solid 2 port | missing |
| Browser/WebGPU | root `web` scripts | no Solid wrapper yet | missing |
| Chat performance | `examples/chat.perf.test.tsx` | planned parity benchmark | missing |
| Timeline performance | `examples/timeline.perf.test.tsx` | planned parity benchmark | missing |
| Serialization | `examples/bench-serialization.ts` | planned parity benchmark | missing |

The Dashboard, CodeImage, TanStack, Kobalte, Tailwind and DAW fixtures are additional Solid ecosystem coverage. They do not count as substitutes for upstream example parity.

## Published 0.6 API parity

The Solid 2 renderer already covers the shared retained-tree mutation model, native element set, window creation, focus, selection, scroll offsets, native text elements, `Select`, `Combobox`, `Tooltip`, automation and native animations. The current parity branch is closing the remaining published 0.6 surface before the larger ports land.

| Area | Published React 0.6 capability | GPUix Solid status |
| --- | --- | --- |
| Host events | `onAuxClick`, `onHighlight` | in progress |
| Text find | `highlight`, `useTextSearch`, `findRanges` | in progress |
| Virtual list | logical `getListScrollTop`, `scrollToItem(..., offsetInItem)` | in progress |
| Window | insets and `activateWindow()` | in progress |
| Test renderer | painted highlights and logical list anchor | in progress |
| Live automation | fill/press through production renderer | audit in progress |
| Components | Select, Combobox, Tooltip, anchored floating surfaces | parity |
| Animation | React `motion.div` | parity via Solid `animate.div` |

## Upstream main ahead of 0.6

Upstream `main` currently adds structured two-stop linear gradient backgrounds after the `0.6.0` release. GPUix Solid intentionally does not claim that API while consuming `@gpuix/native@0.6.0`; it will move into the published-baseline table when the matching native release is available.

## Solid-specific coverage

GPUix Solid also exercises capabilities that are not upstream React examples:

- real `@kobalte/core` source compiled through the Solid universal renderer and native GPUIX host;
- Tailwind v4 classes compiled to native style data;
- Solid 1.9 and Solid 2 renderer packages over the same GPUIX native contract;
- a source-first browser DAW slice with native adapters;
- larger Solid 2 Dashboard, CodeImage and TanStack fixtures.

A Solid-specific difference is not automatically better. Performance claims should come from equivalent React and Solid workloads using the same `@gpuix/native` renderer and the same interaction scripts.
