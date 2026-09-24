import solid from "vite-plugin-solid"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const diffusionCommit = "666cdced1f6b97a792b63e551f45797649efb27a"
const fromHere = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))
const sourceRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/`)
const solid1Entry = fromHere("../../packages/solid1/dist/index.js")
const solidWebCompat = fromHere("../../packages/solid1/dist/web-entry.js")
const runtimeBridge = fromHere("./src/runtime-bridge.ts")
const webSource = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/apps/web/src/`)
const kobalteSourceRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/node_modules/@kobalte/core/src/`)

const packageSource = (name: string) =>
  fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/packages/${name}/src/index.ts`)

export function diffusionConfig(entry: string, outDir: string) {
  return defineConfig({
    define: {
      "import.meta.env.VITE_DESKTOP": JSON.stringify("false"),
    },
    plugins: [
      solid({
        solid: {
          generate: "universal",
          moduleName: "@jhomra21/gpuix-solid1",
        },
      }),
    ],
    resolve: {
      alias: [
        { find: "@jhomra21/gpuix-solid1", replacement: solid1Entry },
        { find: /^solid-js\/web$/, replacement: solidWebCompat },
        { find: /^@kobalte\/core$/, replacement: `${kobalteSourceRoot}index.ts` },
        { find: /^@kobalte\/core\/(.+)$/, replacement: `${kobalteSourceRoot}$1/index.tsx` },
        { find: /^@\//, replacement: webSource },
        { find: "@diffusionstudio/assets", replacement: packageSource("assets") },
        { find: "@diffusionstudio/jsx", replacement: packageSource("jsx") },
        { find: "@diffusionstudio/koota-solid", replacement: packageSource("koota-solid") },
        { find: "@diffusionstudio/reconciler", replacement: packageSource("reconciler") },
        { find: "@diffusionstudio/runtime-source", replacement: packageSource("runtime") },
        { find: /^@diffusionstudio\/runtime$/, replacement: runtimeBridge },
      ],
      conditions: ["solid", "browser", "development"],
      dedupe: ["solid-js", "koota"],
    },
    ssr: {
      noExternal: [
        "@jhomra21/gpuix-solid1",
        /^@kobalte\/core(?:\/.*)?$/,
        "@kobalte/utils",
        /^@floating-ui\//,
        "solid-js",
      ],
      resolve: {
        conditions: ["solid", "browser", "development", "import", "default"],
      },
    },
    build: {
      target: "node22",
      ssr: entry,
      outDir,
      rollupOptions: {
        external: ["@gpuix/native"],
      },
    },
  })
}

export { diffusionCommit, sourceRoot }
