import { createRequire } from "node:module"
import solid from "@solidjs/vite-plugin"
import { defineConfig } from "vite"

const require = createRequire(import.meta.url)
const decodeNamedCharacterReference = require.resolve("decode-named-character-reference")

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
    alias: [
      {
        find: /^decode-named-character-reference$/,
        replacement: decodeNamedCharacterReference,
      },
    ],
    conditions: ["browser", "development"],
  },
  ssr: {
    noExternal: ["gpuix-solid", "@solidjs/universal", "solid-js", "safe-mdx"],
    resolve: {
      conditions: ["browser", "development", "import", "default"],
    },
  },
  build: {
    target: "node22",
    ssr: "src/chat/index.tsx",
    outDir: "dist/chat",
    rollupOptions: {
      external: ["@gpuix/native"],
    },
  },
})
