import path from "node:path"
import { fileURLToPath } from "node:url"
import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

const root = path.dirname(fileURLToPath(import.meta.url))
const solid1Package = /^@jhomra21\/gpuix-solid1(?:\/.*)?$/
const kobalteCore = /^@kobalte\/core\/(.+)$/

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
    alias: [{ find: kobalteCore, replacement: path.resolve(root, "src/kobalte-adapter/$1.tsx") }],
  },
  ssr: {
    noExternal: [solid1Package, "solid-js"],
    resolve: { conditions: ["solid", "browser", "development", "import", "default"] },
  },
  build: {
    target: "node22",
    ssr: "src/index.tsx",
    outDir: "dist/app",
    rollupOptions: { external: ["@gpuix/native"] },
  },
})
