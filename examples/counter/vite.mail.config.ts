import { gpuixSolid } from "gpuix-solid/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [gpuixSolid()],
  build: {
    target: "node22",
    ssr: "src/mail/index.tsx",
    outDir: "dist/mail",
  },
})
