from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"missing patch marker in {path}: {old[:140]!r}")
    file.write_text(text.replace(old, new, count))


def patch_host_types(path: str, *, add_title: bool) -> None:
    replace(
        path,
        '''export interface BoxShadow {\n  offsetX: number\n  offsetY: number\n  blurRadius: number\n  spreadRadius: number\n  color: string\n}\n\nexport interface StyleDesc {\n''',
        '''export interface BoxShadow {\n  offsetX: number\n  offsetY: number\n  blurRadius: number\n  spreadRadius: number\n  color: string\n}\n\nexport interface LinearGradientStop {\n  color: string\n  /** Position along the gradient from 0 to 1. */\n  position: number\n}\n\nexport interface LinearGradientBackground {\n  type: "linear-gradient"\n  /** CSS angle in degrees. 0 points up and values increase clockwise. */\n  angle: number\n  stops: [LinearGradientStop, LinearGradientStop]\n  colorSpace?: "srgb" | "oklab"\n}\n\nexport interface StyleDesc {\n''',
    )
    replace(path, '  background?: string\n', '  background?: string | LinearGradientBackground\n')
    replace(
        path,
        '''  focusElement?(elementId: number): void\n  blur?(): void\n''',
        '''  focusElement?(elementId: number): void\n  focusNext?(): void\n  focusPrevious?(): void\n  blur?(): void\n  setWindowKeyEvents?(keyDown: boolean, keyUp: boolean, eventId: number): void\n''',
    )
    replace(
        path,
        '''export interface PublicInstance {\n''',
        '''export type WindowKeyEventHandler = (event: EventPayload, renderer: NativeRenderer) => void\n\nexport interface WindowKeyEventHandlers {\n  /** Window-level GPUI listener. Key actions can consume an event before this runs. */\n  onKeyDown?: WindowKeyEventHandler\n  /** Window-level GPUI listener. */\n  onKeyUp?: WindowKeyEventHandler\n}\n\nexport interface PublicInstance {\n''',
    )
    if add_title:
        replace(
            path,
            '''  autoFocus?: boolean\n  tabIndex?: number\n  testId?: string\n''',
            '''  autoFocus?: boolean\n  tabIndex?: number\n  title?: string\n  testId?: string\n''',
        )


patch_host_types("packages/solid/src/host/types.ts", add_title=True)
patch_host_types("packages/solid1/src/host/types.ts", add_title=False)

# Solid 2 should preserve source title metadata just like the Solid 1 host now does.
replace(
    "packages/solid/src/host/nodes.ts",
    'const UNIVERSAL_PROPS = new Set(["autoFocus", "tabIndex", "motion", "testId", "highlight"])',
    'const UNIVERSAL_PROPS = new Set(["autoFocus", "tabIndex", "motion", "testId", "highlight", "title"])',
)


def patch_batch_adapter(path: str) -> None:
    replace(
        path,
        '''  focusElement?(elementId: number): void\n  blur?(): void\n''',
        '''  focusElement?(elementId: number): void\n  focusNext?(): void\n  focusPrevious?(): void\n  blur?(): void\n  setWindowKeyEvents?(keyDown: boolean, keyUp: boolean, eventId: number): void\n''',
    )
    replace(
        path,
        '''  if (renderer.focusElement) adapted.focusElement = renderer.focusElement.bind(renderer)\n  if (renderer.blur) adapted.blur = renderer.blur.bind(renderer)\n''',
        '''  if (renderer.focusElement) adapted.focusElement = renderer.focusElement.bind(renderer)\n  if (renderer.focusNext) adapted.focusNext = renderer.focusNext.bind(renderer)\n  if (renderer.focusPrevious) adapted.focusPrevious = renderer.focusPrevious.bind(renderer)\n  if (renderer.blur) adapted.blur = renderer.blur.bind(renderer)\n  if (renderer.setWindowKeyEvents) adapted.setWindowKeyEvents = renderer.setWindowKeyEvents.bind(renderer)\n''',
    )


patch_batch_adapter("packages/solid/src/batch-renderer-adapter.ts")
patch_batch_adapter("packages/solid1/src/batch-renderer-adapter.ts")

# Solid 2 root: per-root window key identity and callbacks, matching GPUIX React 0.7 semantics.
path = "packages/solid/src/root.ts"
replace(
    path,
    'import type { NativeRenderer } from "./host/types.js"\n',
    'import type { NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"\n',
)
replace(
    path,
    '''export interface Root {\n''',
    '''const windowKeyEventIds = new WeakMap<NativeRenderer, number>()\n\nfunction nextWindowKeyEventId(renderer: NativeRenderer): number {\n  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1\n  windowKeyEventIds.set(renderer, id)\n  return id\n}\n\nexport interface Root {\n''',
)
replace(
    path,
    'export function createRoot(renderer: NativeRenderer): Root {\n',
    'export function createRoot(renderer: NativeRenderer, windowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {\n',
)
replace(
    path,
    '''  const container = new HostRootNode(renderer, events, driver)\n  let dispose: (() => void) | undefined\n''',
    '''  const container = new HostRootNode(renderer, events, driver)\n  const windowKeyEventId = nextWindowKeyEventId(renderer)\n  renderer.setWindowKeyEvents?.(\n    Boolean(windowKeyEventHandlers.onKeyDown),\n    Boolean(windowKeyEventHandlers.onKeyUp),\n    windowKeyEventId,\n  )\n  let dispose: (() => void) | undefined\n''',
)
replace(
    path,
    '''    dispatch(event) {\n      try {\n        flushSolid(() => events.dispatch(event))\n      } finally {\n        flushNative()\n      }\n    },\n''',
    '''    dispatch(event) {\n      try {\n        flushSolid(() => {\n          if (event.eventType === "windowKeyDown" || event.eventType === "windowKeyUp") {\n            if (event.elementId !== windowKeyEventId) return\n            const handler = event.eventType === "windowKeyDown"\n              ? windowKeyEventHandlers.onKeyDown\n              : windowKeyEventHandlers.onKeyUp\n            handler?.(event, renderer)\n            return\n          }\n          events.dispatch(event)\n        })\n      } finally {\n        flushNative()\n      }\n    },\n''',
)
replace(
    path,
    '''      events.clear()\n      driver.dispose()\n''',
    '''      events.clear()\n      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {\n        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)\n      }\n      driver.dispose()\n''',
)

# Solid 1 root keeps browser element-event compatibility while routing root key events separately.
path = "packages/solid1/src/root.ts"
replace(
    path,
    'import type { DimensionValue, NativeRenderer } from "./host/types.js"\n',
    'import type { DimensionValue, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"\n',
)
replace(
    path,
    '''export interface Root {\n''',
    '''const windowKeyEventIds = new WeakMap<NativeRenderer, number>()\n\nfunction nextWindowKeyEventId(renderer: NativeRenderer): number {\n  const id = (windowKeyEventIds.get(renderer) ?? 0) + 1\n  windowKeyEventIds.set(renderer, id)\n  return id\n}\n\nexport interface Root {\n''',
)
replace(
    path,
    'export function createRoot(renderer: NativeRenderer): Root {\n',
    'export function createRoot(renderer: NativeRenderer, windowKeyEventHandlers: WindowKeyEventHandlers = {}): Root {\n',
)
replace(
    path,
    '''  const container = new HostRootNode(renderer, events, driver)\n  installBrowserPreflushCompatibility(container, driver)\n''',
    '''  const container = new HostRootNode(renderer, events, driver)\n  const windowKeyEventId = nextWindowKeyEventId(renderer)\n  renderer.setWindowKeyEvents?.(\n    Boolean(windowKeyEventHandlers.onKeyDown),\n    Boolean(windowKeyEventHandlers.onKeyUp),\n    windowKeyEventId,\n  )\n  installBrowserPreflushCompatibility(container, driver)\n''',
)
replace(
    path,
    '''    dispatch(event) {\n      try {\n        const browserEvent = browserCompatibleNativeEvent(event)\n        events.dispatch(browserEvent)\n        dispatchBrowserKeyboardEvent(browserEvent)\n      } finally {\n        flushNative()\n      }\n    },\n''',
    '''    dispatch(event) {\n      try {\n        if (event.eventType === "windowKeyDown" || event.eventType === "windowKeyUp") {\n          if (event.elementId !== windowKeyEventId) return\n          const handler = event.eventType === "windowKeyDown"\n            ? windowKeyEventHandlers.onKeyDown\n            : windowKeyEventHandlers.onKeyUp\n          handler?.(event, renderer)\n          return\n        }\n        const browserEvent = browserCompatibleNativeEvent(event)\n        events.dispatch(browserEvent)\n        dispatchBrowserKeyboardEvent(browserEvent)\n      } finally {\n        flushNative()\n      }\n    },\n''',
)
replace(
    path,
    '''      events.clear()\n      driver.dispose()\n''',
    '''      events.clear()\n      if (windowKeyEventIds.get(renderer) === windowKeyEventId) {\n        renderer.setWindowKeyEvents?.(false, false, windowKeyEventId)\n      }\n      driver.dispose()\n''',
)


def patch_runtime(path: str, solid2: bool) -> None:
    replace(
        path,
        'import type { DebugFrameOverlayMode, NativeRenderer } from "./host/types.js"\n',
        'import type { DebugFrameOverlayMode, NativeRenderer, WindowKeyEventHandlers } from "./host/types.js"\n',
    )
    replace(path, 'export interface RenderOptions extends WindowOptions {\n', 'export interface RenderOptions extends WindowOptions, WindowKeyEventHandlers {\n')
    replace(
        path,
        '  const { renderer: injected, onEvent, debugFrameOverlay, ...windowOptions } = options\n',
        '  const { renderer: injected, onEvent, onKeyDown, onKeyUp, debugFrameOverlay, ...windowOptions } = options\n',
    )
    replace(path, '    const root = createRoot(injected)\n', '    const root = createRoot(injected, { onKeyDown, onKeyUp })\n')
    if solid2:
        replace(path, '  const root = createRoot(renderer)\n', '  const root = createRoot(renderer, { onKeyDown, onKeyUp })\n')
    else:
        replace(path, '  root = createRoot(renderer)\n', '  root = createRoot(renderer, { onKeyDown, onKeyUp })\n')


patch_runtime("packages/solid/src/runtime.ts", solid2=True)
patch_runtime("packages/solid1/src/runtime.ts", solid2=False)

# Test renderers expose the native 0.7 focus/window-key methods.
path = "packages/solid/src/testing.ts"
replace(path, '    // GPUIX 0.6 applyBatch commits immediately; compatibility calls above are already visible.\n', '    // GPUIX applyBatch commits immediately; compatibility calls above are already visible.\n')
replace(
    path,
    '''  focusElement(elementId: number): void {\n    this.#native.flush()\n    this.#native.focusElement(elementId)\n    this.dispatchNativeEvents()\n    this.#native.flush()\n  }\n''',
    '''  focusElement(elementId: number): void {\n    this.#native.flush()\n    this.#native.focusElement(elementId)\n    this.dispatchNativeEvents()\n    this.#native.flush()\n  }\n\n  focusNext(): void { this.#native.focusNext() }\n  focusPrevious(): void { this.#native.focusPrevious() }\n  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {\n    this.#native.setWindowKeyEvents(keyDown, keyUp, eventId)\n  }\n''',
)
replace(
    path,
    'export function createTestRoot(width?: number, height?: number): TestRoot {\n',
    'export function createTestRoot(width?: number, height?: number, windowKeyEventHandlers: WindowKeyEventHandlers = {}): TestRoot {\n',
)
replace(
    path,
    '  StyleDesc,\n} from "./host/types.js"\n',
    '  StyleDesc,\n  WindowKeyEventHandlers,\n} from "./host/types.js"\n',
)
replace(path, '  const root = createRoot(renderer)\n', '  const root = createRoot(renderer, windowKeyEventHandlers)\n')

path = "packages/solid1/src/testing.ts"
replace(
    path,
    'import type { StyleDesc } from "./host/types.js"\n',
    'import type { StyleDesc, WindowKeyEventHandlers } from "./host/types.js"\n',
)
replace(
    path,
    '''  applyBatch(json: string): number[] { return this.#native.applyBatch(json) }\n  focusElement(elementId: number): void { this.#native.focusElement(elementId) }\n  getElementBounds(elementId: number): number[] | null { return this.#native.getElementBounds(elementId) }\n''',
    '''  applyBatch(json: string): number[] { return this.#native.applyBatch(json) }\n  focusElement(elementId: number): void { this.#native.focusElement(elementId) }\n  focusNext(): void { this.#native.focusNext() }\n  focusPrevious(): void { this.#native.focusPrevious() }\n  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void { this.#native.setWindowKeyEvents(keyDown, keyUp, eventId) }\n  getElementBounds(elementId: number): number[] | null { return this.#native.getElementBounds(elementId) }\n''',
)
replace(
    path,
    'export function createTestRoot(width?: number, height?: number): TestRoot {\n',
    'export function createTestRoot(width?: number, height?: number, windowKeyEventHandlers: WindowKeyEventHandlers = {}): TestRoot {\n',
)
replace(path, '  const root = createRoot(hostRenderer)\n', '  const root = createRoot(hostRenderer, windowKeyEventHandlers)\n')

# Public exports for the 0.7 surface.
for path in ["packages/solid/src/index.ts", "packages/solid1/src/index.ts"]:
    replace(path, '  ImgProps,\n', '  ImgProps,\n  LinearGradientBackground,\n  LinearGradientStop,\n')
    replace(path, '  VirtualListProps,\n', '  VirtualListProps,\n  WindowKeyEventHandler,\n  WindowKeyEventHandlers,\n')

# Fake renderer records 0.7 window key registration and focus traversal.
path = "packages/solid/test/fake-renderer.ts"
replace(
    path,
    '''  destroyed: number[] = []\n''',
    '''  destroyed: number[] = []\n  readonly windowKeyEvents: Array<[boolean, boolean, number]> = []\n  focusNextCount = 0\n  focusPreviousCount = 0\n''',
)
replace(
    path,
    '''  commitMutations(): void { this.direct.push(["commitMutations"]) }\n''',
    '''  commitMutations(): void { this.direct.push(["commitMutations"]) }\n  focusNext(): void { this.focusNextCount++ }\n  focusPrevious(): void { this.focusPreviousCount++ }\n  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {\n    this.windowKeyEvents.push([keyDown, keyUp, eventId])\n  }\n''',
)

# Published parity regression now locks the new 0.7 surface rather than the old 0.6 subset.
path = "packages/solid/test/host-published-parity.test.ts"
text = Path(path).read_text()
text = text.replace('import { describe, expect, it } from "vitest"\n', 'import { describe, expect, it } from "vitest"\nimport { createRoot } from "../src/root.js"\nimport type { EventPayload, LinearGradientBackground } from "../src/host/types.js"\n')
text = text.replace('describe("published GPUIX 0.6 host surface", () => {', 'describe("published GPUIX 0.7 host surface", () => {')
text = text.replace(
    '''    const highlight = { query: "Solid", activeIndex: 1, matchIndexOffset: 4 }\n\n    setHostProperty(container, "highlight", highlight, undefined)\n''',
    '''    const highlight = { query: "Solid", activeIndex: 1, matchIndexOffset: 4 }\n    const gradient: LinearGradientBackground = {\n      type: "linear-gradient",\n      angle: 90,\n      stops: [\n        { color: "#7c3aed", position: 0 },\n        { color: "#06b6d4", position: 1 },\n      ],\n      colorSpace: "oklab",\n    }\n\n    setHostProperty(container, "style", { background: gradient }, undefined)\n    setHostProperty(container, "highlight", highlight, undefined)\n''',
)
text = text.replace(
    '''    expect(batch).toContainEqual(["setCustomProp", 1, "highlight", highlight])\n''',
    '''    expect(batch).toContainEqual(["setStyle", 1, { background: gradient }])\n    expect(batch).toContainEqual(["setCustomProp", 1, "highlight", highlight])\n''',
)
text = text.replace(
    '''  })\n})\n''',
    '''  })\n\n  it("routes app-owned window key events through the 0.7 renderer contract", () => {\n    const renderer = new FakeRenderer()\n    let keyDown = ""\n    const root = createRoot(renderer, {\n      onKeyDown(event, nativeRenderer) {\n        keyDown = event.key ?? ""\n        if (event.key === "tab") nativeRenderer.focusNext?.()\n      },\n    })\n\n    const registration = renderer.windowKeyEvents.at(-1)\n    expect(registration?.[0]).toBe(true)\n    expect(registration?.[1]).toBe(false)\n    const eventId = registration?.[2]\n    expect(eventId).toBeTypeOf("number")\n\n    root.dispatch({\n      elementId: eventId as number,\n      eventType: "windowKeyDown",\n      key: "tab",\n      modifiers: { shift: false, ctrl: false, alt: false, cmd: false },\n    } satisfies EventPayload)\n\n    expect(keyDown).toBe("tab")\n    expect(renderer.focusNextCount).toBe(1)\n    root.unmount()\n    expect(renderer.windowKeyEvents.at(-1)).toEqual([false, false, eventId])\n  })\n})\n''',
    1,
)
Path(path).write_text(text)

# Public JSX typecheck exercises the structured gradient shape.
path = "packages/solid/test/intrinsics.typecheck.tsx"
file = Path(path)
text = file.read_text()
marker = 'void (\n'
if marker not in text:
    raise SystemExit(f"missing typecheck insertion marker in {path}")
insert = '''const gradientBackground = {\n  type: "linear-gradient" as const,\n  angle: 90,\n  stops: [\n    { color: "#7c3aed", position: 0 },\n    { color: "#06b6d4", position: 1 },\n  ] as [{ color: string; position: number }, { color: string; position: number }],\n  colorSpace: "oklab" as const,\n}\n\n'''
file.write_text(text.replace(marker, insert + marker, 1).replace('<div style={{', '<div style={{ background: gradientBackground,', 1))

# Exact DAW selector behavior: prove all source options mount and an option selection dismisses the menu.
path = "examples/solid1-daw/src/test.tsx"
replace(
    path,
    '''  app.renderer.clickCenterTestId("eq-band-7")\n  requireText(app.renderer.textContent("eq-selected-gain-value"), "0.0 dB", "EQ high band selection")\n  app.renderer.clickCenterTestId("eq-selected-gain-plus")\n''',
    '''  app.renderer.clickCenterTestId("eq-band-7")\n  requireText(app.renderer.textContent("eq-selected-gain-value"), "0.0 dB", "EQ high band selection")\n  app.renderer.clickCenterTestId("eq-filter-type-7")\n  const eqFilterMenuText = app.renderer.textContentRoot()\n  for (const option of ["Low Pass", "High Pass", "Band Pass", "Notch", "Low Shelf", "High Shelf", "Peaking", "All Pass"]) {\n    requireText(eqFilterMenuText, option, `EQ filter source option ${option}`)\n  }\n  app.renderer.clickText("Notch")\n  requireCondition(!app.renderer.textContentRoot().includes("Low Pass"), "selecting an EQ filter type should dismiss the source menu")\n  app.renderer.clickCenterTestId("eq-selected-gain-plus")\n''',
)

# Remove a few comments that still name the old baseline even though the behavior is unchanged in 0.7.
for path in ["packages/solid/src/cpu-throttle.ts", "packages/solid1/src/browser-event-compat.ts", "packages/solid/src/hooks/use-window-size.ts"]:
    file = Path(path)
    file.write_text(file.read_text().replace("GPUIX 0.6", "GPUIX 0.7"))
for path in ["examples/counter/src/benchmarks/chat.tsx", "examples/counter/src/benchmarks/timeline.tsx"]:
    file = Path(path)
    file.write_text(file.read_text().replace("GPUIX React 0.6", "GPUIX React 0.7"))
