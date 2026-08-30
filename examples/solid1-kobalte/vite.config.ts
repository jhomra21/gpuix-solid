import path from "node:path"
import { fileURLToPath } from "node:url"
import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

const root = path.dirname(fileURLToPath(import.meta.url))
const solid1Package = /^@jhomra21\/gpuix-solid1(?:\/.*)?$/
const kobalteCore = /^@kobalte\/core\/(.+)$/
const kobalteSourceRoot = path.resolve(root, "node_modules/@kobalte/core/src")
const solidWebCompat = path.resolve(root, "../../packages/solid1/dist/web-entry.js")

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
    // Compile Kobalte's own published source through the same Solid universal
    // renderer as the fixture. The solid-js/web bridge comes from the built
    // package too, so styling and host state have one shared module instance.
    alias: [
      { find: "solid-js/web", replacement: solidWebCompat },
      { find: kobalteCore, replacement: `${kobalteSourceRoot}/$1/index.tsx` },
    ],
  },
  ssr: {
    noExternal: [solid1Package, /^@kobalte\/core(?:\/.*)?$/, "@kobalte/utils", "solid-js"],
    resolve: { conditions: ["solid", "browser", "development", "import", "default"] },
  },
  build: {
    target: "node22",
    ssr: "src/index.tsx",
    outDir: "dist/app",
    rollupOptions: { external: ["@gpuix/native"] },
  },
})
