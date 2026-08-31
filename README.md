# GPUix Solid

Solid bindings for [GPUIX](https://github.com/remorses/gpuix), which targets [GPUI](https://github.com/zed-industries/zed/tree/main/crates/gpui), Zed's GPU UI framework.

Build native desktop apps with Solid and TypeScript. Components render through GPUI to Metal, DirectX, or Vulkan. There is no Electron layer and no web view.

```text
Solid + TypeScript
      |
      v
gpuix-solid
Solid universal renderer
      |
      v
@gpuix/native
      |
      v
GPUI
      |
      v
Metal / DirectX / Vulkan
```

The primary package is `gpuix-solid` for Solid 2. This repository also contains `@jhomra21/gpuix-solid1` for Solid 1.9.x and uses it to run Kobalte, Tailwind v4, a DAW UI slice, and a Solid 1 version of the native blurred-window example.

GPUix Solid does not fork GPUIX's Rust renderer. It consumes `@gpuix/native` and implements the Solid side of the host tree, mutation batching, events, testing, and automation.

Against the published GPUIX React 0.6 desktop surface, GPUix Solid now has Solid 2 counterparts for Counter, Native Text, Blurred Window, Todo, Diff, Timeline, Chat, and Infinite Chat. The remaining upstream runtime gap is the browser/WebGPU WebAssembly renderer.

## Quickstart

GPUIX upstream has a CLI scaffold. GPUix Solid does not have one yet. A Solid app currently uses Vite so the Solid compiler can target the universal renderer and bundle Solid's client reactive runtime for native execution.

### 1. Install the Solid 2 packages

```bash
bun add gpuix-solid@beta solid-js@^2.0.0-rc.0
bun add -d @solidjs/vite-plugin@^3.0.0-next.29 vite@^8 typescript@^5.9 @types/node
```

`gpuix-solid` depends on `@gpuix/native`, so the native renderer for the current platform comes with the package.

### 2. Point TypeScript at GPUix Solid JSX

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "jsxImportSource": "gpuix-solid",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`jsxImportSource` is required. Without it TypeScript uses the wrong JSX element types.

### 3. Configure the Solid universal compiler

Create `vite.config.ts`:

```ts
import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "gpuix-solid",
      },
    }),
  ],
  resolve: {
    conditions: ["browser", "development"],
  },
  ssr: {
    noExternal: ["gpuix-solid", "@solidjs/universal", "solid-js"],
    resolve: {
      conditions: ["browser", "development", "import", "default"],
    },
  },
  build: {
    target: "node22",
    ssr: "src/index.tsx",
    outDir: "dist/app",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
```

The `browser` condition here selects Solid's live client runtime. The built JavaScript still runs under Bun as a native desktop process. `@gpuix/native` stays external so Bun can load the platform addon normally.

### 4. Write the entry file

Create `src/index.tsx`:

```tsx
import { render } from "gpuix-solid"
import { createSignal } from "solid-js"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 24,
        gap: 12,
        flexDirection: "column",
        backgroundColor: "#181818",
      }}
    >
      <text style={{ color: "#f5f5f5", fontSize: 20 }}>
        Count: {count()}
      </text>

      <div
        onClick={() => setCount((value) => value + 1)}
        style={{
          width: 140,
          padding: 12,
          borderRadius: 8,
          cursor: "pointer",
          backgroundColor: "#2a2a2a",
          hover: { backgroundColor: "#343434" },
        }}
      >
        <text style={{ color: "#f5f5f5" }}>Increment</text>
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "Solid GPUIX",
  width: 800,
  height: 600,
})
```

Give native `<text>` nodes an explicit `color`. GPUI does not inherit text color from a parent the way browser CSS does.

### 5. Build and run it

Add scripts to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "build": "vite build",
    "start": "bun dist/app/index.js",
    "dev": "bun run build && bun run start"
  }
}
```

Then run:

```bash
bun run dev
```

The documented Solid path is Vite plus Bun. This repository does not yet provide a Solid-specific `gpuix new` scaffold or wrap GPUIX's browser WebAssembly renderer.

## Solid 1 support

`packages/solid1` contains the Solid 1 renderer package named `@jhomra21/gpuix-solid1`.

Its peer range is `solid-js >=1.9.0 <2`, and it uses `@gpuix/native ^0.6.0`. The Solid 1 renderer has the same native host contract as the Solid 2 package, plus compatibility code needed by browser-oriented Solid libraries such as Kobalte.

That compatibility code does not turn GPUIX into a browser DOM. It provides the browser behaviors that the tested Solid libraries read while their visible output still goes through native GPUIX elements.

## Examples

Run these commands from the repository root. The longer example guide lives in [examples/README.md](./examples/README.md).

### GPUIX parity examples

These Solid 2 examples correspond directly to the desktop examples in `remorses/gpuix`. The ports keep the same native capability being tested while using Solid state and lifecycle primitives instead of React.

| Upstream example | Run | What it covers |
| --- | --- | --- |
| [Counter](./examples/counter/src/index.tsx) | `bun run example:counter` | Signals, click events, hover state, and repeated native updates |
| [Native text](./examples/counter/src/native-text.tsx) | `bun run example:native-text` | Native `<markdown>`, `<code>`, and `<diff>` elements, tabs, scrolling, selection, and link events |
| [Blurred window](./examples/counter/src/blurred-window.tsx) | `bun run example:blurred-window` | GPUIX 0.6 native blur, transparent titlebar, resize behavior, traffic-light placement, plus the Solid username welcome and personalized dashboard flow |
| [Todo](./examples/counter/src/todo) | `bun run example:todo` | Standalone app structure, native input, lists, sidebar motion, icons, hover controls, and virtual-list anchoring |
| [Diff](./examples/counter/src/diff) | `bun run example:diff` | Unified and split source diffs, Shiki highlighting, word-level changes, multi-hunk rendering, and scrolling |
| [Timeline](./examples/counter/src/timeline) | `bun run example:timeline` | Two-axis pan, clip move and trim, snapping, scrubbing, zoom, marquee selection, culling, frozen panes, and pointer capture |
| [Chat](./examples/counter/src/chat) | `bun run example:chat` | Native virtual list, Solid-composed safe-MDX, menus, selection, composer input, window insets, scrolling, and sidebar animation |
| [Infinite chat](./examples/counter/src/infinite-chat) | `bun run example:infinite-chat` | Bidirectional virtual history, bounded page cache, edge loading, logical anchor restoration, and MDX link navigation |

The Diff fixture declares `diff` and `shiki` as normal example-workspace dependencies. Chat and Infinite Chat declare `safe-mdx`, but use only `safe-mdx/parse`; the parsed tree is rendered into Solid components and GPUIX host nodes rather than React.

The remaining upstream runtime example is the browser/WebGPU path. GPUix Solid currently targets the native desktop renderer and does not wrap GPUIX's browser Wasm renderer.

The exact baseline and current gaps are tracked in [docs/upstream-parity.md](./docs/upstream-parity.md).

### Solid ecosystem examples

These examples are additional coverage rather than replacements for the upstream parity ports.

| Example | Run | What it covers |
| --- | --- | --- |
| [Dashboard](./examples/counter/src/dashboard) | `bun run example:dashboard` | A multi-page Solid 2 app with inputs, textarea, lists, `Select`, `Tooltip`, native animations, and screenshot tests |
| [CodeImage](./examples/counter/src/codeimage) | `bun run example:codeimage` | A Solid 2 native editor UI with frame, code, theme, input, and export controls |
| [TanStack kitchen sink](./examples/counter/src/tanstack-kitchen-sink) | `bun run example:tanstack-kitchen-sink` | An adaptation of the TanStack Router Solid 2 kitchen-sink shell with local deterministic route data |
| [Solid 1 blurred window](./examples/solid1-blurred-window) | `bun run example:solid1-blurred-window` | The blurred-window example through the Solid 1 renderer |
| [Kobalte](./examples/solid1-kobalte) | `bun run example:solid1-kobalte` | Real `@kobalte/core@0.13.13` source, pinned docs TSX and CSS, portals, menus, dialogs, focus, keyboard input, and SVG icons |
| [Tailwind v4](./examples/solid1-tailwind) | `bun run example:solid1-tailwind` | Tailwind v4 classes compiled into native style data, theme tokens, hover and active states, and reactive `classList` changes |
| [DAW](./examples/solid1-daw) | `bun run example:solid1-daw` | A source-first Solid 1 port of a browser DAW slice with transport controls, tracks, ruler, bottom panels, Tailwind classes, and native adapters |

The Solid 2 examples live under `examples/counter` because that directory started as the smallest parity fixture and grew into the shared Solid 2 example package. The Solid 1 examples have separate directories because each one owns its compiler or compatibility setup.

### Performance workloads

The repository also ports the upstream Chat and Timeline performance workloads and adds a Solid-side mutation serialization benchmark:

```bash
bun run perf:chat
bun run perf:timeline
bun run bench:serialization
```

The commands print timing samples. The upstream React thresholds are shown as references only. Compare React and Solid on the same machine, native package version, fixture size, and interaction script before drawing a framework performance conclusion.

The serialization command captures the mutation tuples emitted by Solid's real `applyBatch` path. It measures JSON encoding, UTF-8 buffer conversion, and style interning. The Rust decoder benchmark remains in upstream GPUIX because this repository consumes that native code rather than carrying a Rust fork.

### Kobalte runs through the native host

The Kobalte fixture is not a local copy of Kobalte components rewritten for GPUIX.

Files under `examples/solid1-kobalte/src/upstream/kobalte` are pinned copies of Kobalte documentation examples. Their normal imports still look like this:

```ts
import { Dialog } from "@kobalte/core/dialog"
import { DropdownMenu } from "@kobalte/core/dropdown-menu"
```

Vite resolves those imports to the installed `@kobalte/core` source. Kobalte and the fixture compile through the Solid universal renderer, while `solid-js/web` resolves to GPUix Solid's compatibility module.

The current native fixture covers Button, TextField, Image, Separator, Tooltip, DropdownMenu, ContextMenu, Menubar, and Dialog. Tests also cover portal placement, outside click, focus restoration, menu switching, keyboard behavior, and dialog geometry.

The copied upstream TSX and CSS are hash checked. Compatibility changes belong under the renderer and compatibility modules, not inside the copied Kobalte source.

## Architecture

Solid compiles JSX against a custom universal runtime instead of the browser DOM.

```text
Solid signal update
        |
        v
Solid computation
        |
        v
JS host node update
        |
        v
batched native mutations
        |
        v
@gpuix/native applyBatch
        |
        v
Rust retained tree
        |
        v
GPUI frame
```

The JavaScript host tree keeps the synchronous parent, child, and sibling information that Solid needs while reconciling arrays and conditional children. Native state stays in GPUIX's retained Rust tree.

Solid updates do not pass through React or `react-reconciler`. The renderer sends accepted host mutations to `@gpuix/native`, which applies them in batches.

GPUI then lays out and paints the retained tree. Native animations stay on the GPUI side after Solid sends their targets.

## Packages

`gpuix-solid` is the Solid 2 renderer. It exports the renderer, JSX runtime, native components, testing helpers, animation API, live window geometry hooks (`useWindowSize` and `useWindowInsets`), text search helpers (`useTextSearch` and `findRanges`), and `gpuix-solid/automation`.

`@jhomra21/gpuix-solid1` is the Solid 1 renderer in `packages/solid1`. It also exports `./web` compatibility and Kobalte-oriented helper entry points used by the Solid 1 examples.

`@gpuix/native` comes from the upstream [remorses/gpuix](https://github.com/remorses/gpuix) project. This repository depends on it instead of carrying a Rust fork.

There is no GPUix Solid CLI package today.

## Testing and automation

`TestGpuixRenderer` drives the same retained native tree used by normal applications. Tests can inspect native tree state, dispatch real native input, read layout bounds and logical virtual-list anchors, inspect painted text highlights, read granted window size/insets, control the native animation clock, and capture screenshots.

The Solid 2 package also exports a Playwright-like automation API:

```ts
import { createTestApp } from "gpuix-solid/automation"
import { createTestRoot } from "gpuix-solid"

const testRoot = createTestRoot()
const app = createTestApp(testRoot.renderer)

await app.getByTestId("save").click()
await app.getByTestId("name").fill("New name")
await app.getByTestId("clip").dragBy(120, 0, { steps: 8 })
await app.getByTestId("history").wheel(0, 240)
```

Locators query the current native automation tree each time. They support test ID, text, and type queries, nested locators, bounds and centers, click, hover, wheel, `dragTo`, `dragBy`, fill, press, text reads, counts, and waits.

For lower-level gesture tests, `app.mouse` exposes native move/down/up/click/wheel/drag operations. Those commands are what the Timeline parity tests use for pointer-captured clip movement, trimming, scrubbing, zoom, and marquee selection.

`gpuix-solid/automation` also has a typed stdio transport for controlling a launched native process. The live backend can inject native keystrokes and mouse input rather than replacing user interactions with direct state updates.

CI has verify jobs on macOS, Ubuntu, and Windows, plus a separate exact-package smoke job. The GPUIX 0.6 line validates frozen install, lint, typecheck, native package tests, Todo, Diff, Timeline, Chat, Infinite Chat, Dashboard, CodeImage, and TanStack integration tests/builds, Solid 1 package checks, the Kobalte fixture, the Tailwind fixture, the DAW fixture, release tests, and package smoke validation.

## Compatibility

The current repository contract is:

| Layer | Current contract |
| --- | --- |
| Solid 2 package | `gpuix-solid`, `solid-js ^2.0.0-rc.0`, `@solidjs/universal 2.0.0-rc.0` |
| Solid 1 package | `@jhomra21/gpuix-solid1`, `solid-js >=1.9.0 <2` |
| Native renderer | `@gpuix/native ^0.6.0` |
| Bun | `1.3.14` in repository CI |
| TypeScript | `^5.9.2` in the published package line |

The root lockfile currently resolves GPUIX 0.6 desktop bindings for macOS arm64, Linux x64 GNU, and Windows x64 MSVC. Repository CI validates one runner in each OS family.

See [docs/compatibility.md](./docs/compatibility.md) for the longer compatibility notes.

## Development

This repository uses Bun.

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
bun run build
bun run solid1:check
node --test scripts/release.test.mjs
```

`bun run solid1:check` builds and validates the Solid 1 package plus the Kobalte, blurred-window, Tailwind, and DAW examples.

Read [ARCHITECTURE.md](./ARCHITECTURE.md) before changing renderer ownership or mutation behavior. [AGENTS.md](./AGENTS.md) records repository rules for human and agent contributors. Release work is documented in [RELEASING.md](./RELEASING.md).

## Relationship to GPUIX

[GPUIX](https://github.com/remorses/gpuix) defines the native renderer contract this project targets. GPUix Solid follows its element model, style and event behavior, window options, retained-tree mutations, native testing behavior, automation conventions, and desktop examples where they apply to Solid.

The projects differ in the JavaScript framework layer. GPUIX upstream uses React and `react-reconciler`. GPUix Solid uses Solid's universal compiler and keeps a small synchronous host tree for Solid reconciliation.

The published GPUIX 0.6 desktop example set now has Solid 2 counterparts for Counter, Native Text, Blurred Window, Todo, Diff, Timeline, Chat, and Infinite Chat. The DAW remains a separate Solid fixture and does not stand in for Timeline.

GPUIX upstream also has `@gpuix/cli`, a browser WebAssembly renderer, and documented single-binary builds. GPUix Solid does not wrap those paths yet.

For Solid 1, this repository also carries browser-compatibility code so source written for Kobalte and similar Solid libraries can run against the native host without changing the upstream application files.

## Credits

The native renderer, retained-tree contract, element model, window behavior, and much of the testing behavior come from [remorses/gpuix](https://github.com/remorses/gpuix).

[GPUI](https://github.com/zed-industries/zed/tree/main/crates/gpui) is part of Zed. [Solid](https://github.com/solidjs/solid) provides the compiler and reactive runtime.

The application fixtures cite their own upstream sources and licenses in their example directories and in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

This repository is not an official GPUIX, Zed, Kobalte, Tailwind, TanStack, or Solid project.
