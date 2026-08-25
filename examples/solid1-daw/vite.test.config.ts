import solid from "vite-plugin-solid"
import { defineConfig } from "vite"
import { kobalteNativeAliases } from "./kobalte-native-aliases"

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
    alias: kobalteNativeAliases,
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
    ssr: "src/test.tsx",
    outDir: "dist/test",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
