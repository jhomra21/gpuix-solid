# Upstream compatibility baseline

GPUix Solid treats `remorses/gpuix` as the canonical behavioral reference for the GPUIX host/native contract.

## Released baseline

Recorded: **2026-08-25**

- Repository: https://github.com/remorses/gpuix
- Released source baseline inspected: `b8bbff4ef0dc00dc24c3d3f3ca47818e1be15c69`
- Latest published `@gpuix/native`: `0.4.0`
- Latest published `@gpuix/react`: `0.4.0`
- Native contract: retained-tree mutations over napi-rs, including `applyBatch()`

This is the dependency baseline used by the packages and CI. Do not point `@gpuix/native` at an arbitrary GitHub commit: the npm package carries platform-specific native binaries and the `main` branch can be ahead of the latest published binary contract.

## Upstream main watchpoint

Latest upstream `main` inspected on **2026-08-25**: `75e304ea589e2f6e087e4e2d6ee53815dff957b6`.

That revision is intentionally a **watchpoint, not the dependency baseline**. It contains unreleased work after the 0.4.0 release. We use it to remove downstream workarounds early when a backward-compatible bridge is possible, and otherwise wait for a matching published `@gpuix/native` release before advertising the native capability.

Useful upstream-main work currently being tracked:

- portable raw SVG markup through `<svg source="…">`;
- broader CSS color parsing, including LAB/LCH and OKLab/OKLCH forms;
- per-side border widths and structured `boxShadow`;
- live-app mouse input / locator bounds on additional desktop platforms;
- concurrent mutation lifecycle fixes and root-ID isolation;
- windowed `<virtual-list>` contracts (`itemCount`, `windowStart`, `onVisibleRange`);
- GPUIX browser/Wasm rendering, browser automation, clipboard and IME integration.

The Solid 1 DAW compatibility path already consumes one of those future-facing contracts safely: inline Solid SVG markup is serialized to the upstream `source` representation while also emitting a `data:image/svg+xml,…` `src` fallback for the released 0.4.0 native renderer. This lets copied DAW icon/source JSX remain source-shaped without requiring an unreleased native binary.

The open `remorses/gpuix#20` drag-continuation issue remains separate from upstream's live-app mouse work. Do not remove the downstream held-drag limitation or claim complete synthetic drag coverage until the stateful `TestGpuixRenderer` sequence is actually fixed and verified.

## Contract assumptions at the released baseline

The Solid renderer relies on these native operations:

```text
createElement
appendChild
removeChild
insertBefore
destroyElement
setStyle
setText
setEventListener
setRoot
setCustomPropValue
```

The batch endpoint accepts structured style/custom-prop values and returns IDs destroyed by `destroyElement` operations. Those returned IDs are used to clear JS event closures.

The direct non-batched N-API methods still accept JSON strings for style/custom-prop payloads, so the fallback path serializes those values before crossing N-API.

## Adoption policy

When upstream `main` adds something useful:

1. Determine whether it is JS/framework-only or requires a new native binary contract.
2. If it can be supported faithfully on the released native package, add a compatibility bridge and an automated native regression test.
3. If it requires unreleased Rust/native behavior, record it here and do not expose it as working until a matching `@gpuix/native` version is published.
4. When a new native version is published, read its changelog, generated TypeScript declarations, and relevant changesets before updating dependencies.
5. Diff mutation operations, events, custom elements, styles, automation, and window/root lifecycle against this repo.
6. Run host/mutation/event parity, retained-tree parity, package tarball smoke, and native screenshot/automation tests on every supported CI platform.
7. Remove compatibility fallbacks only after the released native implementation is proven equivalent.
8. Update the released baseline in this file in the same change as the dependency version.

This keeps GPUix Solid close to upstream without making an unreleased GPUIX `main` commit part of the public runtime contract.
