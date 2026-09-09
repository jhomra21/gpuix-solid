import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"
import { diffusionSourceAliases } from "./vite.diffusion-source"

export default defineConfig({
  plugins: [
    {
      name: "diffusion-test-click-checkpoints",
      enforce: "pre",
      transform(code, id) {
        if (!id.endsWith("/src/diffusion/test.tsx")) return null

        const instrumented = code
          .split("\n")
          .flatMap((line, index) => line.includes("await app.") && line.includes(".click(")
            ? [`    console.log(${JSON.stringify(`diffusion checkpoint click line ${index + 1}: ${line.trim()}`)})`, line]
            : [line])
          .join("\n")

        return { code: instrumented, map: null }
      },
    },
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
