# Examples

GPUix Solid keeps runnable examples for two purposes:

- **GPUIX parity:** Solid 2 ports of the published GPUIX desktop examples.
- **Solid ecosystem coverage:** larger or framework-specific fixtures that exercise the renderer beyond the upstream example set.

Run the commands below from the repository root. All Solid 2 examples compile with Solid's universal renderer and execute as native Bun processes through `@gpuix/native`; they are not browser apps or Electron windows.

The shared Solid 2 example workspace lives under `examples/counter` because it began as the smallest parity fixture and grew into the common build package. Solid 1 fixtures remain separate because they own different compiler and compatibility setups.

Where upstream source exists, the repository keeps a pinned copy and treats source structure, copy, assets, and component ownership as the reference. Browser-, React-, router-, network-, or package-specific substitutions belong in compatibility code instead of being used as a reason to redesign the example.

## GPUIX parity examples

The published GPUIX 0.6 desktop examples have Solid 2 parity coverage for Counter, Native Text, Todo, Diff, Timeline, Chat, and Infinite Chat. Timeline remains in the automated/performance suite, but the public video-editor example is the real Diffusion Studio editor described below.

### Counter

```bash
bun run example:counter
```

Covers Solid signals, click events, mouse enter/leave, dynamic styles, raw text children, and repeated updates through the batched native mutation path.

### Native Text

```bash
bun run example:native-text
```

Covers native `<markdown>`, `<code>`, and `<diff>` elements, tabs, scrolling, shared native text selection, custom props, and link/diff events. Its component and `CodeBlock` structure track the pinned upstream fixture rather than a simplified local rewrite.

### Blurred Window

```bash
bun run example:blurred-window
```

There is one Solid 2 Blurred Window example. It is the animated username/welcome glass showcase with native blur, a transparent titlebar, traffic-light placement, native resizing, and background-window behavior. There is no separate `blurred-window-showcase` command.

### Todo

```bash
bun run example:todo
```

Covers a standalone application layout, native `<input>`, view switching, hover-only row controls, completion/star/delete actions, sidebar animation, the pinned upstream SVG artwork, and `<virtual-list>` anchoring when rows are prepended.

### Diff

```bash
bun run example:diff
```

Covers unified and split source diffs, multi-hunk layouts, word-level changes, scrolling, and syntax highlighting. The fixture uses the same kind of JavaScript dependencies as the upstream example:

- `diff` computes structured and word-level changes.
- `shiki` tokenizes and highlights source code.

The rendered output is still ordinary Solid/GPUIX host content.

### Chat

```bash
bun run example:chat
```

Covers the pinned upstream conversation data and application surface: a native virtualized transcript, composer input, grouped model/options menus, reasoning metadata, project/workspace/branch fixtures, text selection, scrolling, window insets, sidebar animation, code/diff blocks, and composed Markdown/MDX.

Chat depends on `safe-mdx`, but it does **not** run React. GPUix Solid imports `safe-mdx/parse`, reads the parsed MDAST tree, and renders that tree through a Solid adapter whose typography and block structure track the upstream Chat renderer.

### Infinite Chat

```bash
bun run example:infinite-chat
```

Covers bounded bidirectional history, fake paged loading, cache eviction, top/bottom edge loading, logical native scroll-anchor restoration, and navigation from links inside the same Solid-composed MDX content used by Chat. The source audit is pinned alongside the other GPUIX fixtures.

### Remaining upstream runtime path

GPUIX upstream also has a browser/WebGPU WebAssembly renderer. GPUix Solid currently targets the native desktop renderer and does not wrap that browser path yet.

The exact upstream baseline and gap tracking live in [`docs/upstream-parity.md`](../docs/upstream-parity.md).

## Source-first application examples

These are additional renderer fixtures, not substitutes for the upstream parity ports. Their source snapshots are pinned when the example originates in another repository.

### Diffusion Studio editor

```bash
bun run example:diffusion
```

A source-first native port of the actual open-source `diffusionstudio/editor` application at commit `585fb010dcca36919f096f4b1275d535acab0cb9`. The real editor is already Solid, so the native fixture preserves its `EditorPage` ownership directly: `SidebarLeft`, `Canvas`, `Inspector`, `Layers`, `Timeline`, `Soundboard`, and `FloatingProjectHeader`.

Exact upstream source bytes for the editor page and the main visible component owners are vendored under `counter/upstream/diffusion-editor/` and hash checked. Koota, the Diffusion runtime/reconciler, project compilation/watch services, DOM drag-and-drop, EngineCanvas/Web canvas drawing, Web Audio nodes, Tailwind, and browser UI primitives are compatibility concerns underneath that application structure.

The older GPUIX mock project named `Diffusion Studio Pro` is not the source of this public example. Its Timeline port remains only as an internal native test/performance workload.

See `counter/src/diffusion/UPSTREAM.md` for the exact source contract.

### Dashboard

```bash
bun run example:dashboard
```

A source-first Solid 2 port of the six Dashboard routes from `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV`. The pinned route files remain the application reference; the native port preserves their page ownership and user-facing copy while router, auth, network, persistence, and modal differences are isolated as deterministic native compatibility behavior.

The integration test exercises Home/API feedback, task creation/filter/edit/delete, note creation/archive/filtering, weather location/refresh behavior, account editing and guarded deletion, navigation, scrolling, logout, and native screenshot automation.

See `counter/src/dashboard/UPSTREAM.md` for the pinned revision and route blob hashes.

### CodeImage Native

```bash
bun run example:codeimage
```

A source-first Solid 2 + GPUIX port of CodeImage's editor `App` composition. The local `app.tsx` keeps the upstream toolbar, left sidebar, portal host, canvas, frame handler, managed/preview frame, frame toolbar, footer, and right sidebar/theme-switcher ownership instead of recreating a lookalike editor.

Native replacements for CodeImage stores, UI-kit components, CodeMirror-dependent behavior, browser modality, export/share behavior, and styling live behind `counter/src/codeimage/compat.tsx`. See `counter/src/codeimage/UPSTREAM.md` for the pinned source and license.

### TanStack kitchen sink

```bash
bun run example:tanstack-kitchen-sink
```

A source-pinned native port of TanStack Router's Solid 2 file-based kitchen sink. The fixture keeps the upstream root, home/login, Dashboard, Invoices, and Users route hierarchy while native route state, deterministic local query data, GPUIX controls, and omitted browser-only devtools stay below the route/application boundary.

See `counter/src/tanstack-kitchen-sink/UPSTREAM.md` for the pinned TanStack revision and compatibility contract.

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
- Timeline (internal GPUIX parity workload)
- Diffusion Studio editor
- Chat
- Infinite Chat
- Dashboard
- CodeImage
- TanStack kitchen sink

The Timeline suite drives real mouse move/down/up sequences, including pointer-captured drags. The Diffusion suite guards the actual editor component ownership plus representative asset, playback, timeline, and UI interactions. Chat and Infinite Chat exercise selection, scrolling, MDX composition, composer behavior, edge loading, and navigation. Todo exercises input and virtual-list anchoring. Dashboard additionally exercises real native controlled inputs, modal interaction, scroll-to-target geometry, and uppercase confirmation input.

`bun run source:check` verifies the pinned GPUIX, Dashboard, CodeImage, TanStack, and Diffusion Studio source snapshots against their recorded Git blob hashes.

## Validation policy

The repository currently targets `@gpuix/native ^0.6.0`.

CI verifies frozen install, lint, typecheck, native tests, and builds on macOS, Ubuntu, and Windows, plus a separate exact-package smoke job. The Solid 1 validation chain also covers Kobalte, blurred-window, Tailwind, and DAW fixtures.

For the complete repository commands, compatibility matrix, and package setup, see the root [`README.md`](../README.md).
