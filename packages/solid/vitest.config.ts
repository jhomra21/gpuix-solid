import { defineConfig } from "vitest/config"

export default defineConfig({
  ssr: {
    resolve: {
      // GPUIX is a client renderer even though tests execute in Node. Solid's
      // `node` export is the SSR runtime and intentionally does not provide
      // the live client reactivity this renderer owns.
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
