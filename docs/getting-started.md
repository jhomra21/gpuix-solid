# Build a native Solid 2 app

GPUix Solid compiles Solid JSX into GPUIX's retained native tree. The JavaScript process runs under Bun; GPUI creates and paints the desktop window. There is no Electron renderer and no browser web view.

This guide targets the published baseline:

- `gpuix-solid@0.1.0-beta.6`
- `@gpuix/native ^0.8.0`
- Solid 2 RC
- Bun 1.3.14
- Vite 8.1.5 with `@solidjs/vite-plugin@3.0.0-next.29`

A copyable project with these exact settings lives at [`templates/solid2-vite-bun`](../templates/solid2-vite-bun).

## 1. Create a project

Start with an empty directory:

```bash
mkdir my-gpuix-app
cd my-gpuix-app
bun init -y
```

Install the public runtime packages:

```bash
bun add gpuix-solid@0.1.0-beta.6 solid-js@2.0.0-rc.1
```

Install the compiler/build packages:

```bash
bun add -d @solidjs/vite-plugin@3.0.0-next.29 vite@8.1.5 typescript@5.9.2
```

`gpuix-solid` depends on `@gpuix/native`, so npm/Bun resolves the platform native package as part of a normal install.

## 2. Configure TypeScript JSX

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

`jsxImportSource` is required. It makes TypeScript use GPUix Solid's JSX types rather than browser DOM element types.

## 3. Configure Solid's universal renderer

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

### Why a native app resolves Solid's `browser` condition

Solid's `browser` export is its live client reactive runtime. The alternative SSR runtime is designed for one-shot server rendering and does not provide the update behavior a long-lived desktop UI needs.

Using the `browser` condition here does **not** add a browser, DOM, or web view. It only selects Solid's client reactivity while JSX is compiled through the universal renderer into GPUix Solid host operations.

The build inlines `gpuix-solid`, `@solidjs/universal`, and `solid-js` so the launched process cannot accidentally resolve the SSR variant later. `@gpuix/native` stays external because Bun must load its platform-specific `.node` addon normally.

## 4. Write the app

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
        padding: 32,
        gap: 16,
        flexDirection: "column",
        backgroundColor: "#151515",
      }}
    >
      <text style={{ color: "#f7f7f7", fontSize: 28 }}>
        GPUix Solid
      </text>

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

Native `<text>` nodes should receive an explicit `color`. GPUix Solid accepts browser-shaped JSX, but GPUI is not a browser CSS engine and unsupported/inherited browser behavior should not be assumed.

## 5. Build and run

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

Then:

```bash
bun run typecheck
bun run build
bun run start
```

`bun run dev` is currently a rebuild-and-run command, not browser HMR. A first-party GPUix Solid app scaffold/dev server does not exist yet.

## What the build produces

Vite emits the application JavaScript entry in `dist/`. The native renderer is **not** bundled into that JavaScript. At runtime Bun resolves the installed `@gpuix/native` package and loads its platform native addon.

That boundary matters for app packaging:

- keep `@gpuix/native` external in Vite/Rollup
- preserve the installed platform-specific native package and `.node` binary when assembling an application bundle
- do not treat the output as a self-contained browser bundle
- do not assume a single-file JavaScript compiler will automatically embed/load a native Node-API addon correctly

GPUix Solid does not yet provide an installer/app-bundle CLI. The repository currently proves package installation, TypeScript compilation, Vite builds, native package loading, and runnable native examples; final `.app`, `.exe`, installer, signing, and notarization workflows remain application/distribution concerns.

## Validated platforms

The repository's current GPUIX 0.8 lock/CI matrix validates:

- macOS arm64
- Linux x64 GNU
- Windows x64 MSVC

That is a statement about the platforms continuously exercised by this repository, not a promise that every GPUI/window feature behaves identically on every operating system. Native blur/window effects in particular can be platform-specific.

See [`compatibility.md`](./compatibility.md) for the exact dependency and platform contract.

## GPUIX 0.8 capabilities exposed through Solid

The current Solid 2 host types include the 0.8-facing accessibility metadata (`role`, supported `aria-*` fields), focus/tab metadata, and `textDecoration`. The source-edge capability suite also validates the native 0.8 accessibility/custom-prop path and painted text-decoration output.

Additional 0.8 features such as textarea newline behavior, remote HTTP images, file drop, and updated selection/focus behavior are being promoted into focused runnable Solid examples only after their Solid host mapping and native behavior are proven. Do not infer support from the upstream React API alone.

## Debugging

### The app builds but reactivity is wrong

Check that the Vite config still contains:

```ts
resolve: {
  conditions: ["browser", "development"],
}
```

and that `gpuix-solid`, `@solidjs/universal`, and `solid-js` remain in `ssr.noExternal`. Accidentally resolving Solid's SSR runtime is a common way to produce a build that looks valid but does not behave like a live client application.

### Bun cannot load the native addon

Check that `@gpuix/native` is still listed in `rollupOptions.external` and that the matching platform package exists under `node_modules` after install.

### Native/Rust crash diagnostics

Run the built app with a Rust backtrace enabled:

```bash
RUST_BACKTRACE=1 bun dist/index.js
```

Keep the full native panic/backtrace; failures below the JS callback boundary cannot be diagnosed reliably from a Solid stack alone.

### Text is invisible

Give native `<text>` an explicit `color`. Browser-style color inheritance is not a general native-host guarantee.

## Known GPUIX 0.8 foreground-input limitation

`gpuix-solid@0.1.0-beta.6` intentionally matches the published `@gpuix/native@0.8.0` line. That upstream native release still contains a physical foreground mouse-up re-entrancy defect in text-selection cleanup: on affected macOS foreground runs, a real click can attempt to update the root `GpuixView` while GPUI already holds that entity update, causing a fatal `GpuixView already being updated` panic before Solid receives the click.

GPUix Solid previously tested and rejected a Solid-side timing workaround because the failure occurs inside native event dispatch. A source-built GPUIX 0.8 candidate with the isolated native ownership/defer fix passes real foreground click, repeated updates, reset, and text drag-selection/release, but that fix is not yet present in the published upstream native package.

Until upstream publishes the native fix:

- beta.6 is the correct GPUIX 0.8 package/build baseline
- build, typecheck, package-smoke, and source compatibility are validated
- do not describe physical foreground mouse interaction on published 0.8.0 as fixed

The native ownership work remains tracked separately from the public 0.8 documentation/examples work.

## Where to go next

- [`../templates/solid2-vite-bun`](../templates/solid2-vite-bun) — copyable public-package starter
- [`../examples/README.md`](../examples/README.md) — runnable application examples
- [`compatibility.md`](./compatibility.md) — dependency/platform contract
- [`upstream-parity.md`](./upstream-parity.md) — audited GPUIX/source parity and known gaps
- [`gpuix-edge.md`](./gpuix-edge.md) — contributor-only source-edge workflow
