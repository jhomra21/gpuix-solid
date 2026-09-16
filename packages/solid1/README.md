# @jhomra21/gpuix-solid1

Solid 1 bindings for GPUIX.

GPUix Solid supports Solid 1 and Solid 2 through separate renderer packages. `@jhomra21/gpuix-solid1` is the Solid 1 package. `gpuix-solid` is the Solid 2 package. Do not swap the package names without also changing the Solid compiler configuration.

## Supported versions

The Solid 1 package declares `solid-js >=1.9.0 <2` as its peer range. Repository CI currently exercises `solid-js@1.9.15` against exact `@gpuix/native@0.9.0`.

The package has its own version line. The `gpuix-solid@0.1.0` stable release applies to the Solid 2 package and does not change the Solid 1 package version.

## Compiler and runtime setup

Compile Solid 1 JSX with `vite-plugin-solid` and the universal renderer:

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
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
```

The `browser` condition selects Solid's live reactive runtime. It does not add a DOM or web view.

Solid 1 updates synchronously, so this renderer flushes GPUI mutations after Solid work instead of using the Solid 2 `flush()` scheduling contract.

## Current coverage

The maintained Solid 1 path includes native JSX host elements, `render`, `createRoot`, Solid control-flow primitives, native events, controlled inputs and textareas, retained-tree insertion and reordering, and GPU-backed test integration when the native package exposes `TestGpuixRenderer`.

The package also has a `./web` compatibility entry for browser-oriented Solid 1 source such as Kobalte. That entry supplies the tested document, portal, focus, selector, and event behavior used by the repository fixtures. It is not a browser DOM implementation.

Repository validation includes the Solid 1 compatibility lab, Kobalte, Tailwind v4, the blurred-window example, and the DAW. See [`../../docs/getting-started-solid1.md`](../../docs/getting-started-solid1.md) and [`../../examples/README.md`](../../examples/README.md).

Framework-neutral host files are mirrored from `packages/solid/src/host`. CI runs `scripts/check-host-parity.ts` so the Solid 1 and Solid 2 retained-tree host implementations do not drift silently.
