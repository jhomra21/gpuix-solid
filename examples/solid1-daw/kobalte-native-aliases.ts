import { fileURLToPath } from "node:url"
import type { Alias } from "vite"

const kobalteRoot = new URL("../../packages/solid1/src/kobalte/", import.meta.url)
const upstreamRoot = new URL("./src/upstream/", import.meta.url)
const compatRoot = new URL("./src/compat/", import.meta.url)

function adapter(file: string): string {
  return fileURLToPath(new URL(file, kobalteRoot))
}

export const kobalteNativeAliases: Alias[] = [
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
  { find: /^@daw-browser\/shared$/, replacement: fileURLToPath(new URL("daw-browser-shared.ts", compatRoot)) },
  { find: /^~\//, replacement: `${fileURLToPath(upstreamRoot)}/` },
]
