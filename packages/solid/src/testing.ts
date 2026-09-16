import type {
  AnimationSnapshot,
  DebugFrameOverlayMode,
  DebugFrameOverlayStats,
  EventPayload,
  GpuixRenderer,
  HighlightMatch,
  MutationValue,
  NativeElementBounds,
  StyleDesc,
  WindowEventHandlers,
} from "./host/types.js"
import { useDestroyUnlinksParentBatch } from "./host/behavior.js"
import { Root } from "./root.js"
import { createRoot } from "./runtime.js"
import type { SolidElement } from "solid-js"

// The testing adapter intentionally mirrors the useful public GPUIX test
// surface while keeping the native renderer typed through the host contract.
// The native addon is optional at import time so pure logic tests can still run
// on machines where the platform binary is unavailable.

type NativeTestRenderer = GpuixRenderer & {
  getRootId(): number | null
  getTreeJson(): string
  getAllText(): string[]
  getText(id: number): string | null
  findByType(type: string): number[]
  hasEventListener(id: number, eventType: string): boolean
  dispatchEvent(id: number, eventType: string, payload?: EventPayload): void
  flush(): void
  drainEvents(): EventPayload[]
  getA11yTree(): string
  getAutomationTree(): string
  getRetainedElementCount(): number
  getElementBounds(elementId: number): NativeElementBounds | null
  clockPause(): number
  clockSet(nowMs: number): number
  clockFastForward(deltaMs: number): number
  clockResume(): number
  simulateClick(x: number, y: number, button?: number, modifiers?: string): void
  simulateMouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void
  simulateMouseDown(x: number, y: number, button?: number, modifiers?: string): void
  simulateMouseUp(x: number, y: number, button?: number, modifiers?: string): void
  simulateScrollWheel(x: number, y: number, deltaX: number, deltaY: number, modifiers?: string): void
  simulateKeystrokes(text: string): void
  simulateKeyDown(keystroke: string, isHeld?: boolean): void
  simulateKeyUp(keystroke: string): void
  simulateFileDrop(x: number, y: number, paths: string[]): void
  focusElement(elementId: number): void
  getFocusedElementId(): number | null
  focusNextWithin(elementId: number): void
  focusPreviousWithin(elementId: number): void
  getWindowSize(): { width: number; height: number }
  scrollTo(elementId: number, x: number, y: number): void
  scrollToItem(elementId: number, index: number, offsetInItem?: number): void
  getScrollOffset(elementId: number): number[] | null
  getListScrollTop(elementId: number): number[] | null
  dragSelect(x1: number, y1: number, x2: number, y2: number): void
  getSelectedText(): string | null
  clearSelection(): void
  getPaintedText(): string[]
  getPaintedHighlights(): HighlightMatch[]
  getSyntaxCacheStats(): number[]
  captureScreenshot(path: string): void
  setDebugFrameOverlay(mode: DebugFrameOverlayMode): string
  getDebugFrameOverlay(): string
  cycleDebugFrameOverlay(): string
  resetDebugFrameOverlayStats(): void
  getDebugFrameOverlayStats(): DebugFrameOverlayStats
}

type NativeModule = {
  TestGpuixRenderer?: new (width?: number, height?: number) => NativeTestRenderer
}

let NativeCtor: NativeModule["TestGpuixRenderer"]
try {
  const native = await import("@gpuix/native") as NativeModule
  NativeCtor = native.TestGpuixRenderer
} catch {
  NativeCtor = undefined
}

export const hasNativeTestRenderer = NativeCtor !== undefined

export interface TestElement {
  id: number
  type: string
  style: StyleDesc
  text: string | null
  events: Set<string>
  children: number[]
  parentId: number | null
  testId?: string
  customProps?: Record<string, unknown>
}

type NativeTreeNode = {
  id: number
  type: string
  style?: StyleDesc
  text?: string | null
  events?: string[]
  children?: NativeTreeNode[]
  testId?: string
  customProps?: Record<string, unknown>
}

function parseTree(json: string): NativeTreeNode | null {
  if (!json) return null
  return JSON.parse(json) as NativeTreeNode
}

function normalizeNativeElementBounds(bounds: NativeElementBounds | null): number[] | null {
  if (!bounds) return null
  if (Array.isArray(bounds)) return bounds
  return [bounds.x, bounds.y, bounds.width, bounds.height]
}

export class TestRenderer implements GpuixRenderer {
  readonly #native: NativeTestRenderer
  #root: Root | null = null

  constructor(width?: number, height?: number) {
    if (!NativeCtor) throw new Error("@gpuix/native TestGpuixRenderer is unavailable")
    this.#native = new NativeCtor(width, height)
  }

  bindRoot(root: Root): void {
    this.#root = root
  }

  createElement(type: string): number {
    return this.#native.createElement(type)
  }

  createTextNode(text: string): number {
    return this.#native.createTextNode(text)
  }

  setRoot(id: number): void {
    this.#native.setRoot(id)
  }

  appendChild(parentId: number, childId: number): void {
    this.#native.appendChild(parentId, childId)
  }

  insertBefore(parentId: number, childId: number, beforeId: number): void {
    this.#native.insertBefore(parentId, childId, beforeId)
  }

  removeChild(parentId: number, childId: number): void {
    this.#native.removeChild(parentId, childId)
  }

  clearChildren(parentId: number): void {
    this.#native.clearChildren(parentId)
  }

  destroyElement(id: number): void {
    this.#native.destroyElement(id)
  }

  setText(id: number, text: string): void {
    this.#native.setText(id, text)
  }

  setStyle(id: number, key: string, valueJson: string): void {
    this.#native.setStyle(id, key, valueJson)
  }

  setStyles(id: number, stylesJson: string): void {
    this.#native.setStyles(id, stylesJson)
  }

  clearStyle(id: number, key: string): void {
    this.#native.clearStyle(id, key)
  }

  clearStyles(id: number): void {
    this.#native.clearStyles(id)
  }

  setCustomProp(id: number, key: string, valueJson: string): void {
    this.#native.setCustomProp(id, key, valueJson)
  }

  clearCustomProp(id: number, key: string): void {
    this.#native.clearCustomProp(id, key)
  }

  addEventListener(id: number, eventType: string): void {
    this.#native.addEventListener(id, eventType)
  }

  removeEventListener(id: number, eventType: string): void {
    this.#native.removeEventListener(id, eventType)
  }

  setWindowKeyEvents(keyDown: boolean, keyUp: boolean, eventId: number): void {
    this.#native.setWindowKeyEvents?.(keyDown, keyUp, eventId)
  }

  setWindowSelectionChange(enabled: boolean, eventId: number): void {
    this.#native.setWindowSelectionChange?.(enabled, eventId)
  }

  setWindowBoundsListener(enabled: boolean, eventId: number): void {
    this.#native.setWindowBoundsListener?.(enabled, eventId)
  }

  requestClose(): void {
    this.#native.requestClose?.()
  }

  applyBatch(mutationsJson: string): number[] {
    return this.#native.applyBatch(mutationsJson)
  }

  flush(): void {
    this.#native.flush()
  }

  dispatchNativeEvents(): void {
    const events = this.#native.drainEvents()
    for (const event of events) this.#root?.dispatchNativeEvent(event)
  }

  dispatchEvent(id: number, eventType: string, payload: EventPayload = {}): void {
    this.#native.dispatchEvent(id, eventType, payload)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateClick(x: number, y: number, button?: number, modifiers?: string): void {
    this.#native.flush()
    this.#native.simulateClick(x, y, button, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void {
    this.#native.flush()
    this.#native.simulateMouseMove(x, y, pressedButton, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseDown(x: number, y: number, button?: number, modifiers?: string): void {
    this.#native.flush()
    this.#native.simulateMouseDown(x, y, button ?? 0, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseUp(x: number, y: number, button?: number, modifiers?: string): void {
    this.#native.flush()
    this.#native.simulateMouseUp(x, y, button ?? 0, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateScrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): void {
    this.#native.flush()
    this.#native.simulateScrollWheel(x, y, deltaX, deltaY, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateFileDrop(x: number, y: number, paths: string[]): void {
    this.#native.flush()
    this.#native.simulateFileDrop(x, y, paths)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  simulateKeystrokes(text: string): void {
    this.#native.simulateKeystrokes(text)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  simulateKeyDown(keystroke: string, isHeld?: boolean): void {
    this.#native.simulateKeyDown(keystroke, isHeld)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  simulateKeyUp(keystroke: string): void {
    this.#native.simulateKeyUp(keystroke)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  focusElement(elementId: number): void {
    this.#native.flush()
    this.#native.focusElement(elementId)
    this.dispatchNativeEvents()
  }

  getFocusedElementId(): number | null {
    this.#native.flush()
    return this.#native.getFocusedElementId()
  }

  focusNextWithin(elementId: number): void {
    this.#native.flush()
    this.#native.focusNextWithin(elementId)
    this.dispatchNativeEvents()
  }

  focusPreviousWithin(elementId: number): void {
    this.#native.flush()
    this.#native.focusPreviousWithin(elementId)
    this.dispatchNativeEvents()
  }

  getWindowSize(): { width: number; height: number } {
    return this.#native.getWindowSize()
  }

  getListScrollTop(elementId: number): [number, number, number] | null {
    this.#native.flush()
    const anchor = this.#native.getListScrollTop(elementId)
    if (!anchor) return null
    const itemIndex = anchor[0]
    const offsetInItem = anchor[1]
    const viewportHeight = anchor[2]
    if (itemIndex === undefined || offsetInItem === undefined || viewportHeight === undefined) {
      throw new Error("Native list scroll anchor did not contain three values")
    }
    return [itemIndex, offsetInItem, viewportHeight]
  }

  dragSelect(x1: number, y1: number, x2: number, y2: number): string | null {
    this.#native.dragSelect(x1, y1, x2, y2)
    this.dispatchNativeEvents()
    this.#native.flush()
    return this.#native.getSelectedText()
  }

  getSelectedText(): string | null {
    return this.#native.getSelectedText()
  }

  clearSelection(): void {
    this.#native.clearSelection()
    // GPUI emits the selectionChange event while processing the repaint.
    // Flush before draining events, then flush once more after Solid updates.
    this.#native.flush()
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  getPaintedText(): string[] {
    this.#native.flush()
    return this.#native.getPaintedText()
  }

  getPaintedHighlights(): HighlightMatch[] {
    this.#native.flush()
    return this.#native.getPaintedHighlights()
  }

  getSyntaxCacheStats(): [number, number, number] {
    const stats = this.#native.getSyntaxCacheStats()
    const hits = stats[0]
    const misses = stats[1]
    const documents = stats[2]
    if (hits === undefined || misses === undefined || documents === undefined) {
      throw new Error("Native syntax cache stats did not contain three counters")
    }
    return [hits, misses, documents]
  }

  setDebugFrameOverlay(mode: DebugFrameOverlayMode): string {
    return this.#native.setDebugFrameOverlay(mode)
  }

  getDebugFrameOverlay(): string {
    return this.#native.getDebugFrameOverlay()
  }

  cycleDebugFrameOverlay(): string {
    return this.#native.cycleDebugFrameOverlay()
  }

  resetDebugFrameOverlayStats(): void {
    this.#native.resetDebugFrameOverlayStats()
  }

  getDebugFrameOverlayStats(): DebugFrameOverlayStats {
    return this.#native.getDebugFrameOverlayStats()
  }

  getRoot(): TestElement | undefined {
    const rootId = this.#native.getRootId()
    if (rootId === null) return undefined
    return this.#buildElementMap().get(rootId)
  }

  getElement(id: number): TestElement | undefined {
    return this.#buildElementMap().get(id)
  }

  findByType(type: string): TestElement[] {
    const map = this.#buildElementMap()
    return this.#native.findByType(type)
      .map((id) => map.get(id))
      .filter((element): element is TestElement => element !== undefined)
  }

  findByText(text: string): TestElement | undefined {
    for (const element of this.#buildElementMap().values()) {
      if (element.text?.includes(text)) return element
    }
    return undefined
  }

  hasEventListener(id: number, eventType: string): boolean {
    return this.#native.hasEventListener(id, eventType)
  }

  getText(id: number): string | null {
    return this.#native.getText(id)
  }

  getAllText(): string[] {
    return this.#native.getAllText()
  }

  toJSON(): NativeTreeNode | null {
    return parseTree(this.#native.getTreeJson())
  }

  getAutomationTree(): string {
    return this.#native.getAutomationTree()
  }

  getElementBounds(elementId: number): number[] | null {
    return normalizeNativeElementBounds(this.#native.getElementBounds(elementId))
  }

  clockPause(): number {
    return this.#native.clockPause()
  }

  clockSet(nowMs: number): number {
    return this.#native.clockSet(nowMs)
  }

  clockFastForward(deltaMs: number): number {
    return this.#native.clockFastForward(deltaMs)
  }

  clockResume(): number {
    return this.#native.clockResume()
  }

  captureScreenshot(path: string): void {
    this.#native.flush()
    this.#native.captureScreenshot(path)
  }

  get hasNative(): boolean {
    return true
  }

  #applyOne(mutation: readonly unknown[]): number[] {
    return this.applyBatch(JSON.stringify([mutation]))
  }

  #buildElementMap(): Map<number, TestElement> {
    const map = new Map<number, TestElement>()
    const root = parseTree(this.#native.getTreeJson())
    if (!root) return map

    const walk = (node: NativeTreeNode, parentId: number | null): void => {
      const children = node.children ?? []
      const element: TestElement = {
        id: node.id,
        type: node.type,
        style: node.style ?? {},
        text: node.text ?? null,
        events: new Set(node.events ?? []),
        children: children.map((child) => child.id),
        parentId,
      }
      if (node.customProps) element.customProps = node.customProps
      map.set(node.id, element)
      for (const child of children) walk(child, node.id)
    }

    walk(root, null)
    return map
  }
}

export interface TestRoot {
  root: Root
  renderer: TestRenderer
  render(code: () => SolidElement): void
  unmount(): void
}

/** Create a Solid root backed by the real GPUI native test renderer. */
export function createTestRoot(width?: number, height?: number, windowEventHandlers: WindowEventHandlers = {}): TestRoot {
  const renderer = new TestRenderer(width, height)
  useDestroyUnlinksParentBatch(renderer)
  const root = createRoot(renderer, windowEventHandlers)
  renderer.bindRoot(root)

  const render = (code: () => SolidElement): void => {
    root.render(code)
    renderer.flush()
  }

  const unmount = (): void => {
    root.unmount()
    renderer.flush()
  }

  return { root, renderer, render, unmount }
}

function parseMutationValue(value: string): MutationValue {
  // SAFETY: compatibility host methods receive JSON produced from renderer-owned styles and custom props.
  return JSON.parse(value) as MutationValue
}
