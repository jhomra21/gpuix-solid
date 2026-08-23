import { defineConfig } from "vite"
import solid from "@solidjs/vite-plugin"

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "@jhomra21/gpuix-solid",
      },
    }),
  ],
  build: {
    target: "node22",
    ssr: "src/index.tsx",
    outDir: "dist",
    rollupOptions: {
      external: ["@gpuix/native", "@jhomra21/gpuix-solid", "solid-js"],
    },
  },
})
