import { fileURLToPath } from "node:url"
import type { Alias } from "vite"

const kobalteRoot = new URL("../../packages/solid1/src/kobalte/", import.meta.url)
const upstreamRoot = new URL("./src/upstream/", import.meta.url)
const compatRoot = new URL("./src/compat/", import.meta.url)
const solidRoot = fileURLToPath(new URL("./node_modules/solid-js", import.meta.url))

function adapter(file: string): string {
  return fileURLToPath(new URL(file, kobalteRoot))
}

function compat(file: string): string {
  return fileURLToPath(new URL(file, compatRoot))
}

export const kobalteNativeAliases: Alias[] = [
  // The Solid 1 package is built in its own isolated install, so its dist files can
  // otherwise resolve that nested development copy while the DAW source resolves
  // the consumer copy. Pin every reactive Solid entrypoint to this consumer's
  // browser/development build so owner/context state and reactivity stay shared.
  { find: /^solid-js$/, replacement: `${solidRoot}/dist/dev.js` },
  { find: /^solid-js\/universal$/, replacement: `${solidRoot}/universal/dist/dev.js` },
  { find: /^solid-js\/store$/, replacement: `${solidRoot}/store/dist/dev.js` },
  { find: /^solid-js\/web$/, replacement: `${solidRoot}/web/dist/dev.js` },
  { find: /^@kobalte\/core$/, replacement: adapter("index.tsx") },
  { find: /^@kobalte\/core\/polymorphic$/, replacement: adapter("polymorphic.ts") },
  { find: /^@kobalte\/core\/button$/, replacement: adapter("button.tsx") },
  { find: /^@kobalte\/core\/image$/, replacement: adapter("image.tsx") },
  { find: /^@kobalte\/core\/separator$/, replacement: adapter("separator.tsx") },
  { find: /^@kobalte\/core\/text-field$/, replacement: adapter("text-field.tsx") },
  { find: /^@kobalte\/core\/tooltip$/, replacement: adapter("tooltip.tsx") },
  { find: /^@kobalte\/core\/dialog$/, replacement: adapter("dialog.tsx") },
  { find: /^@kobalte\/core\/dropdown-menu$/, replacement: adapter("dropdown-menu.tsx") },
  { find: /^@kobalte\/core\/context-menu$/, replacement: adapter("context-menu.tsx") },
  { find: /^@kobalte\/core\/menubar$/, replacement: adapter("menubar.tsx") },
  { find: /^@daw-browser\/shared$/, replacement: compat("daw-browser-shared.ts") },
  { find: /^~\/lib\/timeline-storage$/, replacement: compat("timeline-storage.ts") },
  { find: /^~\/lib\/timeline-utils$/, replacement: compat("timeline-utils.ts") },
  { find: /^~\//, replacement: `${fileURLToPath(upstreamRoot)}/` },
]
