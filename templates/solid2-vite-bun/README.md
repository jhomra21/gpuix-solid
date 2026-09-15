# GPUix Solid 2 starter

A minimal Solid 2 and GPUIX native desktop app that installs from public npm packages.

GPUix Solid also maintains a separate Solid 1 renderer. Solid 1 applications use `@jhomra21/gpuix-solid1`; this template is only for the Solid 2 `gpuix-solid` package.

This template lives outside the repository workspaces. Its Vite configuration matches the clean-consumer configuration used by the Solid 2 package smoke tests.

## Requirements

- Bun 1.3.14 or newer in the 1.3 line
- a supported `@gpuix/native` desktop platform package
- Solid 2, with the current release qualification on `solid-js@2.0.0-rc.1`
- the current `gpuix-solid@beta` package until stable `0.1.0` is published

The GPUIX 0.8 package line is continuously checked on macOS arm64, Linux x64 GNU, and Windows x64 MSVC.

## Install

```bash
bun install
```

The template currently follows the npm `beta` tag because `gpuix-solid@0.1.0` has not been published yet. The exact published candidate `0.1.0-rc.1` passed the stable-release foreground gate on September 15, 2026. After `0.1.0` is published to `latest`, the template dependency should move from `beta` to the stable line.

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

## Why the Vite config uses the `browser` condition

Solid publishes separate client and SSR runtime conditions. A native GPUix process needs Solid's live client reactivity even though it does not run in a browser.

The Vite config resolves the `browser` condition and compiles JSX through Solid's universal renderer. `gpuix-solid`, `@solidjs/universal`, and `solid-js` are bundled into the output. `@gpuix/native` stays external so Bun can load the platform-specific native addon.

## Native styling notes

GPUix Solid accepts browser-shaped JSX, but GPUIX is not browser CSS. Give native `<text>` nodes an explicit color and rely only on style properties mapped by the host and native renderer.

The starter also exercises `role`, `aria-label`, `tabIndex`, `hover`, and `textDecoration` on the GPUIX 0.8 line.

## Foreground release result

Earlier source analysis of `@gpuix/native@0.8.0` found a text-selection mouse-up ownership path that could reproduce a fatal nested root-view update.

The exact published `gpuix-solid@0.1.0-rc.1` and `@gpuix/native@0.8.0` pair passed the external foreground acceptance test. Counter interactions, selection and follow-up input, accessibility actions, multiline textarea input, Tab and focus behavior, and normal shutdown completed without a native panic or fatal `GpuixView` error.

The pass qualifies the Solid 2 candidate for stable promotion. It does not claim the upstream source-level ownership concern was removed.

For Solid 2 setup, packaging, debugging, and compatibility details, see [`../../docs/getting-started.md`](../../docs/getting-started.md). For Solid 1, see [`../../docs/getting-started-solid1.md`](../../docs/getting-started-solid1.md).
