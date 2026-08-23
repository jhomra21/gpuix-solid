import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

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
    outDir: "dist/counter",
    rollupOptions: {
      external: ["@gpuix/native", "@jhomra21/gpuix-solid", "solid-js"],
    },
  },
})
