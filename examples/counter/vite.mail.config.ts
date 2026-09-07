import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

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
    ssr: "src/mail/index.tsx",
    outDir: "dist/mail",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
