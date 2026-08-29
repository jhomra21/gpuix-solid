import path from "node:path"
import { fileURLToPath } from "node:url"
import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

const root = path.dirname(fileURLToPath(import.meta.url))
const solid1Package = /^@jhomra21\/gpuix-solid1(?:\/.*)?$/
const kobalteCore = /^@kobalte\/core\/(.+)$/
const kobalteSourceRoot = path.resolve(root, "node_modules/@kobalte/core/src")
const solidWebCompat = path.resolve(root, "../../packages/solid1/dist/web.js")
const kobalteLayerStackProbe = path.resolve(kobalteSourceRoot, "dismissable-layer/layer-stack.tsx")

function scopedClass(name: string, filename: string): string {
  const moduleName = path.basename(filename).replace(/\.module\.css$/, "").replace(/[^A-Za-z0-9_-]/g, "_")
  return `kb_${moduleName}_${name}`
}

export default defineConfig({
  plugins: [solid({ solid: { generate: "universal", moduleName: "@jhomra21/gpuix-solid1" } })],
  css: { modules: { generateScopedName: scopedClass } },
  resolve: {
    conditions: ["solid", "browser", "development"],
    dedupe: ["solid-js"],
    alias: [
      { find: "solid-js/web", replacement: solidWebCompat },
      { find: "kobalte-layer-stack-probe", replacement: kobalteLayerStackProbe },
      { find: kobalteCore, replacement: `${kobalteSourceRoot}/$1/index.tsx` },
    ],
  },
  ssr: {
    noExternal: [solid1Package, /^@kobalte\/core(?:\/.*)?$/, "@kobalte/utils", "solid-js", "kobalte-layer-stack-probe"],
    resolve: { conditions: ["solid", "browser", "development", "import", "default"] },
  },
  build: {
    target: "node22",
    ssr: "src/dialog-only-test.tsx",
    outDir: "dist/test",
    rollupOptions: {
      external: ["@gpuix/native"],
      output: { entryFileNames: "test.js" },
    },
  },
})
