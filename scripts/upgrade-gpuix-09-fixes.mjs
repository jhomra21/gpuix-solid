import { readFileSync, writeFileSync } from "node:fs"

function replaceOnce(path, source, from, to) {
  if (!source.includes(from)) throw new Error(`${path}: expected source fragment not found`)
  return source.replace(from, to)
}

for (const path of ["packages/solid/src/runtime.ts", "packages/solid1/src/runtime.ts"]) {
  const source = readFileSync(path, "utf8")
  const from = 'import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"'
  const to = 'import type { DebugFrameOverlayMode, NativeRenderer } from "./host/types.js"'
  if (!source.includes(from)) throw new Error(`${path}: expected runtime host-type import not found`)
  writeFileSync(path, source.replace(from, to))
}

for (const path of ["packages/solid/src/root.ts", "packages/solid1/src/root.ts"]) {
  let source = readFileSync(path, "utf8")
  source = replaceOnce(
    path,
    source,
    "  const [selectedText, setSelectedText] = createSignal(renderer.getSelectedText?.() ?? null)",
    "  const [selectedText, setSelectedText] = createSignal<string | null>(null)",
  )
  source = replaceOnce(
    path,
    source,
    "  const retainWindowSelectionChange = (): (() => void) => {\n    selectionObserverCount += 1\n    syncWindowSelectionChange()",
    "  const retainWindowSelectionChange = (): (() => void) => {\n    const wasIdle = selectionObserverCount === 0\n    selectionObserverCount += 1\n    if (wasIdle) setSelectedText(renderer.getSelectedText?.() ?? null)\n    syncWindowSelectionChange()",
  )
  writeFileSync(path, source)
}
