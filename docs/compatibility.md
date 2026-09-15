# Compatibility

GPUix Solid supports Solid 1 and Solid 2 through separate renderer packages. Both packages target GPUIX's published native contract instead of carrying a Rust fork.

Use [`getting-started.md`](./getting-started.md) for Solid 2 and [`getting-started-solid1.md`](./getting-started-solid1.md) for Solid 1.

## Validated dependency contract

| Layer | Current contract | Notes |
| --- | --- | --- |
| `gpuix-solid` | stable `0.1.x` line from npm `latest` | Solid 2 renderer in `packages/solid` |
| `solid-js` for Solid 2 | peer `^2.0.0-rc.0` | Release qualification and package smoke exercise `2.0.0-rc.1` |
| `@solidjs/universal` | `2.0.0-rc.0` | Runtime dependency used by the Solid 2 renderer |
| `@jhomra21/gpuix-solid1` | repository package version `0.1.0-beta.0` | Solid 1 renderer in `packages/solid1`; versioned separately from `gpuix-solid` |
| `solid-js` for Solid 1 | peer `>=1.9.0 <2` | Repository CI exercises `1.9.15` |
| `@gpuix/native` | `^0.8.0` | Native desktop renderer contract used by both Solid packages |
| pinned GPUIX source edge | `8d3ec094387152558d05a5b37de3cfbfca5d2d0a` | Exact source reference used for the published 0.8.0 baseline |
| Bun | `1.3.14` | Repository install, build, test, and release toolchain |
| TypeScript | `^5.9.2` | Package type and build validation |

The Solid 1 and Solid 2 package versions do not move together automatically. The stable `gpuix-solid` release line advances the Solid 2 package only. Solid 1 remains maintained under `@jhomra21/gpuix-solid1` with its own version and peer range.

When `@gpuix/native` changes its element, style, event, window, testing, or automation behavior, parity tests should move first. Widen dependency ranges only after those tests pass.

## Desktop targets

The repository continuously exercises the GPUIX 0.8 native packages for:

- macOS arm64
- Linux x64 GNU
- Windows x64 MSVC

CI runs native verification on macOS, Ubuntu, and Windows. The current line checks frozen install, lint, typecheck, logic tests, builds, Solid 1 package and consumer tests, release tooling, exact package smoke, and the pinned GPUIX source build and compatibility lane.

Window behavior can still vary by operating system. Native blur is one example.

## Solid runtime conditions

A native Bun process still needs Solid's live client reactive runtime. Running outside a browser does not mean the app should resolve Solid's SSR implementation.

The Solid 2 Vite path compiles JSX with `generate: "universal"` and `moduleName: "gpuix-solid"`. It resolves Solid with the `browser` condition, bundles `gpuix-solid`, `@solidjs/universal`, and `solid-js`, and keeps `@gpuix/native` external.

The Solid 1 path follows the same runtime rule with `vite-plugin-solid` and `moduleName: "@jhomra21/gpuix-solid1"`. It also deduplicates `solid-js` so browser-oriented Solid 1 libraries use the same runtime instance as the renderer.

The `browser` condition selects Solid's live reactive runtime. It does not add a DOM or web view.

## Solid 1 browser compatibility

The Solid 1 package has a `./web` entry for source that imports browser-oriented Solid helpers. The repository uses this path with Kobalte.

It is not a browser DOM implementation. Visible nodes still map to GPUIX. The compatibility layer implements the document, selector, event, focus, portal, viewport, and element-identity behavior covered by the current fixtures.

The maintained Solid 1 validation set includes the compatibility lab, Kobalte, Tailwind v4, a blurred-window app, and the DAW.

## GPUIX 0.8 support

The Solid host mappings cover the GPUIX 0.8 behavior that has explicit Solid tests or runnable examples. That includes accessibility metadata, focus and tab metadata, text decoration, controlled textarea input, HTTP images in the Mail example, and the native event and window contract consumed through `@gpuix/native`.

An upstream native feature is not treated as Solid support until the Solid types or compatibility layer expose it and a test or runnable example proves the path.

Current upstream GPUIX documentation also covers React-specific CLI, hot reload, Hermes, app packaging, auto-update, shell completion, and browser/WebGPU workflows. GPUix Solid does not claim those paths until the Solid integration is implemented and validated.

## Foreground acceptance status

Earlier source analysis of `@gpuix/native@0.8.0` found a text-selection mouse-up ownership path that could reproduce a fatal nested root-view update on macOS. The repository kept that as a release risk instead of adding a Solid-side workaround.

The exact published `gpuix-solid@0.1.0-rc.1` with `@gpuix/native@0.8.0` passed the external foreground qualification test on September 15, 2026. After publication, stable `gpuix-solid@0.1.0` passed the same external Counter and GPUIX 0.8 text/input foreground test. Click, hover, selection, focus, accessibility, multiline textarea, follow-up interaction, and shutdown paths completed without a crash or fatal `GpuixView` error.

That result is the stable `0.1.0` qualification record. It does not prove that the upstream source-level ownership concern was removed. Keep the diagnostic history in [`release-candidate.md`](./release-candidate.md) and [`upstream-parity.md`](./upstream-parity.md).

## Policy

- Keep the Solid 1 and Solid 2 package and peer ranges separate.
- Do not claim a new GPUIX native minor before the cross-platform suite passes against it.
- Do not claim a native capability as Solid support until a Solid mapping and runnable check prove it.
- Keep `@gpuix/native` external at application runtime.
- Do not add React or `react-reconciler` to either Solid renderer path.
- Record operating-system-specific behavior in tests or docs instead of assuming browser CSS behavior.
- Record dependency-range changes and known upstream risks in release notes.
