import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const nativeEntry = fileURLToPath(new URL("./node_modules/@gpuix/native/index.js", import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@gpuix\/native$/,
        replacement: nativeEntry,
      },
    ],
  },
  ssr: {
    resolve: {
      // Solid needs its client runtime even though tests execute in Node.
      // @gpuix/native is aliased above to its native ESM entry so GPUIX 0.10's
      // new browser export does not turn native tests into WebAssembly tests.
      conditions: ["browser", "development", "import", "default"],
    },
  },
  test: {
    server: {
      deps: {
        // Keep Solid's conditional exports inside Vite's resolver rather than
        // letting Node externalization bypass the browser condition above.
        inline: ["solid-js", "@solidjs/universal"],
      },
    },
  },
})
