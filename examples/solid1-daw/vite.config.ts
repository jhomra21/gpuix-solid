import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "@jhomra21/gpuix-solid1",
      },
    }),
  ],
  resolve: {
    conditions: ["browser", "development"],
    dedupe: ["solid-js"],
  },
  ssr: {
    noExternal: ["@jhomra21/gpuix-solid1", "solid-js"],
    resolve: {
      conditions: ["browser", "development", "import", "default"],
    },
  },
  build: {
    target: "node22",
    ssr: "src/index.tsx",
    outDir: "dist/app",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
