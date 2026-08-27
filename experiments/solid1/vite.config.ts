import solid from "vite-plugin-solid"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "gpuix-solid1-experiment",
      },
    }),
  ],
  resolve: {
    conditions: ["browser", "development"],
  },
  ssr: {
    noExternal: ["gpuix-solid1-experiment", "solid-js"],
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
