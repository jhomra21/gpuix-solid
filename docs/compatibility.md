# Compatibility

GPUix Solid supports Solid 1 and Solid 2 through separate renderer packages. Both packages target GPUIX's published native contract instead of carrying a Rust fork.

Use [`getting-started.md`](./getting-started.md) for Solid 2 and [`getting-started-solid1.md`](./getting-started-solid1.md) for Solid 1.

## Validated dependency contract

| Layer | Current contract | Notes |
| --- | --- | --- |
| `gpuix-solid` | stable `0.2.0`; published prerelease `0.2.1-beta.0`; repository contains post-beta fixes for the next prerelease | Solid 2 renderer in `packages/solid` |
| `solid-js` for Solid 2 | peer `^2.0.0-rc.8` | Repository package and clean-consumer qualification use `2.0.0-rc.8` |
| `@solidjs/universal` | exact `2.0.0-rc.8` | Direct runtime dependency paired with the Solid 2 RC.8 peer line |
| `@jhomra21/gpuix-solid1` | repository package version `0.1.0-beta.0` | Solid 1 renderer in `packages/solid1`; versioned separately from `gpuix-solid` |
| `solid-js` for Solid 1 | peer `>=1.9.0 <2` | Repository CI exercises `1.9.15` |
| `@gpuix/native` | exact `0.9.0` | Native desktop renderer contract used by both Solid packages; exact pairing follows GPUIX's pre-1.0 version policy |
| pinned GPUIX source edge | `7ac9880abd8e91e5bf0e4feb0fa850729cf95a68` | Exact source reference for the published 0.9.0 baseline |
| Bun | `1.3.14` | Repository install, build, test, and release toolchain |
| TypeScript | `^5.9.2` | Package type and build validation |

The Solid 2 runtime pair moves together. `@solidjs/universal@2.0.0-rc.8` declares `solid-js ^2.0.0-rc.8` as its peer, so the renderer package, examples, clean consumers, and lockfile are kept on that same RC.8 line instead of mixing release candidates.

The Solid 1 and Solid 2 package versions do not move together automatically. The stable `gpuix-solid` release line advances the Solid 2 package only. Solid 1 remains maintained under `@jhomra21/gpuix-solid1` with its own version and peer range.

When `@gpuix/native` changes its element, style, event, window, testing, or automation behavior, parity tests should move first. Widen dependency ranges only after those tests pass.

## Desktop targets

The repository continuously exercises the GPUIX 0.9 native packages for:

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

## Solid 2 API conventions

Solid-owned helpers that allocate signals, timers, or native subscriptions use `create*` names: `createWindowSize()`, `createWindowInsets()`, `createTextSearch()`, and `createTextSelection()`. The `useWindowSize`, `useWindowInsets`, and `useTextSearch` names remain deprecated compatibility aliases so applications can migrate without an abrupt 0.2 break.

Context readers keep normal Solid context naming. `useGpuix()` reads the existing renderer context; it does not allocate a new reactive primitive.

Component context helpers explicitly reject missing providers so a `SelectTrigger`, `ComboboxInput`, or `TooltipContent` used outside its root fails at the component boundary rather than later with an unrelated property-access error.

## Solid 1 browser compatibility

The Solid 1 package has a `./web` entry for source that imports browser-oriented Solid helpers. The repository uses this path with Kobalte.

It is not a browser DOM implementation. Visible nodes still map to GPUIX. The compatibility layer implements the document, selector, event, focus, portal, viewport, and element-identity behavior covered by the current fixtures.

The maintained Solid 1 validation set includes the compatibility lab, Kobalte, Tailwind v4, a blurred-window app, and the DAW.

## GPUIX 0.9 support

The Solid host mappings cover the GPUIX 0.9 behavior that has explicit Solid tests or runnable examples. That includes accessibility metadata, focus and tab metadata, text decoration, controlled textarea input, HTTP images in the Mail example, window-level selection-change events, and the native event/window contract consumed through `@gpuix/native`. The app-facing selection API is `createTextSelection()`, which returns a Solid accessor and follows owner cleanup rather than React component-state conventions.

An upstream native feature is not treated as Solid support until the Solid types or compatibility layer expose it and a test or runnable example proves the path.

Current upstream GPUIX documentation also covers React-specific CLI, hot reload, Hermes, app packaging, auto-update, shell completion, and browser/WebGPU workflows. GPUix Solid does not claim those paths until the Solid integration is implemented and validated.

## Foreground acceptance status

GPUIX 0.9 ships the native click/selection ownership fix that replaced the old 0.8 source-level risk.

The published `gpuix-solid@0.2.1-beta.0` passed clean external-consumer build and interaction checks. That run exposed one Solid integration gap: native text selection painted correctly, but `createTextSelection()` stayed at `Selection: none` because the production batch adapter did not forward `setWindowSelectionChange()`.

PR #98 fixed that forwarding in both Solid renderers. Its exact candidate `ab6436a0744a2907dcbf9325efbc0365e30e5517` passed full CI and Mail Acceptance. Live native automation then selected “Select this GPUIX 0.9 text”, observed the reactive label update, cleared back to `Selection: none`, selected again, and performed a later action click exactly once. The focused GPUIX surface test also passed; only the known duplicate-font warnings appeared.

A literal physical foreground mouse/trackpad drag on the current GPUIX 0.9 line is still unverified because CUA could not attach to the Bun-launched native window. That distinction remains explicit in the release qualification record.

The older `0.1.0` / GPUIX 0.8 foreground runs remain historical evidence. See [`release-candidate.md`](./release-candidate.md) and [`upstream-parity.md`](./upstream-parity.md).

## Policy

- Keep the Solid 1 and Solid 2 package and peer ranges separate.
- Keep the Solid 2 framework and universal-renderer release-candidate line aligned unless compatibility is deliberately tested and documented otherwise.
- Do not claim a new GPUIX native minor before the cross-platform suite passes against it.
- Do not claim a native capability as Solid support until a Solid mapping and runnable check prove it.
- Keep `@gpuix/native` external at application runtime.
- Do not add React or `react-reconciler` to either Solid renderer path.
- Record operating-system-specific behavior in tests or docs instead of assuming browser CSS behavior.
- Record dependency-range changes and known upstream risks in release notes.
