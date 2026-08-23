# Upstream compatibility baseline

GPUix Solid treats `remorses/gpuix` as the canonical behavioral reference for the GPUIX host/native contract.

## Initial baseline

Recorded: **2026-08-23**

- Repository: https://github.com/remorses/gpuix
- Upstream commit inspected: `b8bbff4ef0dc00dc24c3d3f3ca47818e1be15c69`
- `@gpuix/native`: `0.4.0`
- `@gpuix/react`: `0.4.0`
- Native contract: retained-tree mutations over napi-rs, including `applyBatch()`

## Contract assumptions at this baseline

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

## Updating upstream

When moving to a new `@gpuix/native` version:

1. Read the upstream changelog and native generated TypeScript declarations.
2. Diff the mutation operations and event payload contract.
3. Run the host/mutation/event parity suites.
4. Run retained-tree parity fixtures against the corresponding `@gpuix/react` version.
5. Run native screenshot/automation parity where supported.
6. Update this file only after those checks pass.

Do not update the dependency version and compatibility baseline in separate changes.
