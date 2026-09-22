# Upstream compatibility baseline

GPUix Solid treats `remorses/gpuix` as the canonical behavioral and native-protocol reference.

## Current package and source-edge baselines

Recorded: **2026-09-21**

- Repository: https://github.com/remorses/gpuix
- Published package baseline source: `7ac9880abd8e91e5bf0e4feb0fa850729cf95a68`
- Pinned source-edge baseline: `410fb56f2e599ef49b1dabfc43872b6ff8047916` (GPUIX 0.10.0)
- `@gpuix/native`: exact `0.9.0` for the plain npm-installed path
- `@gpuix/react`: published `0.9.0` remains the default-package comparison line
- Solid 2 runtime: `solid-js@2.0.0-rc.8` with `@solidjs/universal@2.0.0-rc.8`
- Solid 1 runtime exercised by CI: `solid-js@1.9.15`

Both Solid packages still depend on exact `@gpuix/native@0.9.0` by default. The pinned source-edge lane now starts from GPUIX 0.10.0 so forward compatibility is exercised against the current upstream release before the published dependency moves. GPUIX 0.10's live `<img>` buffer uploads and `scrollIntoView()` are consumed directly there; the old local live-image backport was removed. The remaining edge patches are limited to native Canvas and video-frame work that is not upstream.

GPUIX 0.9 remains the published dependency contract and includes the window-level `selectionChange` contract plus the native click/selection ownership fix. GPUix Solid maps the selection event into both roots and exposes the Solid-owned `createTextSelection()` primitive.

## Published package versus source edge

The published native package remains the default-install contract because it carries platform-specific binaries.

Source-edge work is explicit:

- **pinned edge** builds the exact source SHA in `.gpuix/edge.json` and applies its audited patch list, if present;
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

GPUIX owns the native renderer and Rust behavior. Native work should ultimately land in GPUIX. When this repository needs a capability before an upstream branch is available, the source-edge lane may carry a small reviewable patch against an exact GPUIX SHA; it must remain isolated from Solid behavior and be removed once upstream contains the equivalent change.

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
