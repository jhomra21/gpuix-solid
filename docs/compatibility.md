# Compatibility

GPUix Solid tracks GPUIX's published native contract instead of vendoring or forking the Rust renderer.

For the normal application path, start with [`getting-started.md`](./getting-started.md). This page records the exact dependency/platform contract and current native limitations.

## Validated dependency contract

| Layer | Current contract | Notes |
| --- | --- | --- |
| `gpuix-solid` | `0.1.0-beta.6` | Published Solid 2 renderer in `packages/solid` |
| `@jhomra21/gpuix-solid1` | current `0.1.0-beta.x` line in this repository | Solid 1 renderer in `packages/solid1` |
| `@gpuix/native` | `^0.8.0` | GPUIX desktop renderer contract used by both Solid packages |
| pinned GPUIX source edge | `8d3ec094387152558d05a5b37de3cfbfca5d2d0a` | Exact source commit for the published 0.8.0 baseline |
| `solid-js` for Solid 2 | `^2.0.0-rc.0` peer | Compiled with the Solid universal renderer; package smoke currently exercises RC.1 |
| `@solidjs/universal` | `2.0.0-rc.0` | Solid 2 renderer dependency |
| `solid-js` for Solid 1 | `>=1.9.0 <2` peer | Used by the Solid 1 compatibility package |
| Bun | `1.3.14` | Repository install, build, test, and release toolchain |
| TypeScript | `^5.9.2` | Package type and build validation |

When `@gpuix/native` changes its element, style, event, window, testing, or automation behavior, parity tests should move first. The package range should only widen after those tests pass.

## Desktop targets

The root lockfile resolves the GPUIX 0.8 native packages continuously exercised by this repository for:

- macOS arm64
- Linux x64 GNU
- Windows x64 MSVC

Repository CI runs native verification on macOS, Ubuntu, and Windows. The 0.8 baseline passes frozen install, lint, typecheck, logic tests, builds, Solid 1 package/consumer checks, release-tool tests, exact-package smoke, and an exact pinned GPUIX source build/link/compatibility lane.

Platform-specific window behavior should still be treated as platform-specific. The blurred-window example, for example, relies on macOS native blur behavior and is not a promise that every window option renders identically on every supported operating system.

## GPUIX 0.8 surface

The Solid host already exposes and tests parts of the 0.8 native surface directly, including:

- browser-shaped accessibility metadata such as `role` and supported `aria-*` props
- focus/tab metadata used by source-compatible controls
- `textDecoration` in the public style type, with source-edge validation that it changes native painted output
- the published 0.8 native event/window/runtime behavior consumed through the unchanged `@gpuix/native` boundary

Other upstream 0.8 capabilities are intentionally not promoted to “Solid parity” just because they exist in React/native source. Textarea newline behavior, remote HTTP images, file drop, updated Select/asChild behavior, and platform-specific window additions are being audited through focused Solid mappings/examples/tests first.

## Solid runtime conditions

A native Bun process still needs Solid's live client reactive runtime. It must not resolve Solid's SSR implementation just because the output runs outside a browser.

The Solid 2 Vite path therefore:

- compiles JSX with `generate: "universal"` and `moduleName: "gpuix-solid"`
- resolves Solid with the `browser` condition while bundling
- inlines `gpuix-solid`, `@solidjs/universal`, and `solid-js`
- keeps `@gpuix/native` external so Bun loads the platform addon normally

The `browser` condition selects Solid's live client reactivity; it does not introduce a browser DOM or web view. See [`getting-started.md`](./getting-started.md) and [`../templates/solid2-vite-bun`](../templates/solid2-vite-bun) for the copyable configuration.

The Solid 1 Vite examples follow the same runtime rule with `vite-plugin-solid` and `@jhomra21/gpuix-solid1`.

## Solid 1 browser compatibility

The Solid 1 package includes a `./web` entry used by source that imports `solid-js/web`. This exists for libraries such as Kobalte that expect browser helper functions.

It is not a browser DOM implementation. Visible elements still map to the GPUIX native host. The compatibility code supplies the tested document, selector, event, focus, portal, viewport, and element-identity behavior needed by the current Solid 1 fixtures.

The Kobalte fixture compiles installed `@kobalte/core` source through this path and protects its copied upstream docs TSX/CSS with source hashes.

## Known published 0.8 native limitation

The published `@gpuix/native@0.8.0` line still contains a physical foreground mouse-up re-entrancy defect in GPUIX text-selection cleanup. On affected macOS foreground runs, a real click can synchronously re-enter the root `GpuixView` update while GPUI already owns that entity update and abort before Solid receives the click callback.

A Solid-side deferral workaround was tested and rejected because the failure happens earlier in native event dispatch. The repository separately proved the same 0.8 source with an isolated native ownership/defer fix: real foreground paint, repeated clicks, decrement/reset, and text drag-selection/release passed. That native fix is not part of published 0.8.0 yet.

Therefore `gpuix-solid@0.1.0-beta.6` is the correct published GPUIX 0.8 **build/API baseline**, but physical foreground mouse interaction on the affected upstream native release must remain documented as a known limitation until a fixed `@gpuix/native` version ships.

## Policy

- Keep the Solid 2 and Solid 1 peer ranges separate.
- Do not claim a new GPUIX native minor before the cross-platform suite passes against it.
- Do not claim an upstream capability as Solid parity until the Solid types/host mapping and a runnable check prove it.
- Keep `@gpuix/native` external at runtime.
- Do not add React or `react-reconciler` to the Solid renderer path.
- Record operating-system-specific behavior in examples/tests instead of assuming browser CSS behavior.
- Call out dependency-range changes and known upstream blockers in release notes.
