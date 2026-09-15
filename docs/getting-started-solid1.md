# Build a native Solid 1 app

GPUix Solid maintains a separate renderer for Solid 1 applications. Use `@jhomra21/gpuix-solid1` with Solid 1.9.x. The Solid 2 package is `gpuix-solid` and should not be used as a drop-in replacement in a Solid 1 build.

## Current contract

The repository currently validates:

- `@jhomra21/gpuix-solid1` at the version declared in `packages/solid1/package.json`
- `solid-js@1.9.15`
- `@gpuix/native ^0.8.0`
- Bun 1.3.14
- Vite with `vite-plugin-solid`

The Solid 1 package declares `solid-js >=1.9.0 <2` as its peer range. The Solid 1 package is versioned separately from `gpuix-solid`, so the Solid 2 `0.1.0` release does not change the Solid 1 package version.

The smallest maintained reference app is [`experiments/solid1`](../experiments/solid1). The repository also validates Kobalte, Tailwind v4, a blurred window, and the DAW through the Solid 1 renderer.

## Configure TypeScript JSX

Use the Solid 1 package as the JSX import source:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "jsxImportSource": "@jhomra21/gpuix-solid1",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "vite.config.ts"]
}
```

## Configure Vite

Compile JSX with `vite-plugin-solid`, select Solid's live client runtime, and keep `@gpuix/native` external:

```ts
import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

const solid1Package = /^@jhomra21\/gpuix-solid1(?:\/.*)?$/

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "@jhomra21/gpuix-solid1",
      },
    }),
  ],
  resolve: {
    conditions: ["browser", "development"],
    dedupe: ["solid-js"],
  },
  ssr: {
    noExternal: [solid1Package, "solid-js"],
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

The `browser` condition selects Solid's live reactive runtime. It does not add a browser DOM. Bun still runs the built application as a native process, and GPUI paints the window.

## Render an app

```tsx
import { createSignal } from "solid-js"
import { render } from "@jhomra21/gpuix-solid1"

function App() {
  const [count, setCount] = createSignal(0)

  return (
    <div style={{ padding: 24, gap: 12, flexDirection: "column" }}>
      <text style={{ color: "#f7f7f7" }}>Count: {count()}</text>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCount((value) => value + 1)}
        style={{ padding: 12, backgroundColor: "#2b2b2b" }}
      >
        <text style={{ color: "#f7f7f7" }}>Increment</text>
      </div>
    </div>
  )
}

render(() => <App />, {
  title: "GPUix Solid 1",
  width: 720,
  height: 480,
})
```

Native `<text>` nodes should have an explicit color. GPUIX is not a browser CSS engine, so only host properties and compatibility behavior covered by the renderer should be assumed.

## Browser-oriented Solid 1 libraries

`@jhomra21/gpuix-solid1/web` supplies the tested compatibility layer used by browser-oriented Solid 1 source. The repository uses it with Kobalte. Visible elements still render through GPUIX rather than a DOM.

The Kobalte, Tailwind, and DAW examples are the best references for portals, focus management, outside click, keyboard input, class-based native styles, and larger application trees.

## Validate the maintained Solid 1 path

From the repository root:

```bash
bun run solid1:check
```

For the native example set:

```bash
bun run solid1:ui:diagnostic
```

The normal CI matrix also builds the Solid 1 package and consumers. See [`compatibility.md`](./compatibility.md) for the exact dependency contract and [`../examples/README.md`](../examples/README.md) for the current fixtures.
