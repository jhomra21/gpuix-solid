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
  resolve: {
    conditions: ["browser", "development"],
  },
  ssr: {
    noExternal: ["@jhomra21/gpuix-solid", "@solidjs/universal", "solid-js"],
    resolve: {
      conditions: ["browser", "development", "import", "default"],
    },
  },
  build: {
    target: "node22",
    ssr: "src/dashboard/test.tsx",
    outDir: "dist/dashboard-test",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
