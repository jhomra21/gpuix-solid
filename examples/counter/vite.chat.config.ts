import { createRequire } from "node:module"
import { gpuixSolid } from "gpuix-solid/vite"
import { defineConfig } from "vite"

const require = createRequire(import.meta.url)
const safeMdxRequire = createRequire(require.resolve("safe-mdx/parse"))
const decodeNamedCharacterReference = safeMdxRequire.resolve("decode-named-character-reference")

export default defineConfig({
  plugins: [gpuixSolid()],
  resolve: {
    alias: [
      {
        find: /^decode-named-character-reference$/,
        replacement: decodeNamedCharacterReference,
      },
    ],
  },
  ssr: {
    noExternal: ["safe-mdx"],
  },
  build: {
    target: "node22",
    ssr: "src/chat/index.tsx",
    outDir: "dist/chat",
  },
})
