# Examples

GPUix Solid keeps runnable native examples for three different reasons:

1. **Build confidence:** small examples make a public API or native capability easy to understand and regression-test.
2. **GPUIX parity:** Solid ports preserve the purpose and source structure of audited upstream GPUIX examples.
3. **Application dogfood:** larger Solid applications exercise the renderer under realistic layouts, routing, scrolling, controls, and interaction patterns.

All Solid 2 examples compile with Solid's universal renderer and execute as native Bun processes through exact `@gpuix/native@0.9.0`. They are not browser apps or Electron windows.

Run commands from the repository root after:

```bash
bun install
```

If you are trying to build your own application rather than work on this repository, start with [`../docs/getting-started.md`](../docs/getting-started.md) for Solid 2 or [`../docs/getting-started-solid1.md`](../docs/getting-started-solid1.md) for Solid 1. The copyable [`../templates/solid2-vite-bun`](../templates/solid2-vite-bun) project is Solid 2 only.

## Start with these

| Example | Run | Why it is useful |
| --- | --- | --- |
| GPUIX 0.9 surface | `bun run example:gpuix-08` | Focused Solid proof for accessibility metadata, accessible click, textarea Enter/newline behavior, `textDecoration`, and reactive window selection |
| Dashboard | `bun run example:dashboard` | App-shaped Solid 2 surface with routing/auth/network/modal compatibility, controlled input, lists, scrolling, and guarded actions |
| CodeImage | `bun run example:codeimage` | Editor composition with toolbars, canvas/frame layout, sidebars, theme controls, and native compatibility boundaries |
| Chat | `bun run example:chat` | Virtualized transcript, composer input, menus, text selection, scrolling, animation, code/diff content, and Solid-composed MDX |
| Timeline | `bun run example:timeline` | Pan/zoom, clip move/trim, snapping, scrubbing, marquee selection, culling, frozen panes, and pointer capture |
| Todo | `bun run example:todo` | Native input, lists, hover controls, sidebar motion, icons, and virtual-list anchoring |
| Counter | `bun run example:counter` | Smallest signal/click/hover/update fixture |

The README screenshot gallery is generated from these Solid-rendered native windows. Upstream React screenshots are never presented as GPUix Solid output.

## Focused GPUIX 0.9 surface

```bash
bun run example:gpuix-08
```

This example exists specifically to keep upstream availability separate from proven Solid exposure. It demonstrates the current GPUIX 0.9 surface with Solid host mappings and runnable native checks:

- **Accessibility metadata:** `role`, `aria-label`, `aria-id`, `tabIndex`, and a clickable native host node. The Solid regression verifies the retained custom props and click listener; the exact GPUIX source-edge detector separately inspects the native accessibility tree and AccessKit Click action.
- **Textarea Enter/newline:** a controlled native `<textarea>` round-trips Enter as `"\n"` through the Solid `onChange` path.
- **Text decoration:** `underline` and `line-through` use the public `textDecoration` style property. The Solid regression verifies the retained style, while the source-edge detector separately verifies that decoration changes native painted screenshot output.
- **Reactive window selection:** `createTextSelection()` exposes the current native selection as a Solid accessor, owns its native subscription through the calling Solid owner, and clears through the same primitive.

The focused Solid regression runs in the normal `test:logic` contract and therefore also runs inside the exact pinned GPUIX source-edge check.

The GPUIX 0.9 baseline also carries the earlier HTTP image, file-drop/window, and interaction improvements. Those are **not** automatically labeled Solid parity. Each capability is promoted here only after the Solid types/host mapping and a runnable check prove the public path.

## GPUIX parity snapshots

The runnable ports below preserve the application/component purpose and audited source reference of upstream GPUIX examples while translating the React/runtime boundary to Solid.

The native execution baseline is GPUIX 0.9. Some copied example source snapshots intentionally remain pinned to the immutable upstream commit they were originally audited against; upgrading the native dependency does not silently rewrite source-fidelity fixtures.

### Counter

```bash
bun run example:counter
```

Covers Solid signals, click events, mouse enter/leave, dynamic styles, raw text children, and repeated updates through the batched native mutation path.

### Native Text

```bash
bun run example:native-text
```

Covers native `<markdown>`, `<code>`, and `<diff>` elements, tabs, scrolling, native text selection, custom props, and link/diff events. Its component and `CodeBlock` structure track the pinned upstream fixture rather than a simplified local rewrite.

### Blurred Window

```bash
bun run example:blurred-window
```

The single Solid 2 Blurred Window target is the animated username/welcome glass showcase with native blur, transparent titlebar behavior, traffic-light placement, resizing, and background-window behavior. Native blur/window behavior is platform-specific and should not be read as a cross-platform visual guarantee.

### Todo

```bash
bun run example:todo
```

Covers a standalone application layout, native `<input>`, view switching, hover-only row controls, completion/star/delete actions, sidebar animation, pinned upstream SVG artwork, and `<virtual-list>` anchoring when rows are prepended.

### Diff

```bash
bun run example:diff
```

Covers unified/split source diffs, multi-hunk layouts, word-level changes, scrolling, and syntax highlighting. `diff` computes changes and `shiki` tokenizes source; the visible output is still Solid/GPUIX native host content.

### Timeline

```bash
bun run example:timeline
```

Covers the audited GPUIX timeline workload with two-axis pan, clip move/trim, snapping, scrubbing, zoom, marquee selection, culling, frozen panes, and pointer capture. It also forms the basis of the repository's timeline performance workload.

### Mail

```bash
bun run example:mail
```

Exercises the source-owned three-pane mail layout, icons/visual structure, selection/filter controls, compose/navigation surfaces, native window behavior, and source-first compatibility against the audited GPUIX source snapshot.

### Chat

```bash
bun run example:chat
```

Covers the pinned conversation data/application surface: native virtualized transcript, composer input, grouped menus, reasoning metadata, project/workspace/branch fixtures, selection, scrolling, window insets, sidebar animation, code/diff blocks, and composed Markdown/MDX.

Chat uses `safe-mdx/parse` only. The parsed MDAST tree is rendered through a Solid adapter and GPUIX host nodes; React is not used in the renderer path.

### Infinite Chat

```bash
bun run example:infinite-chat
```

Covers bounded bidirectional history, deterministic paged loading, cache eviction, top/bottom edge loading, logical native scroll-anchor restoration, and navigation from links inside the same Solid-composed MDX content used by Chat.

### Browser/WebGPU path

GPUIX upstream also has a browser/WebGPU WebAssembly renderer. GPUix Solid currently targets the native desktop renderer and does not wrap that browser runtime.

The exact source/native baseline and gap tracking live in [`../docs/upstream-parity.md`](../docs/upstream-parity.md).

## Source-first application dogfood

These are additional renderer fixtures rather than substitutes for the upstream parity ports. When an application comes from another repository, its source snapshot is pinned and compatibility changes live beneath the application boundary.

### Diffusion Studio editor

```bash
bun run example:diffusion
```

A source-first native port of the open-source `diffusionstudio/editor` application at the audited revision recorded in `counter/src/diffusion/UPSTREAM.md`. The real editor is already Solid, so the native fixture preserves its `EditorPage` ownership directly: `SidebarLeft`, `Canvas`, `Inspector`, `Layers`, `Timeline`, `Soundboard`, and `FloatingProjectHeader`.

Koota, Diffusion runtime/reconciler services, project compilation/watch services, DOM drag-and-drop, EngineCanvas/Web canvas drawing, Web Audio nodes, Tailwind, and browser UI primitives stay compatibility concerns underneath that source-owned application structure.

### Dashboard

```bash
bun run example:dashboard
```

A source-first Solid 2 port of the six Dashboard routes from `jhomra21/cloudflare-workers-solid-tanstack-spa-betterauth-D1-KV`. The pinned routes remain the application reference while router, auth, network, persistence, and modal differences are isolated as deterministic native compatibility.

Its integration coverage exercises API feedback, task/note CRUD, filters, weather refresh/location behavior, account editing/guarded deletion, navigation, scrolling, logout, controlled inputs, and native screenshot automation.

### CodeImage

```bash
bun run example:codeimage
```

A source-first Solid 2 + GPUIX port of CodeImage's editor `App` composition. The native version preserves toolbar, sidebar, portal host, canvas, frame handler, managed/preview frame, frame toolbar, footer, and theme-switcher ownership instead of recreating a lookalike editor.

Native replacements for browser/UI-kit/CodeMirror-dependent behavior live behind the compatibility boundary documented in `counter/src/codeimage/UPSTREAM.md`.

### TanStack kitchen sink

```bash
bun run example:tanstack-kitchen-sink
```

A source-pinned native port of TanStack Router's Solid 2 file-based kitchen sink. The fixture keeps the upstream root, home/login, Dashboard, Invoices, and Users route hierarchy while native route state, deterministic local query data, GPUIX controls, and omitted browser-only devtools remain below the route/application boundary.

## Solid 1 ecosystem coverage

GPUix Solid also keeps a Solid 1 renderer and real ecosystem/application fixtures.

| Example | Run | Coverage |
| --- | --- | --- |
| Solid 1 blurred window | `bun run example:solid1-blurred-window` | native blurred-window contract through the Solid 1 renderer |
| Kobalte | `bun run example:solid1-kobalte` | installed `@kobalte/core` source, portals, menus, dialogs, focus restoration, outside click, keyboard input, SVG |
| Tailwind v4 | `bun run example:solid1-tailwind` | Tailwind classes compiled into native style data, theme tokens, hover/active states, reactive `classList` |
| DAW | `bun run example:solid1-daw` | source-first DAW UI with transport, tracks, ruler, mixer/effects, Tailwind classes, and native adapters |

The DAW is additional dogfood; it does not replace the GPUIX Timeline parity fixture.

## Why source snapshots are pinned

Where upstream source exists, GPUix Solid treats source structure, copy, assets, and component ownership as the reference. Browser-, React-, router-, network-, or package-specific substitutions belong in compatibility code instead of becoming a reason to redesign the example.

`bun run source:check` verifies the recorded upstream Git blob hashes. See [`../docs/upstream-parity.md`](../docs/upstream-parity.md) and the example-local `UPSTREAM.md` files for exact revisions and boundaries.

This provenance work matters for contributors, but it is not required reading to build a normal application with the public package.

## Performance workloads

```bash
bun run perf:chat
bun run perf:timeline
bun run bench:serialization
```

These are measurement tools, not framework-performance claims. Compare React and Solid on the same machine, native package version, fixture size, and interaction script before drawing conclusions.

The serialization workload captures mutation tuples emitted by Solid's real `applyBatch` path and measures JSON encoding, UTF-8 conversion, and style interning. The Rust decoder benchmark remains upstream because this repository consumes GPUIX's native package rather than carrying a Rust fork.

## Automated example validation

The normal deterministic contracts include:

- focused GPUIX 0.8 accessibility/textarea/text-decoration Solid regression
- Todo
- Diff
- Timeline
- Mail
- Diffusion Studio editor
- Chat
- Infinite Chat
- Dashboard
- CodeImage
- TanStack kitchen sink
- Solid 1 package and consumer builds
- Kobalte/Tailwind/DAW native fixtures in their dedicated validation lanes
- exact package smoke in clean consumers
- exact pinned GPUIX 0.8 source build/link/compatibility

Physical foreground macOS input remains a separate acceptance category. The exact published `gpuix-solid@0.1.0-rc.1` and `@gpuix/native@0.8.0` pair passed the external Counter and GPUIX 0.8 text/input foreground test on September 15, 2026 with no crash or fatal `GpuixView` error. The earlier source-level ownership concern remains documented as diagnostic history rather than a currently reproduced release blocker.
