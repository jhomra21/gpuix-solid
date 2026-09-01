import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"
import { diffusionSourceAliases } from "./vite.diffusion-source"

export default defineConfig({
  plugins: [
    solid({
      solid: {
        generate: "universal",
        moduleName: "gpuix-solid",
      },
    }),
  ],
  resolve: {
    alias: diffusionSourceAliases,
    conditions: ["browser", "development"],
  },
  ssr: {
    noExternal: ["gpuix-solid", "@solidjs/universal", "solid-js"],
    resolve: {
      conditions: ["browser", "development", "import", "default"],
    },
  },
  build: {
    target: "node22",
    ssr: "src/diffusion/test.tsx",
    outDir: "dist/diffusion-test",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
