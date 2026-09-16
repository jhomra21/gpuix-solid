import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), "utf8")
}

function write(path, content) {
  writeFileSync(join(root, path), content)
}

function replaceOnce(path, from, to) {
  const source = read(path)
  const first = source.indexOf(from)
  if (first === -1) throw new Error(`${path}: expected source fragment not found:\n${from}`)
  if (source.indexOf(from, first + from.length) !== -1) {
    throw new Error(`${path}: source fragment was not unique:\n${from}`)
  }
  write(path, source.slice(0, first) + to + source.slice(first + from.length))
}

function replaceAllChecked(path, from, to, minimum = 1) {
  const source = read(path)
  const count = source.split(from).length - 1
  if (count < minimum) throw new Error(`${path}: expected at least ${minimum} occurrences of ${from}, found ${count}`)
  write(path, source.split(from).join(to))
  return count
}

function walk(dir, visitor) {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", ".cache", "dist"].includes(name)) continue
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, visitor)
    else visitor(path)
  }
}

// GPUIX 0.9 is pre-1.0 and upstream now explicitly recommends pairing the
// renderer with the exact native release. Pin every direct native dependency
// in this repository rather than leaving a caret that can silently cross a
// GPUIX minor boundary.
let manifestPins = 0
walk(root, (absolutePath) => {
  if (!absolutePath.endsWith("package.json")) return
  const source = readFileSync(absolutePath, "utf8")
  if (!source.includes('"@gpuix/native": "^0.8.0"')) return
  writeFileSync(absolutePath, source.replaceAll('"@gpuix/native": "^0.8.0"', '"@gpuix/native": "0.9.0"'))
  manifestPins += 1
})
if (manifestPins < 3) throw new Error(`Expected multiple native package pins; updated ${manifestPins}`)

const edge = JSON.parse(read(".gpuix/edge.json"))
if (edge.sha !== "8d3ec094387152558d05a5b37de3cfbfca5d2d0a") {
  throw new Error(`Unexpected previous GPUIX edge SHA: ${edge.sha}`)
}
edge.sha = "7ac9880abd8e91e5bf0e4feb0fa850729cf95a68"
write(".gpuix/edge.json", JSON.stringify(edge, null, 2) + "\n")

replaceAllChecked(
  "scripts/mail-parity/reference.mjs",
  "8d3ec094387152558d05a5b37de3cfbfca5d2d0a",
  "7ac9880abd8e91e5bf0e4feb0fa850729cf95a68",
)
replaceAllChecked("scripts/mail-parity/reference.mjs", "react-mail-0.8.0", "react-mail-0.9.0", 2)
replaceAllChecked("scripts/mail-parity/reference.mjs", "remorses--gpuix-8d3ec0943871", "remorses--gpuix-7ac9880abd8e")
replaceAllChecked("scripts/mail-parity/reference.mjs", 'packageVersion !== "0.8.0"', 'packageVersion !== "0.9.0"')
replaceAllChecked("scripts/mail-parity/reference.mjs", 'Expected React package version 0.8.0', 'Expected React package version 0.9.0')

for (const path of ["packages/solid/src/host/types.ts", "packages/solid1/src/host/types.ts"]) {
  replaceOnce(
    path,
    "  setWindowKeyEvents?(keyDown: boolean, keyUp: boolean, eventId: number): void\n  scrollTo?",
    "  setWindowKeyEvents?(keyDown: boolean, keyUp: boolean, eventId: number): void\n  setWindowSelectionChange?(enabled: boolean, eventId: number): void\n  scrollTo?",
  )
}

replaceOnce(
  "packages/solid/src/context.ts",
  'import { createContext, useContext } from "solid-js"',
  'import { createContext, useContext, type Accessor } from "solid-js"',
)
replaceOnce(
  "packages/solid/src/context.ts",
  "export interface GpuixContextValue {\n  renderer: NativeRenderer\n  flushSync<T>(fn: () => T): T\n}",
  "export interface GpuixSelectionContext {\n  text: Accessor<string | null>\n  retain(): () => void\n  clear(): void\n}\n\nexport interface GpuixContextValue {\n  renderer: NativeRenderer\n  flushSync<T>(fn: () => T): T\n  selection: GpuixSelectionContext\n}",
)

replaceOnce(
  "packages/solid1/src/context.ts",
  'import { createContext, useContext } from "solid-js"',
  'import { createContext, useContext, type Accessor } from "solid-js"',
)
replaceOnce(
  "packages/solid1/src/context.ts",
  "export interface GpuixContextValue {\n  renderer: NativeRenderer\n  getViewportSize: () => ViewportSize\n}",
  "export interface GpuixSelectionContext {\n  text: Accessor<string | null>\n  retain(): () => void\n  clear(): void\n}\n\nexport interface GpuixContextValue {\n  renderer: NativeRenderer\n  getViewportSize: () => ViewportSize\n  selection: GpuixSelectionContext\n}",
)

function upgradeSolid2Root() {
  const path = "packages/solid/src/root.ts"
  replaceOnce(path,
    'import { flush as flushSolid, type Element as SolidElement } from "solid-js"',
    'import { createSignal, flush as flushSolid, type Element as SolidElement } from "solid-js"',
  )
  replaceOnce(path,
    "const windowKeyEventIds = new WeakMap<NativeRenderer, number>()",
    "const windowKeyEventIds = new WeakMap<NativeRenderer, number>()\nconst windowSelectionEventIds = new WeakMap<NativeRenderer, number>()",
  )
  replaceOnce(path,
    "function nextWindowKeyEventId(renderer: NativeRenderer): number {\n  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1\n  windowKeyEventIds.set(renderer, id)\n  return id\n}",
    "function nextWindowKeyEventId(renderer: NativeRenderer): number {\n  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1\n  windowKeyEventIds.set(renderer, id)\n  return id\n}\n\nfunction nextWindowSelectionEventId(renderer: NativeRenderer): number {\n  const id = (windowSelectionEventIds.get(renderer) ?? 0) + 1\n  windowSelectionEventIds.set(renderer, id)\n  return id\n}",
  )
  replaceOnce(path,
    "export interface Root {\n  render(code: () => SolidElement): void\n  flush(): void\n  flushSync<T>(fn: () => T): T\n  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void\n  dispatch(event: EventPayload): boolean\n  unmount(): void\n}\n\nexport function createRoot(renderer: NativeRenderer, initialWindowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {",
    "export type WindowSelectionChangeHandler = (event: EventPayload, renderer: NativeRenderer) => void\n\nexport type WindowEventHandlers = WindowKeyEventHandlers & {\n  /** Window-level text selection listener added by GPUIX 0.9. */\n  onSelectionChange?: WindowSelectionChangeHandler\n}\n\nexport interface Root {\n  render(code: () => SolidElement): void\n  flush(): void\n  flushSync<T>(fn: () => T): T\n  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void\n  setWindowSelectionChangeHandler(handler?: WindowSelectionChangeHandler): void\n  dispatch(event: EventPayload): boolean\n  unmount(): void\n}\n\nexport function createRoot(renderer: NativeRenderer, initialWindowEventHandlers: WindowEventHandlers = {}): Root {",
  )
  replaceOnce(path,
    "  let windowKeyEventHandlers = initialWindowKeyEventHandlers\n  let windowKeyEventId = nextWindowKeyEventId(renderer)\n  let dispose: (() => void) | undefined",
    "  let windowKeyEventHandlers: WindowKeyEventHandlers = initialWindowEventHandlers\n  let windowSelectionChangeHandler = initialWindowEventHandlers.onSelectionChange\n  let windowKeyEventId = nextWindowKeyEventId(renderer)\n  let windowSelectionEventId = nextWindowSelectionEventId(renderer)\n  let selectionObserverCount = 0\n  const [selectedText, setSelectedText] = createSignal(renderer.getSelectedText?.() ?? null)\n  let dispose: (() => void) | undefined",
  )
  replaceOnce(path,
    "  }\n  syncWindowKeyEvents()\n\n  const flushNative = (): void => driver.flush()",
    "  }\n  const syncWindowSelectionChange = (): void => {\n    renderer.setWindowSelectionChange?.(\n      Boolean(windowSelectionChangeHandler) || selectionObserverCount > 0,\n      windowSelectionEventId,\n    )\n  }\n  const retainWindowSelectionChange = (): (() => void) => {\n    selectionObserverCount += 1\n    syncWindowSelectionChange()\n    let active = true\n    return () => {\n      if (!active) return\n      active = false\n      selectionObserverCount = Math.max(0, selectionObserverCount - 1)\n      syncWindowSelectionChange()\n    }\n  }\n  syncWindowKeyEvents()\n  syncWindowSelectionChange()\n\n  const flushNative = (): void => driver.flush()",
  )
  replaceOnce(path,
    "  const contextValue: GpuixContextValue = { renderer, flushSync }",
    "  const contextValue: GpuixContextValue = {\n    renderer,\n    flushSync,\n    selection: {\n      text: selectedText,\n      retain: retainWindowSelectionChange,\n      clear: () => renderer.clearSelection?.(),\n    },\n  }",
  )
  replaceOnce(path,
    "        windowKeyEventId = nextWindowKeyEventId(renderer)\n        syncWindowKeyEvents()",
    "        windowKeyEventId = nextWindowKeyEventId(renderer)\n        windowSelectionEventId = nextWindowSelectionEventId(renderer)\n        syncWindowKeyEvents()\n        syncWindowSelectionChange()",
  )
  replaceOnce(path,
    "    setWindowKeyEventHandlers(handlers) {\n      windowKeyEventHandlers = handlers\n      syncWindowKeyEvents()\n    },\n    dispatch(event) {",
    "    setWindowKeyEventHandlers(handlers) {\n      windowKeyEventHandlers = handlers\n      syncWindowKeyEvents()\n    },\n    setWindowSelectionChangeHandler(handler) {\n      windowSelectionChangeHandler = handler\n      syncWindowSelectionChange()\n    },\n    dispatch(event) {",
  )
  replaceOnce(path,
    "        flushSolid(() => {\n          if (event.eventType === \"windowKeyDown\" || event.eventType === \"windowKeyUp\") {",
    "        flushSolid(() => {\n          if (event.eventType === \"selectionChange\") {\n            if (event.elementId !== windowSelectionEventId) return\n            if (!windowSelectionChangeHandler && selectionObserverCount === 0) return\n            setSelectedText(event.value ?? null)\n            windowSelectionChangeHandler?.(\n              event.elementId === 0 ? event : { ...event, elementId: 0 },\n              renderer,\n            )\n            handled = true\n            return\n          }\n          if (event.eventType === \"windowKeyDown\" || event.eventType === \"windowKeyUp\") {",
  )
  replaceOnce(path,
    "      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {\n        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)\n      }\n      driver.dispose()",
    "      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {\n        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)\n      }\n      if (windowSelectionEventIds.get(renderer) === windowSelectionEventId) {\n        renderer.setWindowSelectionChange?.(false, windowSelectionEventId)\n      }\n      driver.dispose()",
  )
}

function upgradeSolid1Root() {
  const path = "packages/solid1/src/root.ts"
  replaceOnce(path,
    'import type { JSX } from "solid-js"',
    'import { createSignal, type JSX } from "solid-js"',
  )
  replaceOnce(path,
    "const windowKeyEventIds = new WeakMap<NativeRenderer, number>()",
    "const windowKeyEventIds = new WeakMap<NativeRenderer, number>()\nconst windowSelectionEventIds = new WeakMap<NativeRenderer, number>()",
  )
  replaceOnce(path,
    "function nextWindowKeyEventId(renderer: NativeRenderer): number {\n  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1\n  windowKeyEventIds.set(renderer, id)\n  return id\n}",
    "function nextWindowKeyEventId(renderer: NativeRenderer): number {\n  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1\n  windowKeyEventIds.set(renderer, id)\n  return id\n}\n\nfunction nextWindowSelectionEventId(renderer: NativeRenderer): number {\n  const id = (windowSelectionEventIds.get(renderer) ?? 0) + 1\n  windowSelectionEventIds.set(renderer, id)\n  return id\n}",
  )
  replaceOnce(path,
    "export interface Root {\n  render(code: () => Solid1RenderValue): void\n  flush(): void\n  flushSync<Value>(fn: () => Value): Value\n  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void\n  dispatch(event: EventPayload): boolean\n  unmount(): void\n}",
    "export type WindowSelectionChangeHandler = (event: EventPayload, renderer: NativeRenderer) => void\n\nexport type WindowEventHandlers = WindowKeyEventHandlers & {\n  /** Window-level text selection listener added by GPUIX 0.9. */\n  onSelectionChange?: WindowSelectionChangeHandler\n}\n\nexport interface Root {\n  render(code: () => Solid1RenderValue): void\n  flush(): void\n  flushSync<Value>(fn: () => Value): Value\n  setWindowKeyEventHandlers(handlers: WindowKeyEventHandlers): void\n  setWindowSelectionChangeHandler(handler?: WindowSelectionChangeHandler): void\n  dispatch(event: EventPayload): boolean\n  unmount(): void\n}",
  )
  replaceOnce(path,
    "export function createRoot(renderer: NativeRenderer, initialWindowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {",
    "export function createRoot(renderer: NativeRenderer, initialWindowEventHandlers: WindowEventHandlers = {}): Root {",
  )
  replaceOnce(path,
    "  let windowKeyEventHandlers = initialWindowKeyEventHandlers\n  let windowKeyEventId = nextWindowKeyEventId(renderer)\n  let dispose: (() => void) | undefined",
    "  let windowKeyEventHandlers: WindowKeyEventHandlers = initialWindowEventHandlers\n  let windowSelectionChangeHandler = initialWindowEventHandlers.onSelectionChange\n  let windowKeyEventId = nextWindowKeyEventId(renderer)\n  let windowSelectionEventId = nextWindowSelectionEventId(renderer)\n  let selectionObserverCount = 0\n  const [selectedText, setSelectedText] = createSignal(renderer.getSelectedText?.() ?? null)\n  let dispose: (() => void) | undefined",
  )
  replaceOnce(path,
    "  }\n  syncWindowKeyEvents()\n  installBrowserPreflushCompatibility(container, driver)",
    "  }\n  const syncWindowSelectionChange = (): void => {\n    renderer.setWindowSelectionChange?.(\n      Boolean(windowSelectionChangeHandler) || selectionObserverCount > 0,\n      windowSelectionEventId,\n    )\n  }\n  const retainWindowSelectionChange = (): (() => void) => {\n    selectionObserverCount += 1\n    syncWindowSelectionChange()\n    let active = true\n    return () => {\n      if (!active) return\n      active = false\n      selectionObserverCount = Math.max(0, selectionObserverCount - 1)\n      syncWindowSelectionChange()\n    }\n  }\n  syncWindowKeyEvents()\n  syncWindowSelectionChange()\n  installBrowserPreflushCompatibility(container, driver)",
  )
  replaceOnce(path,
    "        windowKeyEventId = nextWindowKeyEventId(renderer)\n        syncWindowKeyEvents()",
    "        windowKeyEventId = nextWindowKeyEventId(renderer)\n        windowSelectionEventId = nextWindowSelectionEventId(renderer)\n        syncWindowKeyEvents()\n        syncWindowSelectionChange()",
  )
  replaceOnce(path,
    "          value: { renderer, getViewportSize },",
    "          value: {\n            renderer,\n            getViewportSize,\n            selection: {\n              text: selectedText,\n              retain: retainWindowSelectionChange,\n              clear: () => renderer.clearSelection?.(),\n            },\n          },",
  )
  replaceOnce(path,
    "    setWindowKeyEventHandlers(handlers) {\n      windowKeyEventHandlers = handlers\n      syncWindowKeyEvents()\n    },\n    dispatch(event) {",
    "    setWindowKeyEventHandlers(handlers) {\n      windowKeyEventHandlers = handlers\n      syncWindowKeyEvents()\n    },\n    setWindowSelectionChangeHandler(handler) {\n      windowSelectionChangeHandler = handler\n      syncWindowSelectionChange()\n    },\n    dispatch(event) {",
  )
  replaceOnce(path,
    "      try {\n        if (event.eventType === \"windowKeyDown\" || event.eventType === \"windowKeyUp\") {",
    "      try {\n        if (event.eventType === \"selectionChange\") {\n          if (event.elementId !== windowSelectionEventId) return false\n          if (!windowSelectionChangeHandler && selectionObserverCount === 0) return false\n          setSelectedText(event.value ?? null)\n          windowSelectionChangeHandler?.(\n            event.elementId === 0 ? event : { ...event, elementId: 0 },\n            renderer,\n          )\n          return true\n        }\n        if (event.eventType === \"windowKeyDown\" || event.eventType === \"windowKeyUp\") {",
  )
  replaceOnce(path,
    "      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {\n        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)\n      }\n      driver.dispose()",
    "      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {\n        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)\n      }\n      if (windowSelectionEventIds.get(renderer) === windowSelectionEventId) {\n        renderer.setWindowSelectionChange?.(false, windowSelectionEventId)\n      }\n      driver.dispose()",
  )
}

upgradeSolid2Root()
upgradeSolid1Root()

function upgradeRuntime(path, solid1 = false) {
  replaceOnce(path,
    'import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"',
    'import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"',
  )
  replaceOnce(path,
    'import { createRoot, type Root } from "./root.js"',
    'import { createRoot, type Root, type WindowEventHandlers } from "./root.js"',
  )
  replaceOnce(path,
    "export interface RenderOptions extends WindowOptions, WindowKeyEventHandlers {",
    "export interface RenderOptions extends WindowOptions, WindowEventHandlers {",
  )
  replaceOnce(path,
    "function windowKeyEventHandlers(onKeyDown: RenderOptions[\"onKeyDown\"], onKeyUp: RenderOptions[\"onKeyUp\"]): WindowKeyEventHandlers {\n  const handlers: WindowKeyEventHandlers = {}\n  if (onKeyDown) handlers.onKeyDown = onKeyDown\n  if (onKeyUp) handlers.onKeyUp = onKeyUp\n  return handlers\n}",
    "function windowEventHandlers(\n  onKeyDown: RenderOptions[\"onKeyDown\"],\n  onKeyUp: RenderOptions[\"onKeyUp\"],\n  onSelectionChange: RenderOptions[\"onSelectionChange\"],\n): WindowEventHandlers {\n  const handlers: WindowEventHandlers = {}\n  if (onKeyDown) handlers.onKeyDown = onKeyDown\n  if (onKeyUp) handlers.onKeyUp = onKeyUp\n  if (onSelectionChange) handlers.onSelectionChange = onSelectionChange\n  return handlers\n}",
  )
  replaceOnce(path,
    "  const { onEvent, onKeyDown, onKeyUp, debugFrameOverlay } = options\n  if (slot.nativeRenderer) setRendererOnEvent(slot.nativeRenderer, onEvent)\n  slot.root.setWindowKeyEventHandlers(windowKeyEventHandlers(onKeyDown, onKeyUp))",
    "  const { onEvent, onKeyDown, onKeyUp, onSelectionChange, debugFrameOverlay } = options\n  if (slot.nativeRenderer) setRendererOnEvent(slot.nativeRenderer, onEvent)\n  slot.root.setWindowKeyEventHandlers(windowEventHandlers(onKeyDown, onKeyUp, onSelectionChange))\n  slot.root.setWindowSelectionChangeHandler(onSelectionChange)",
  )
  replaceOnce(path,
    "  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options",
    "  const { renderer: injected, onEvent, onKeyDown, onKeyUp, onSelectionChange, debugFrameOverlay, ...windowOptions } = options",
  )
  replaceAllChecked(path,
    "createRoot(injected, windowKeyEventHandlers(onKeyDown, onKeyUp))",
    "createRoot(injected, windowEventHandlers(onKeyDown, onKeyUp, onSelectionChange))",
  )
  replaceAllChecked(path,
    "createRoot(host, windowKeyEventHandlers(onKeyDown, onKeyUp))",
    "createRoot(host, windowEventHandlers(onKeyDown, onKeyUp, onSelectionChange))",
  )
}

upgradeRuntime("packages/solid/src/runtime.ts")
upgradeRuntime("packages/solid1/src/runtime.ts", true)

mkdirSync(join(root, "packages/solid/src/primitives"), { recursive: true })
write("packages/solid/src/primitives/create-text-selection.ts", `import { onCleanup, type Accessor } from "solid-js"\nimport { useGpuix } from "../context.js"\n\nexport interface TextSelection {\n  /** Current selected text joined in document order, or null when empty. */\n  readonly text: Accessor<string | null>\n  /** Clear the native window selection. */\n  clear(): void\n}\n\n/**\n * Solid reactive primitive for GPUIX's window-wide text selection.\n *\n * The native subscription is retained only while the calling Solid owner is\n * alive. Read selection.text() anywhere a normal Solid accessor is accepted.\n */\nexport function createTextSelection(): TextSelection {\n  const context = useGpuix()\n  if (!context) throw new Error("createTextSelection must be called inside a GPUix Solid root")\n\n  const release = context.selection.retain()\n  onCleanup(release)\n\n  return {\n    text: context.selection.text,\n    clear: context.selection.clear,\n  }\n}\n`)

mkdirSync(join(root, "packages/solid1/src/primitives"), { recursive: true })
write("packages/solid1/src/primitives/create-text-selection.ts", `import { onCleanup, type Accessor } from "solid-js"\nimport { useGpuix } from "../context.js"\n\nexport interface TextSelection {\n  /** Current selected text joined in document order, or null when empty. */\n  readonly text: Accessor<string | null>\n  /** Clear the native window selection. */\n  clear(): void\n}\n\n/** Solid reactive primitive for GPUIX's window-wide text selection. */\nexport function createTextSelection(): TextSelection {\n  const context = useGpuix()\n  if (!context) throw new Error("createTextSelection must be called inside a GPUix Solid 1 root")\n\n  const release = context.selection.retain()\n  onCleanup(release)\n\n  return {\n    text: context.selection.text,\n    clear: context.selection.clear,\n  }\n}\n`)

replaceOnce(
  "packages/solid/src/index.ts",
  'export { useWindowInsets, useWindowSize } from "./hooks/use-window-size.js"',
  'export { useWindowInsets, useWindowSize } from "./hooks/use-window-size.js"\nexport { createTextSelection } from "./primitives/create-text-selection.js"\nexport type { TextSelection } from "./primitives/create-text-selection.js"',
)
replaceOnce(
  "packages/solid/src/index.ts",
  'export type { Root } from "./root.js"',
  'export type { Root, WindowEventHandlers, WindowSelectionChangeHandler } from "./root.js"',
)
replaceOnce(
  "packages/solid1/src/index.ts",
  'export type { Root } from "./root.js"',
  'export type { Root, WindowEventHandlers, WindowSelectionChangeHandler } from "./root.js"\nexport { createTextSelection } from "./primitives/create-text-selection.js"\nexport type { TextSelection } from "./primitives/create-text-selection.js"',
)

function upgradeTesting(path, solid1 = false) {
  replaceOnce(path,
    'import { createRoot, type Root } from "./root.js"',
    'import { createRoot, type Root, type WindowEventHandlers } from "./root.js"',
  )
  replaceOnce(path,
    solid1
      ? "  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void { this.#native.setWindowKeyEvents(keyDown, keyUp, eventId) }"
      : "  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {\n    this.#native.setWindowKeyEvents(keyDown, keyUp, eventId)\n  }",
    solid1
      ? "  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void { this.#native.setWindowKeyEvents(keyDown, keyUp, eventId) }\n  setWindowSelectionChange(enabled: boolean, eventId: number): void { this.#native.setWindowSelectionChange(enabled, eventId) }"
      : "  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {\n    this.#native.setWindowKeyEvents(keyDown, keyUp, eventId)\n  }\n\n  setWindowSelectionChange(enabled: boolean, eventId: number): void {\n    this.#native.setWindowSelectionChange(enabled, eventId)\n  }",
  )
  replaceOnce(path,
    "export function createTestRoot(width?: number, height?: number, windowKeyEventHandlers: WindowKeyEventHandlers = {}): TestRoot {\n  const renderer = new TestRenderer(width, height)",
    "export function createTestRoot(width?: number, height?: number, windowEventHandlers: WindowEventHandlers = {}): TestRoot {\n  const renderer = new TestRenderer(width, height)",
  )
  replaceOnce(path,
    "  const root = createRoot(renderer, windowKeyEventHandlers)",
    "  const root = createRoot(renderer, windowEventHandlers)",
  )
  // The old imported type is no longer needed once createTestRoot accepts the
  // root-level combined handler surface.
  replaceAllChecked(path, "  WindowKeyEventHandlers,\n", "", 1)
}

upgradeTesting("packages/solid/src/testing.ts")
upgradeTesting("packages/solid1/src/testing.ts", true)

replaceOnce(
  "packages/solid/test/fake-renderer.ts",
  "  readonly windowKeyEvents: Array<[boolean, boolean, number]> = []",
  "  readonly windowKeyEvents: Array<[boolean, boolean, number]> = []\n  readonly windowSelectionChanges: Array<[boolean, number]> = []",
)
replaceOnce(
  "packages/solid/test/fake-renderer.ts",
  "  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {\n    this.windowKeyEvents.push([keyDown, keyUp, eventId])\n  }",
  "  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {\n    this.windowKeyEvents.push([keyDown, keyUp, eventId])\n  }\n  setWindowSelectionChange(enabled: boolean, eventId: number): void {\n    this.windowSelectionChanges.push([enabled, eventId])\n  }",
)

write("packages/solid/test/selection-change.test.ts", `import { describe, expect, it } from "vitest"\nimport { createTextSelection } from "../src/primitives/create-text-selection.js"\nimport { createElement } from "../src/host/universal.js"\nimport { createRoot } from "../src/root.js"\nimport { render, resetRender } from "../src/runtime.js"\nimport { FakeRenderer } from "./fake-renderer.js"\n\nfunction element() {\n  const node = createElement("div")\n  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")\n  return node\n}\n\ndescribe("window text selection", () => {\n  it("routes only the current native selection lease and disables it on unmount", () => {\n    const renderer = new FakeRenderer()\n    const values: Array<string | null> = []\n    const root = createRoot(renderer, {\n      onSelectionChange: (event) => values.push(event.value ?? null),\n    })\n\n    root.render(() => element())\n    const firstId = renderer.windowSelectionChanges.at(-1)?.[1]\n    if (firstId === undefined) throw new Error("Expected initial selection event id")\n    expect(renderer.windowSelectionChanges.at(-1)).toEqual([true, firstId])\n\n    root.render(() => element())\n    const secondId = renderer.windowSelectionChanges.at(-1)?.[1]\n    if (secondId === undefined) throw new Error("Expected remounted selection event id")\n    expect(secondId).toBeGreaterThan(firstId)\n\n    expect(root.dispatch({ elementId: firstId, eventType: "selectionChange", value: "stale" })).toBe(false)\n    expect(root.dispatch({ elementId: secondId, eventType: "selectionChange", value: "hello" })).toBe(true)\n    expect(root.dispatch({ elementId: secondId, eventType: "selectionChange" })).toBe(true)\n    expect(values).toEqual(["hello", null])\n\n    root.unmount()\n    expect(renderer.windowSelectionChanges.at(-1)).toEqual([false, secondId])\n  })\n\n  it("exposes selection as a Solid accessor instead of React-style component state", () => {\n    const renderer = new FakeRenderer()\n    let selectedText: (() => string | null) | undefined\n\n    const handle = render(() => {\n      const selection = createTextSelection()\n      selectedText = selection.text\n      return element()\n    }, { renderer })\n\n    const eventId = renderer.windowSelectionChanges.at(-1)?.[1]\n    if (eventId === undefined || !selectedText) throw new Error("Expected reactive selection subscription")\n    expect(renderer.windowSelectionChanges.at(-1)).toEqual([true, eventId])\n    expect(selectedText()).toBeNull()\n\n    expect(handle.root.dispatch({ elementId: eventId, eventType: "selectionChange", value: "solid" })).toBe(true)\n    expect(selectedText()).toBe("solid")\n\n    handle.unmount()\n    resetRender()\n  })\n})\n`)

write("packages/solid/test/native-selection-change.test.ts", `import { describe, expect, it } from "vitest"\nimport type { HostElementNode, HostNode } from "../src/host/nodes.js"\nimport type { StyleDesc } from "../src/host/types.js"\nimport { createElement, insert, insertNode, setProp } from "../src/host/universal.js"\nimport { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"\n\nconst nativeIt = hasNativeTestRenderer ? it : it.skip\n\nfunction element(type: string): HostElementNode {\n  const node = createElement(type)\n  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")\n  return node\n}\n\nfunction div(style: StyleDesc, children: HostNode[] = []): HostElementNode {\n  const node = element("div")\n  setProp(node, "style", style)\n  for (const child of children) insertNode(node, child)\n  return node\n}\n\nfunction text(value: string, style: StyleDesc = {}): HostElementNode {\n  const node = element("text")\n  if (Object.keys(style).length > 0) setProp(node, "style", style)\n  insert(node, value)\n  return node\n}\n\ndescribe("GPUIX 0.9 selection events", () => {\n  nativeIt("fires once per real selection change including clear", () => {\n    const values: Array<string | null> = []\n    const testRoot = createTestRoot(undefined, undefined, {\n      onSelectionChange: (event) => values.push(event.value ?? null),\n    })\n    testRoot.render(() => div(\n      { display: "flex", flexDirection: "column", padding: 20 },\n      [text("hello world", { fontSize: 20 })],\n    ))\n\n    expect(testRoot.renderer.dragSelect(21, 30, 900, 30)).toBe("hello world")\n    testRoot.renderer.dispatchNativeEvents()\n    expect(values).toEqual(["hello world"])\n\n    testRoot.renderer.flush()\n    testRoot.renderer.dispatchNativeEvents()\n    expect(values).toEqual(["hello world"])\n\n    testRoot.renderer.clearSelection()\n    testRoot.renderer.dispatchNativeEvents()\n    expect(values).toEqual(["hello world", null])\n  })\n\n  nativeIt("survives a native click while the root view is leased", () => {\n    const testRoot = createTestRoot()\n    testRoot.render(() => div(\n      { display: "flex", flexDirection: "column", padding: 20 },\n      [text("just a click", { fontSize: 20 })],\n    ))\n\n    testRoot.renderer.nativeSimulateClick(40, 30)\n    expect(testRoot.renderer.getSelectedText()).toBeNull()\n  })\n})\n`)

// Solid 1 gets an equivalent host-contract regression in its lightweight script suite.
write("packages/solid1/scripts/check-selection-change.ts", `import { createRoot } from "../src/root.ts"\nimport type { NativeRenderer } from "../src/host/types.ts"\nimport { createElement } from "../src/universal.ts"\n\nclass SelectionFakeRenderer implements NativeRenderer {\n  readonly subscriptions: Array<[boolean, number]> = []\n  createElement(): void {}\n  destroyElement(): number[] { return [] }\n  appendChild(): void {}\n  removeChild(): void {}\n  insertBefore(): void {}\n  setStyle(): void {}\n  setText(): void {}\n  setEventListener(): void {}\n  setRoot(): void {}\n  commitMutations(): void {}\n  setCustomProp(): void {}\n  setWindowSelectionChange(enabled: boolean, eventId: number): void {\n    this.subscriptions.push([enabled, eventId])\n  }\n}\n\nconst renderer = new SelectionFakeRenderer()\nconst values: Array<string | null> = []\nconst root = createRoot(renderer, { onSelectionChange: (event) => values.push(event.value ?? null) })\nconst first = createElement("div")\nif (first.kind !== "element") throw new Error("Expected Solid 1 host element")\nroot.render(() => first)\nconst firstId = renderer.subscriptions.at(-1)?.[1]\nif (firstId === undefined) throw new Error("Expected Solid 1 selection subscription")\n\nconst second = createElement("div")\nif (second.kind !== "element") throw new Error("Expected remounted Solid 1 host element")\nroot.render(() => second)\nconst secondId = renderer.subscriptions.at(-1)?.[1]\nif (secondId === undefined || secondId <= firstId) throw new Error("Solid 1 selection lease did not rotate")\nif (root.dispatch({ elementId: firstId, eventType: "selectionChange", value: "stale" })) {\n  throw new Error("Solid 1 accepted a stale selection event")\n}\nif (!root.dispatch({ elementId: secondId, eventType: "selectionChange", value: "solid1" })) {\n  throw new Error("Solid 1 rejected the current selection event")\n}\nif (values.join(",") !== "solid1") throw new Error(`Unexpected Solid 1 selection values: ${values.join(",")}`)\nroot.unmount()\nconst final = renderer.subscriptions.at(-1)\nif (!final || final[0] !== false || final[1] !== secondId) throw new Error("Solid 1 did not disable selection events on unmount")\n\nconsole.log("Solid 1 selection-change contract passed")\n`)

replaceOnce(
  "packages/solid1/package.json",
  'bun scripts/check-runtime-hot-remount.ts && bun scripts/check-animation-frame-pacing.ts',
  'bun scripts/check-runtime-hot-remount.ts && bun scripts/check-selection-change.ts && bun scripts/check-animation-frame-pacing.ts',
)

console.log(`GPUIX 0.9 migration staged; exact native pin updated in ${manifestPins} package manifests`)
