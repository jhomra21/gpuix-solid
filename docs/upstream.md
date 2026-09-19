# Upstream compatibility baseline

GPUix Solid treats `remorses/gpuix` as the canonical behavioral and native-protocol reference.

## Current released baseline

Recorded: **2026-09-19**

- Repository: https://github.com/remorses/gpuix
- Source baseline: `7ac9880abd8e91e5bf0e4feb0fa850729cf95a68`
- `@gpuix/native`: exact `0.9.0`
- `@gpuix/react`: `0.9.0` at the same source baseline
- Solid 2 runtime: `solid-js@2.0.0-rc.8` with `@solidjs/universal@2.0.0-rc.8`
- Solid 1 runtime exercised by CI: `solid-js@1.9.15`

Both Solid packages depend on exact `@gpuix/native@0.9.0`. The same source revision is pinned in `.gpuix/edge.json`, so the published-native baseline and reproducible source-edge baseline describe the same GPUIX release.

GPUIX 0.9 adds the window-level `selectionChange` contract and the native click/selection ownership fix. GPUix Solid maps the selection event into both roots and exposes the Solid-owned `createTextSelection()` primitive. The production batch adapter must forward the native selection subscription; this is covered separately from the native test-renderer path.

## Published package versus source edge

The published native package remains the default-install contract because it carries platform-specific binaries.

Source-edge work is explicit:

- **pinned edge** builds the exact source SHA in `.gpuix/edge.json`;
- **latest main** resolves the configured upstream branch at run time and runs the same compatibility checks without changing package manifests;
- a fork can be supplied through the documented edge environment overrides when a native fix needs validation before it is upstreamed.

See [gpuix-edge.md](./gpuix-edge.md) for the commands and ownership rules.

## Ownership boundary

GPUix Solid owns Solid framework integration:

- Solid scheduling and owner cleanup;
- host-node bookkeeping required by the universal renderer;
- framework-neutral event relay needed to preserve authored Solid behavior;
- native capability forwarding through the renderer adapter;
- Solid primitives, components, automation, and compatibility layers.

GPUIX owns the native renderer and Rust behavior. Native defects should be fixed in GPUIX and consumed here through the published package or source-edge lane rather than copied into a downstream Rust fork.

## Adoption policy

When upstream adds or changes a capability:

1. Decide whether the change is framework-only or requires a new native contract.
2. Update the Solid type/host mapping only where the public capability is actually usable.
3. Add a deterministic regression that would fail if the mapping or forwarding disappears.
4. Add a runnable or live-native check for user-visible behavior when practical.
5. Run the Solid 1 and Solid 2 lanes when the contract is shared.
6. Run the pinned source-edge lane before changing the published native baseline.
7. Update dependency versions, the edge pin, compatibility docs, and release notes together when adopting a new native release.
8. Keep operating-system-specific behavior explicit instead of generalizing from one platform.

Do not describe an upstream capability as GPUix Solid support until the Solid path is implemented and validated.
