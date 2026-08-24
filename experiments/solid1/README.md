# Solid 1 compatibility experiment

This directory proves that Solid 1 can drive the same retained GPUI host kernel used by `@jhomra21/gpuix-solid` without adding Solid 1 to the Solid 2 workspace dependency graph.

## Runtime boundary

- Solid 1: `solid-js@1.9.15`
- Compiler: `vite-plugin-solid@2.11.14`, `generate: "universal"`
- Universal runtime: `solid-js/universal`
- Native renderer: `@gpuix/native@0.4.0`
- Shared implementation: `packages/solid/src/host/*`, frame loop, and native capability plumbing

Solid 1 updates are synchronous, so this adapter flushes the GPUI mutation driver after Solid work instead of using Solid 2's `flush()` scheduling contract.

## Compatibility fixture

The native lab covers signals, computed state, native click/change events, controlled input, conditional mount/unmount with `Show`, keyed list insertion/reordering with `For`, retained-tree mutation batching, and native screenshot capture.

The experiment intentionally stops at the core universal-renderer boundary. Context-backed GPUI hooks and higher-level components are not exported yet: Solid 1's provider return semantics differ from Solid 2's host-facing adapter contract, so those surfaces will be designed and tested during package promotion rather than hidden behind an unsafe cast.

Run from the repository root:

```bash
bun run solid1:check
bun run example:solid1
```

This is intentionally an experiment rather than a publishable package. Once native parity is validated locally, the adapter can be promoted into a separately versioned `@jhomra21/gpuix-solid1` package without weakening the Solid 2 peer/runtime contract.
