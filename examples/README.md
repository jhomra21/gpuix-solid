# Examples

GPUix Solid keeps runnable examples for two purposes:

- **GPUIX parity:** Solid 2 ports of the published GPUIX desktop examples.
- **Solid ecosystem coverage:** larger or framework-specific fixtures that exercise the renderer beyond the upstream example set.

Run the commands below from the repository root. All Solid 2 examples compile with Solid's universal renderer and execute as native Bun processes through `@gpuix/native`; they are not browser apps or Electron windows.

The shared Solid 2 example workspace lives under `examples/counter` because it began as the smallest parity fixture and grew into the common build package. Solid 1 fixtures remain separate because they own different compiler and compatibility setups.

## GPUIX parity examples

The current published GPUIX 0.6 desktop example set has Solid 2 counterparts for Counter, Native Text, Blurred Window, Todo, Diff, Timeline, Chat, and Infinite Chat.

### Counter

```bash
bun run example:counter
```

Covers Solid signals, click events, mouse enter/leave, dynamic styles, raw text children, and repeated updates through the batched native mutation path.

### Native Text

```bash
bun run example:native-text
```

Covers native `<markdown>`, `<code>`, and `<diff>` elements, tabs, scrolling, shared native text selection, custom props, and link/diff events.

### Blurred Window

```bash
bun run example:blurred-window
```

Covers GPUIX 0.6 window blur, a transparent titlebar, traffic-light placement, native resizing, and background-window behavior. The Solid example also includes an animated username welcome flow with autofocus, Enter/click submission, and a personalized blurred dashboard.

### Todo

```bash
bun run example:todo
```

Covers a standalone application layout, native `<input>`, view switching, hover-only row controls, completion/star/delete actions, sidebar animation, SVG artwork, and `<virtual-list>` anchoring when rows are prepended.

### Diff

```bash
bun run example:diff
```

Covers unified and split source diffs, multi-hunk layouts, word-level changes, scrolling, and syntax highlighting. The fixture uses the same kind of JavaScript dependencies as the upstream example:

- `diff` computes structured and word-level changes.
- `shiki` tokenizes and highlights source code.

The rendered output is still ordinary Solid/GPUIX host content.

### Timeline

```bash
bun run example:timeline
```

Covers the interaction-heavy editor surface from upstream: clip movement, cross-track dragging, edge trimming, snapping, playhead scrubbing, marquee selection, zoom-under-pointer, two-axis pan, frozen panes, culling, track collapse, and pointer capture.

The native test fixture exercises those gestures through GPUix Solid's mouse automation rather than replacing them with direct state mutations.

### Chat

```bash
bun run example:chat
```

Covers a native virtualized transcript, composer input, model/options menus, text selection, scrolling, window insets, sidebar animation, code/diff blocks, and composed Markdown/MDX.

Chat depends on `safe-mdx`, but it does **not** run React. GPUix Solid imports `safe-mdx/parse`, reads the parsed MDAST tree, and renders that tree into Solid components and GPUIX host nodes.

### Infinite Chat

```bash
bun run example:infinite-chat
```

Covers bounded bidirectional history, fake paged loading, cache eviction, top/bottom edge loading, logical native scroll-anchor restoration, and navigation from links inside the same Solid-composed MDX content used by Chat.

### Remaining upstream runtime path

GPUIX upstream also has a browser/WebGPU WebAssembly renderer. GPUix Solid currently targets the native desktop renderer and does not wrap that browser path yet.

The exact upstream baseline and gap tracking live in [`docs/upstream-parity.md`](../docs/upstream-parity.md).

## Solid ecosystem examples

These are additional renderer fixtures, not substitutes for the upstream parity ports.

### Dashboard

```bash
bun run example:dashboard
```

A multi-page Solid 2 application shell adapted from `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV`. The native version removes the web stack and keeps deterministic local data.

It exercises inputs, textarea, filtering, list insertion/removal, derived counts, `Select`, `Tooltip`, `animate.div`, native animation-clock control, navigation, and screenshot automation.

### CodeImage Native

```bash
bun run example:codeimage
```

A Solid 2 + GPUIX adaptation of the editor composition and visual ideas from [CodeImage](https://github.com/riccardoperra/codeimage). It covers a three-pane editor layout, native inputs and controls, syntax-colored code rows, theme/frame settings, reactive preview updates, tooltips, animations, export status, and screenshot tests.

The fixture does not vendor CodeImage's backend, authentication, CodeMirror editor, UI kit, export pipeline, or state-management packages. See `counter/src/codeimage/UPSTREAM.md` for the pinned source reference and license note.

### TanStack kitchen sink

```bash
bun run example:tanstack-kitchen-sink
```

A native Solid 2 adaptation of the TanStack Router kitchen-sink application shell with deterministic local route data. It gives the renderer another application-shaped navigation and layout workload without bringing in a browser router.

## Solid 1 examples

GPUix Solid also keeps a Solid 1 renderer package and native fixtures for browser-oriented Solid libraries.

### Solid 1 blurred window

```bash
bun run example:solid1-blurred-window
```

Runs the native blurred-window contract through `@jhomra21/gpuix-solid1`.

### Kobalte

```bash
bun run example:solid1-kobalte
```

Runs real `@kobalte/core@0.13.13` source through the Solid 1 native host. The fixture covers Button, TextField, Image, Separator, Tooltip, DropdownMenu, ContextMenu, Menubar, Dialog, portals, focus restoration, outside click, keyboard input, and SVG icons.

### Tailwind v4

```bash
bun run example:solid1-tailwind
```

Compiles Tailwind v4 classes into native style data and exercises theme tokens, hover/active states, and reactive `classList` changes.

### DAW

```bash
bun run example:solid1-daw
```

A source-first Solid 1 port of a browser DAW slice with transport controls, tracks, ruler, bottom panels, Tailwind classes, and native adapters. It is additional dogfood and does not stand in for the upstream Timeline parity fixture.

## Performance workloads

The repository ports the upstream Chat and Timeline performance workloads and adds a Solid mutation-serialization benchmark:

```bash
bun run perf:chat
bun run perf:timeline
bun run bench:serialization
```

These commands are measurement tools, not framework-performance claims. Compare React and Solid on the same machine, native package version, fixture size, and interaction script before drawing conclusions.

The serialization workload captures mutation tuples emitted by Solid's real `applyBatch` path and measures JSON encoding, UTF-8 buffer conversion, and style interning. The Rust decoder benchmark remains upstream because this repository consumes GPUIX's native package instead of carrying a Rust fork.

## Automated example tests

`bun run test` includes native integration coverage for:

- Todo
- Diff
- Timeline
- Chat
- Infinite Chat
- Dashboard
- CodeImage
- TanStack kitchen sink

The Timeline suite drives real mouse move/down/up sequences, including pointer-captured drags. Chat and Infinite Chat exercise selection, scrolling, MDX composition, composer behavior, edge loading, and navigation. Todo exercises input and virtual-list anchoring.

## Validation policy

The repository currently targets `@gpuix/native ^0.6.0`.

CI verifies frozen install, lint, typecheck, native tests, and builds on macOS, Ubuntu, and Windows, plus a separate exact-package smoke job. The Solid 1 validation chain also covers Kobalte, blurred-window, Tailwind, and DAW fixtures.

For the complete repository commands, compatibility matrix, and package setup, see the root [`README.md`](../README.md).
