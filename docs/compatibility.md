# Compatibility

GPUix Solid tracks GPUIX's published native contract instead of vendoring or forking the Rust renderer.

## Validated dependency contract

| Layer | Current contract | Notes |
| --- | --- | --- |
| `gpuix-solid` | current `0.1.0-beta.x` line | Solid 2 renderer in `packages/solid` |
| `@jhomra21/gpuix-solid1` | current `0.1.0-beta.x` line in this repository | Solid 1 renderer in `packages/solid1` |
| `@gpuix/native` | `^0.7.0` | GPUIX desktop renderer contract used by both Solid packages |
| `solid-js` for Solid 2 | `^2.0.0-rc.0` peer | Compiled with the Solid universal renderer |
| `@solidjs/universal` | `2.0.0-rc.0` | Solid 2 renderer dependency |
| `solid-js` for Solid 1 | `>=1.9.0 <2` peer | Used by the Solid 1 compatibility package |
| Bun | `1.3.14` | Repository install, build, test, and release toolchain |
| TypeScript | `^5.9.2` | Package type and build validation |

When `@gpuix/native` changes its element, style, event, window, testing, or automation behavior, parity tests should move first. The package range should only widen after those tests pass.

## Desktop targets

The root lockfile currently resolves the GPUIX 0.7 native packages for:

- macOS arm64
- Linux x64 GNU
- Windows x64 MSVC

Repository CI runs a native verification job on macOS, Ubuntu, and Windows. The current 0.7 line passes frozen install, lint, typecheck, tests, builds, Solid 1 package checks, Kobalte, Tailwind, DAW, release tests, and the separate exact-package smoke job.

The blurred-window example uses GPUIX's macOS native blur support. The other examples should not be read as a promise that every GPUI window option behaves identically on every operating system.

## Solid runtime conditions

A native Bun process still needs Solid's live client reactive runtime. It must not resolve Solid's SSR implementation just because the output runs outside a browser.

The Solid 2 Vite examples therefore:

- compile JSX with `generate: "universal"` and `moduleName: "gpuix-solid"`
- resolve Solid with the `browser` condition while bundling
- inline `gpuix-solid`, `@solidjs/universal`, and `solid-js`
- keep `@gpuix/native` external so Bun loads the platform addon normally

The Solid 1 Vite examples follow the same runtime rule with `vite-plugin-solid` and `@jhomra21/gpuix-solid1`.

## Solid 1 browser compatibility

The Solid 1 package includes a `./web` entry used by source that imports `solid-js/web`. This exists for libraries such as Kobalte that expect browser helper functions.

It is not a browser DOM implementation. Visible elements still map to the GPUIX native host. The compatibility code supplies the tested document, selector, event, focus, portal, viewport, and element-identity behavior needed by the current Solid 1 fixtures.

The Kobalte fixture compiles the installed `@kobalte/core@0.13.13` source through this path and protects its copied upstream docs TSX and CSS with source hashes.

## Policy

- Keep the Solid 2 and Solid 1 peer ranges separate.
- Do not claim a new GPUIX native minor before the cross-platform suite passes against it.
- Keep `@gpuix/native` external at runtime.
- Do not add React or `react-reconciler` to the Solid renderer path.
- Record operating-system-specific behavior in examples or tests instead of assuming browser CSS behavior.
- Call out dependency-range changes in release notes.
