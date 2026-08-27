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
      // A native GPUI app needs Solid's live client reactivity even though
      // the resulting JavaScript executes under Bun rather than in a browser.
      conditions: ["browser", "development", "import", "default"],
    },
  },
  build: {
    target: "node22",
    ssr: "src/index.tsx",
    outDir: "dist/counter",
    rollupOptions: {
      // Bundle the Solid client runtime and this binding so runtime package
      // resolution cannot select Solid's SSR export. Keep the actual native
      // addon external so Bun loads the platform package normally.
      external: ["@gpuix/native"],
    },
  },
})
