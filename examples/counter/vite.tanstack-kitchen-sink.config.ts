import { gpuixSolid } from "gpuix-solid/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [gpuixSolid()],
  build: {
    target: "node22",
    ssr: "src/tanstack-kitchen-sink/index.tsx",
    outDir: "dist/tanstack-kitchen-sink",
  },
})
