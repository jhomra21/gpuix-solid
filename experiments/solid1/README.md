# Solid 1 compatibility lab

This fixture exercises `solid-js@1.9.15` against the maintained `@jhomra21/gpuix-solid1` package.

It intentionally stays small and interaction-heavy so the normal Solid 1 acceptance gate catches package regressions in:

- synchronous signals and controlled native input events;
- `Show` mount/unmount behavior;
- keyed `For` reconciliation and reordering;
- native screenshot generation through the package test renderer.

The compatibility lab no longer owns a private renderer adapter. The implementation under `packages/solid1` is the single Solid 1 host/runtime path, and this fixture consumes it the same way an external application does.

Run the gated compatibility check from the repository root:

```sh
bun run solid1:legacy
```

Or run the whole Solid 1 acceptance surface:

```sh
bun run solid1:check
```

To launch the lab:

```sh
bun run example:solid1
```
