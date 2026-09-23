import solid from "vite-plugin-solid"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const diffusionCommit = "666cdced1f6b97a792b63e551f45797649efb27a"
const fromHere = (relativePath: string) => fileURLToPath(new URL(relativePath, import.meta.url))
const sourceRoot = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/`)
const solid1Entry = fromHere("../../packages/solid1/dist/index.js")\nconst runtimeBridge = fromHere("./src/runtime-bridge.ts")
const webSource = fromHere(`../../.cache/diffusion-editor/${diffusionCommit.slice(0, 12)}/apps/web/src/`)

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
        { find: /^@\//, replacement: webSource },
        { find: "@diffusionstudio/assets", replacement: packageSource("assets") },
        { find: "@diffusionstudio/jsx", replacement: packageSource("jsx") },
        { find: "@diffusionstudio/koota-solid", replacement: packageSource("koota-solid") },
        { find: "@diffusionstudio/reconciler", replacement: packageSource("reconciler") },
        { find: "@diffusionstudio/runtime-source", replacement: packageSource("runtime") },\n        { find: /^@diffusionstudio\\/runtime$/, replacement: runtimeBridge },
      ],
      conditions: ["browser", "development"],
      dedupe: ["solid-js", "koota"],
    },
    ssr: {
      noExternal: ["@jhomra21/gpuix-solid1", "solid-js"],
      resolve: {
        conditions: ["browser", "development", "import", "default"],
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
