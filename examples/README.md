# Runnable parity examples

These examples are Solid 2 ports and dogfood fixtures for the native renderer. The parity targets stay close to upstream GPUIX behavior, while the dashboard and CodeImage port intentionally exercise broader application-shaped surfaces.

The example bundles include Solid's **client reactive runtime** even though the generated JavaScript executes under Bun. Solid publishes an SSR-oriented `node` export, which is not appropriate for a long-lived native desktop renderer. The Vite configs therefore resolve the `browser` condition only while bundling Solid and GPUix Solid; `@gpuix/native` remains external and loads normally for the host platform.

## Counter

Run from the repository root:

```bash
bun run example:counter
```

This is the Solid parity target for upstream `examples/counter.tsx`. It exercises:

- Solid signals
- raw text children
- click and mouse enter/leave events
- dynamic styles
- repeated host updates through the batched native mutation path

Expected behavior: clicking the number or `+` increments, `-` decrements while the count is positive, hovering `+` changes its background, and Reset returns the value to zero.

## Native Text

Run from the repository root:

```bash
bun run example:native-text
```

This is the Solid parity target for upstream `examples/native-text.tsx`. It exercises:

- Solid `For` and `Show`
- `<markdown>`, `<code>`, and `<diff>` native GPUIX elements
- custom native props
- link, line, and diff toggle events
- dynamic tabs and styles
- scrolling and the native shared text-selection path

Expected behavior: the three tabs switch between native Markdown, highlighted TypeScript, and a scrollable word diff. Native interactions update the status line. On supported desktop platforms, text should remain selectable/copyable using GPUIX's shared native selection registry.

## Dashboard

Run from the repository root:

```bash
bun run example:dashboard
```

The dashboard is adapted from the application shell and page ideas in `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV`, originally written with Solid 1.9.7. It deliberately removes the web stack, router, authentication, Cloudflare, Convex, Kobalte, and Tailwind dependencies. The result is a deterministic Solid 2 + GPUI fixture with local demo data.

It exercises a much denser renderer surface than the parity examples:

- persistent sidebar and header shell with reactive page navigation
- Overview, Tasks, Notes, Weather, and Account pages
- flex wrapping, scrolling, cards, borders, typography, hover and active styles
- controlled native `<input>` and `<textarea>` elements
- filtering, list insertion/removal, conditional subtrees, and derived counts
- `Select`, `Tooltip`, and `animate.div` composition
- native GPUI animation of page entrances, progress bars, note panels, and weather cards
- Playwright-like `App` / `Locator` automation over `TestGpuixRenderer`
- deterministic animation-clock assertions and a real native screenshot capture

The dashboard integration test is part of `bun run test`; it navigates between pages, fills inputs, mutates tasks and notes, filters lists, selects weather data, changes preferences, drives the native `Select`, fast-forwards animations, and captures a GPUI screenshot.

## CodeImage Native

Run from the repository root:

```bash
bun run example:codeimage
```

This is a Solid 2 + GPUIX adaptation of the editor composition and visual ideas from [CodeImage](https://github.com/riccardoperra/codeimage), an MIT-licensed Solid application by Riccardo Perra. The upstream revision consulted is `27b185f18d36f2baec3a8cc5a43e8794586096c3`; at that revision CodeImage targets Solid 1.9.12.

The port deliberately keeps the recognizable application structure while replacing browser-specific dependencies with native GPUI equivalents:

- top document/export toolbar
- left Frame / Code / Theme tool rail with native tooltips
- large central screenshot canvas and code-window preview
- reactive window chrome, frame padding, radius, and emphasis controls
- controlled native filename input reflected immediately in the preview
- syntax-colored code rows rendered from native GPUI text nodes rather than CodeMirror
- Solid conditional line-number subtrees and font-size controls
- three reactive theme cards with native preview recoloring
- deterministic export status and native preview entrance animation
- TestRenderer automation that edits the document, changes theme/frame/editor settings, and captures a real GPUI screenshot

The example does **not** vendor CodeImage's backend, authentication, CodeMirror editor, UI kit, vanilla-extract styles, export pipeline, or state-management packages. See `src/codeimage/UPSTREAM.md` for the pinned source reference and upstream MIT notice.

Expected behavior on macOS: a 1280×800 native editor window opens with a CodeImage-style three-pane layout. The Frame, Code, and Theme rail buttons switch the right inspector; changing controls updates the central code screenshot immediately; editing the filename changes the preview title; and Export updates the status bar.

## Validation policy

CI runs lint, package/example typechecks, tests, and builds all example targets. The dashboard and CodeImage real `TestGpuixRenderer` integrations execute on macOS and Linux CI. The published `@gpuix/native@0.4.0` Windows binding currently does not load on GitHub-hosted Windows Server 2025, so Windows CI still compiles and builds the examples and runs platform-independent tests but skips only the native dashboard/CodeImage execution. Running `bun run example:dashboard` or `bun run example:codeimage` on a supported desktop remains the end-to-end normal-window smoke test.
