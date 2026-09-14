# GPUix Solid starter

A minimal Solid 2 + GPUIX native desktop app that installs entirely from public npm packages.

This template intentionally lives outside the repository workspaces. Its Vite configuration matches the clean-consumer configuration exercised by GPUix Solid package smoke tests.

## Requirements

- Bun 1.3.14 or newer in the 1.3 line
- a supported `@gpuix/native` desktop platform package
- the current `gpuix-solid@beta` prerelease channel

The published 0.8 baseline currently covers the native macOS arm64, Linux x64 GNU, and Windows x64 MSVC packages used by repository CI.

## Install

```bash
bun install
```

The template uses the npm `beta` dist-tag intentionally so a copied prerelease starter follows the currently validated GPUix Solid prerelease rather than freezing on an older beta.

## Typecheck and build

```bash
bun run typecheck
bun run build
```

Vite writes the native app entry to `dist/index.js`.

## Run

```bash
bun run start
```

Or use the simple rebuild-and-run loop:

```bash
bun run dev
```

The JavaScript process runs under Bun, but the visible window is a GPUI native window. There is no browser DOM, Electron renderer, or web view.

## Why the Vite config uses the `browser` condition

Solid publishes separate client and SSR runtime conditions. A native GPUix process still needs Solid's live client reactivity even though it does not run in a browser. The Vite config therefore resolves the `browser` condition while compiling JSX with Solid's universal renderer.

`gpuix-solid`, `@solidjs/universal`, and `solid-js` are bundled into the output so runtime package resolution cannot accidentally select Solid's SSR path. `@gpuix/native` remains external so Bun can load the platform-specific native addon normally.

## Native styling notes

GPUix Solid accepts browser-shaped JSX, but it is not browser CSS. Native `<text>` nodes should have an explicit `color`, and only the style properties mapped by the host/native renderer are supported.

The starter also shows `role`, `aria-label`, `tabIndex`, `hover`, and `textDecoration`, which are part of the current Solid host contract for the GPUIX 0.8 baseline.

## Foreground-input release-candidate gate

Source inspection of published `@gpuix/native@0.8.0` still shows the text-selection mouse-up ownership path that previously reproduced a `GpuixView already being updated` abort. A source-built 0.8 candidate with the isolated native ownership/defer patch also passed foreground acceptance.

However, a fresh external consumer using the actual published `gpuix-solid@0.1.0-beta.7` + `@gpuix/native@0.8.0` registry packages also passed real macOS paint, hover, repeated clicks, and text-selection drag/release with no panic. That means the current evidence no longer supports describing every published 0.8 foreground run as broken, but the source/runtime discrepancy is still unresolved.

Before stable promotion, the release candidate is therefore tested again against the original Counter interaction path and a second text/textarea-heavy surface. Do not remove the upstream-risk note solely from one successful foreground run.

For the longer setup, packaging, debugging, compatibility, and release-candidate notes, see [`../../docs/getting-started.md`](../../docs/getting-started.md).
