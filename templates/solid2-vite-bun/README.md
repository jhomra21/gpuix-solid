# GPUix Solid 2 starter

A minimal Solid 2 and GPUIX native desktop app that installs from public npm packages.

GPUix Solid also maintains a separate Solid 1 renderer. Solid 1 applications use `@jhomra21/gpuix-solid1`; this template is only for the Solid 2 `gpuix-solid` package.

This template lives outside the repository workspaces. Its Vite configuration matches the clean-consumer configuration used by the Solid 2 package smoke tests.

## Requirements

- Bun 1.3.14 or newer in the 1.3 line
- a supported `@gpuix/native` desktop platform package
- the paired Solid 2 RC.8 runtime line: `solid-js@2.0.0-rc.8` with `@solidjs/universal@2.0.0-rc.8` supplied by `gpuix-solid`
- the stable `gpuix-solid ^0.2.0` package line from npm `latest`

The stable 0.2 line targets exact `@gpuix/native@0.9.0` and is continuously checked on macOS arm64, Linux x64 GNU, and Windows x64 MSVC. Prerelease qualification uses exact registry versions in isolated consumers; the public starter stays on the stable range.

## Install

```bash
bun install
```

The starter uses `gpuix-solid ^0.2.0`. A fresh install therefore resolves the current compatible stable patch instead of silently opting into prerelease tags. Release qualification separately pins exact package, Solid runtime, and native versions before publication.

## Typecheck and build

```bash
bun run typecheck
bun run build
```

Vite writes the native application entry to `dist/index.js`.

## Run

```bash
bun run start
```

For the simple rebuild and run loop:

```bash
bun run dev
```

Bun runs the JavaScript process. GPUI paints the native window. There is no browser DOM, Electron renderer, or web view.

`bun run dev` rebuilds and starts a new process. This starter does not claim upstream GPUIX React's window-preserving hot reload behavior.

## Why the Vite config uses the `browser` condition

Solid publishes separate client and SSR runtime conditions. A native GPUix process needs Solid's live client reactivity even though it does not run in a browser.

The Vite config resolves the `browser` condition and compiles JSX through Solid's universal renderer. `gpuix-solid`, `@solidjs/universal`, and `solid-js` are bundled into the output. `@gpuix/native` stays external so Bun can load the platform-specific native addon.

## Native styling and state notes

GPUix Solid accepts browser-shaped JSX, but GPUIX is not browser CSS. Give native `<text>` nodes an explicit color and rely only on style properties mapped by the host and native renderer.

The current GPUIX 0.9 host path covers `role`, supported `aria-*`, `tabIndex`, `hover`, `textDecoration`, controlled text input, and window-level text selection. Solid-owned stateful helpers use the canonical `createWindowSize()`, `createWindowInsets()`, `createTextSearch()`, and `createTextSelection()` names; older `useWindow*` and `useTextSearch` names remain deprecated compatibility aliases.

## Current release line

`gpuix-solid@0.2.0` is the stable package used by this starter. The current published prerelease is `0.2.1-beta.0`; prerelease acceptance is performed in isolated exact-version consumers rather than through this template.

## Historical stable result

The stable `gpuix-solid@0.1.0` package and `@gpuix/native@0.8.0` passed the external macOS foreground acceptance test after publication. The test covered Counter interactions, text selection followed by another click, accessibility actions, multiline textarea input, Tab and focus behavior, and normal shutdown without a native panic or fatal `GpuixView` error.

The same foreground gate had already passed against `0.1.0-rc.1` before stable promotion. That is historical qualification for the 0.1/GPUIX 0.8 line; current release work targets GPUIX 0.9. The diagnostic history remains in [`../../docs/release-candidate.md`](../../docs/release-candidate.md).

For Solid 2 setup, packaging, debugging, and compatibility details, see [`../../docs/getting-started.md`](../../docs/getting-started.md). For Solid 1, see [`../../docs/getting-started-solid1.md`](../../docs/getting-started-solid1.md).
