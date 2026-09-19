import { gpuixSolid } from "gpuix-solid/vite"
import { defineConfig } from "vite"
import { diffusionSourceAliases } from "./vite.diffusion-source"

export default defineConfig({
  plugins: [gpuixSolid()],
  resolve: {
    alias: diffusionSourceAliases,
  },
  build: {
    target: "node22",
    ssr: "src/diffusion/canvas-interaction-test.tsx",
    outDir: "dist/diffusion-canvas-test",
  },
})
