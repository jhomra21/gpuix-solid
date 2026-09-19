# Build a native Solid 2 app

GPUix Solid supports Solid 1 and Solid 2 through separate renderer packages. This guide is for Solid 2 and uses `gpuix-solid`. For Solid 1, use [`getting-started-solid1.md`](./getting-started-solid1.md) and `@jhomra21/gpuix-solid1`.

GPUix Solid compiles Solid JSX into GPUIX's retained native tree. Bun runs the JavaScript process and GPUI paints the desktop window. There is no Electron renderer or browser web view.

## Current Solid 2 contract

The current `0.2.x` line uses:

- `gpuix-solid@0.2.0` on npm `latest`, with `0.2.1-beta.0` as the current published prerelease
- `solid-js ^2.0.0-rc.8`
- exact `@gpuix/native 0.9.0`
- `@solidjs/universal 2.0.0-rc.8` as the renderer's direct runtime dependency
- Bun 1.3.14
- Vite 8.1.5 with `@solidjs/vite-plugin@3.0.0-next.29`

The Solid runtime pair is kept aligned: `@solidjs/universal@2.0.0-rc.8` peers on `solid-js ^2.0.0-rc.8`, and repository package smoke exercises that same pair in clean npm and Bun consumers.

Install the published package and the Solid 2 runtime used by the current repository baseline:

```bash
bun add gpuix-solid solid-js@2.0.0-rc.8
bun add -d @solidjs/vite-plugin@3.0.0-next.29 vite@8.1.5 typescript@5.9.2
```

A copyable Solid 2 project lives at [`templates/solid2-vite-bun`](../templates/solid2-vite-bun). The public starter tracks the stable `^0.2.0` line; release qualification for prereleases uses exact versions in clean external consumers instead of moving the starter onto a beta tag.

## Create a project

```bash
mkdir my-gpuix-app
cd my-gpuix-app
bun init -y
```

Install the runtime and build packages shown above.

`gpuix-solid` depends on `@gpuix/native`, so Bun resolves the matching platform package during a normal install.

## Configure TypeScript JSX

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "jsxImportSource": "gpuix-solid",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`jsxImportSource` makes TypeScript use GPUix Solid's JSX types instead of browser DOM element types.

## Configure Solid's universal renderer

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
    outDir: "dist",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
```

A native GPUix process still needs Solid's live client reactive runtime. The `browser` condition selects that runtime. It does not add a DOM or web view.

The build bundles `gpuix-solid`, `@solidjs/universal`, and `solid-js`. `@gpuix/native` stays external so Bun can load its platform-specific native addon.

## Write the app

Create `src/index.tsx`:

```tsx
import { createSignal } from "solid-js"
import { render } from "gpuix-solid"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: 32,
        gap: 16,
        flexDirection: "column",
        backgroundColor: "#151515",
      }}
    >
      <text style={{ color: "#f7f7f7", fontSize: 28 }}>GPUix Solid</text>
      <text style={{ color: "#f7f7f7" }}>Count: {count()}</text>
      <div
        role="button"
        aria-label="Increment counter"
        tabIndex={0}
        onClick={() => setCount((value) => value + 1)}
        style={{
          width: 160,
          padding: 12,
          borderRadius: 8,
          cursor: "pointer",
          backgroundColor: "#2b2b2b",
          hover: { backgroundColor: "#383838" },
        }}
      >
        <text style={{ color: "#f7f7f7" }}>Increment</text>
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "My GPUix app",
  width: 720,
  height: 480,
})
```

> [!IMPORTANT]
> Give native `<text>` nodes an explicit `color`. GPUI does not inherit text color from a parent the way browser CSS does, so an omitted color can paint black text on a dark surface.

## Use Solid-owned native state

Helpers that allocate reactive state or native subscriptions follow Solid's `create*` convention:

```tsx
import {
  createTextSearch,
  createTextSelection,
  createWindowInsets,
  createWindowSize,
} from "gpuix-solid"

function NativeState() {
  const size = createWindowSize()
  const insets = createWindowInsets()
  const selection = createTextSelection()
  const search = createTextSearch({ query: "GPUix" })

  return (
    <text style={{ color: "#f7f7f7" }}>
      {size.width} × {size.height}; selected {selection.text() ?? "nothing"}; {search.total} matches; visible height {insets.visibleHeight}
    </text>
  )
}
```

`useWindowSize`, `useWindowInsets`, and `useTextSearch` remain deprecated compatibility aliases for existing code. `useGpuix()` remains the context accessor because it reads an existing renderer context rather than creating state.

## Build and run

Add these scripts to `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "vite build",
    "start": "bun dist/index.js",
    "dev": "bun run build && bun run start"
  }
}
```

Then run:

```bash
bun run typecheck
bun run build
bun run start
```

`bun run dev` rebuilds and starts the native app. It is not browser HMR and does not preserve the existing native window.

## Package the native app

Vite writes the JavaScript entry to `dist/`. The native renderer is not bundled into that file.

Keep `@gpuix/native` external in Vite or Rollup. Preserve the installed platform package and its `.node` binary when assembling an application bundle. GPUix Solid does not yet ship an app installer or signing tool, so `.app`, `.exe`, installer, signing, and notarization work still belongs to the application.

Upstream GPUIX documents additional React-specific CLI, compiled-binary, Hermes, packaging, auto-update, shell-completion, and browser/WebGPU workflows. GPUix Solid does not claim those as supported Solid workflows until they have an implemented and tested Solid path.

## Validated platforms

Repository CI continuously checks the GPUIX 0.9 package line on:

- macOS arm64
- Linux x64 GNU
- Windows x64 MSVC

Window behavior can still vary by operating system. Native blur is one example.

## Current 0.2.x acceptance

The published `gpuix-solid@0.2.1-beta.0` passed clean external-consumer build and interaction checks. The post-beta selection-subscription fix was then qualified on exact candidate `ab6436a0744a2907dcbf9325efbc0365e30e5517`: live native automation observed a real selection value through `createTextSelection()`, clear back to `null`, reselection, and a later action click with no fatal runtime error.

That validates the live native renderer event path. A literal physical mouse/trackpad drag remains unverified on the current GPUIX 0.9 line because CUA could not attach to the Bun-launched native window.

## Historical foreground result

Earlier source analysis of `@gpuix/native@0.8.0` found a text-selection mouse-up ownership path that could reproduce a nested `GpuixView` update.

The exact published `gpuix-solid@0.1.0-rc.1` with `@gpuix/native@0.8.0` passed the external macOS foreground qualification test on September 15, 2026. After stable publication, `gpuix-solid@0.1.0` passed the same external foreground test. Counter increment, decrement, number click, reset, hover, text selection, accessibility actions, multiline textarea input, Tab and focus behavior, follow-up clicks, and process shutdown all passed. No native panic or fatal `GpuixView` error occurred.

That result is the stable `0.1.0` qualification record. It does not describe the current GPUIX 0.9 baseline. The history and exact gate remain documented in [`release-candidate.md`](./release-candidate.md).

To repeat the stable `0.1.0` registry test exactly:

```bash
GPUIX_SOLID_VERSION=0.1.0 node scripts/test-published-foreground.mjs all
```

For a later published release, set `GPUIX_SOLID_VERSION` to the exact registry version you want to test.

## Next references

- [Solid 1 setup](./getting-started-solid1.md)
- [Solid 2 starter](../templates/solid2-vite-bun)
- [Examples](../examples/README.md)
- [Compatibility](./compatibility.md)
- [Upstream parity](./upstream-parity.md)
- [Source-edge workflow](./gpuix-edge.md)
