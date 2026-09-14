# GPUix Solid starter

A minimal Solid 2 + GPUIX native desktop app that installs entirely from public npm packages.

This template intentionally lives outside the repository workspaces. Its Vite configuration matches the clean-consumer configuration exercised by GPUix Solid package smoke tests.

## Requirements

- Bun 1.3.14 or newer in the 1.3 line
- a supported `@gpuix/native` desktop platform package
- `gpuix-solid@0.1.0-beta.6`

The published 0.8 baseline currently covers the native macOS arm64, Linux x64 GNU, and Windows x64 MSVC packages used by repository CI.

## Install

```bash
bun install
```

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

## Current GPUIX 0.8 foreground-input limitation

The published `@gpuix/native@0.8.0` line still contains a physical foreground mouse-up re-entrancy bug in GPUIX text-selection cleanup. On affected macOS foreground runs, a real mouse click can abort with a `GpuixView` already being updated panic before the Solid click callback completes.

GPUix Solid does not hide that native defect with a Solid-side workaround. The repository has separately validated the same 0.8 source with the isolated native ownership fix, but that fix is not yet in the published upstream native package.

Build/typecheck/package behavior is valid on beta.6; treat physical foreground mouse interaction as a known upstream limitation until a fixed `@gpuix/native` release is available.

For the longer setup, packaging, debugging, compatibility, and limitation notes, see [`../../docs/getting-started.md`](../../docs/getting-started.md).
