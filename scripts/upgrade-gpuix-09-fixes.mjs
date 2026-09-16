import { readFileSync, writeFileSync } from "node:fs"

for (const path of ["packages/solid/src/runtime.ts", "packages/solid1/src/runtime.ts"]) {
  const source = readFileSync(path, "utf8")
  const from = 'import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"'
  const to = 'import type { DebugFrameOverlayMode, NativeRenderer } from "./host/types.js"'
  if (!source.includes(from)) throw new Error(`${path}: expected runtime host-type import not found`)
  writeFileSync(path, source.replace(from, to))
}
