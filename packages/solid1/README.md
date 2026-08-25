# @jhomra21/gpuix-solid1

Solid 1 bindings for GPUIX.

This package targets current Solid 1 applications without weakening the Solid 2 runtime contract of `@jhomra21/gpuix-solid`.

## Runtime boundary

- `solid-js >=1.9.0 <2`
- custom renderer runtime: `solid-js/universal`
- compiler: `vite-plugin-solid` with `generate: "universal"` and `moduleName: "@jhomra21/gpuix-solid1"`
- native renderer: `@gpuix/native`

Solid 1 updates synchronously, so this adapter flushes GPUI mutations after Solid work rather than using Solid 2's `flush()` scheduling contract.

## Supported in the first compatibility surface

- native JSX host elements
- `render` / `createRoot`
- signals, memos, `Show`, `For`, `Switch`, `Index`
- native event delivery
- controlled `input` and `textarea`
- retained-tree insertion, removal, and reordering
- `TestGpuixRenderer` integration when the native platform binding exposes it

Context-backed GPUix primitives and the Solid 2 convenience-component layer are intentionally not advertised yet. They will be added only with a Solid-1-native ownership/context implementation.

The framework-neutral host files are mirrored from `packages/solid/src/host` and CI runs `scripts/check-host-parity.ts` so the Solid 1 and Solid 2 retained-tree kernels cannot silently drift.
