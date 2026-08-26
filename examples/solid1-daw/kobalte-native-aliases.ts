import { fileURLToPath } from "node:url"
import type { Alias } from "vite"

const kobalteRoot = new URL("../../packages/solid1/src/kobalte/", import.meta.url)
const upstreamRoot = new URL("./src/upstream/", import.meta.url)
const compatRoot = new URL("./src/compat/", import.meta.url)

function adapter(file: string): string {
  return fileURLToPath(new URL(file, kobalteRoot))
}

function compat(file: string): string {
  return fileURLToPath(new URL(file, compatRoot))
}

export const kobalteNativeAliases: Alias[] = [
  { find: /^solid-js\/web$/, replacement: compat("solid-web.ts") },
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
  { find: /^@daw-browser\/timeline-core\/types$/, replacement: compat("timeline-core-types.ts") },
  { find: /^@daw-browser\/timeline-core\/clip-fades$/, replacement: compat("clip-fades.ts") },
  { find: /^~\/context\/app-preferences$/, replacement: compat("app-preferences.ts") },
  { find: /^~\/hooks\/useTransportTempoController$/, replacement: compat("useTransportTempoController.ts") },
  { find: /^~\/lib\/clip-color$/, replacement: compat("clip-color.ts") },
  { find: /^~\/lib\/project-save-status$/, replacement: compat("project-save-status.ts") },
  { find: /^~\/lib\/timeline-left-browser-preferences$/, replacement: compat("timeline-left-browser-preferences.ts") },
  { find: /^~\/lib\/timeline-range-selection$/, replacement: compat("timeline-range-selection.ts") },
  { find: /^~\/lib\/timeline-storage$/, replacement: compat("timeline-storage.ts") },
  { find: /^~\/lib\/timeline-track-layout$/, replacement: compat("timeline-track-layout.ts") },
  { find: /^~\/lib\/timeline-utils$/, replacement: compat("timeline-utils.ts") },
  { find: /^~\//, replacement: `${fileURLToPath(upstreamRoot)}/` },
]
