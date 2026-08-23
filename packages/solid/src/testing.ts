import * as native from "@gpuix/native"
import type { EventPayload } from "@gpuix/native"
import type { Element as SolidElement } from "solid-js"
import { createRoot, type Root } from "./root.js"
import type { DebugFrameOverlayMode, NativeRenderer } from "./host/types.js"

/** Whether this installed native build exports the GPU-backed test renderer. */
export const hasNativeTestRenderer = Boolean(native.TestGpuixRenderer)

export interface TestElement {
  id: number
  type: string
  style: Record<string, unknown>
  text: string | null
  events: Set<string>
  children: number[]
  parentId: number | null
  customProps?: Record<string, unknown>
}

interface NativeTreeNode {
  id: number
  type: string
  style?: Record<string, unknown>
  text?: string | null
  events?: string[]
  children?: NativeTreeNode[]
  customProps?: Record<string, unknown>
}

function parseTree(json: string): NativeTreeNode | null {
  // SAFETY: TestGpuixRenderer.getTreeJson() is a native contract that returns
  // a serialized retained-tree node or null with this exact recursive shape.
  return JSON.parse(json) as NativeTreeNode | null
}

/**
 * Solid adapter over GPUIX's native TestGpuixRenderer.
 *
 * Structural state and layout remain in Rust. Solid's normal root/mutation
 * path drives this renderer, while native events are drained back through the
 * root-owned Solid event registry.
 */
export class TestRenderer implements NativeRenderer {
  readonly #native: native.TestGpuixRenderer
  #root: Root | undefined
  commitCount = 0

  constructor() {
    if (!hasNativeTestRenderer) {
      throw new Error(
        "Native TestGpuixRenderer not available. Use a native build with test support.",
      )
    }
    this.#native = new native.TestGpuixRenderer()
  }

  bindRoot(root: Root): void {
    this.#root = root
  }

  createElement(id: number, elementType: string): void {
    this.#native.createElement(id, elementType)
  }

  destroyElement(id: number): number[] {
    return this.#native.destroyElement(id)
  }

  appendChild(parentId: number, childId: number): void {
    this.#native.appendChild(parentId, childId)
  }

  removeChild(parentId: number, childId: number): void {
    this.#native.removeChild(parentId, childId)
  }

  insertBefore(parentId: number, childId: number, beforeId: number): void {
    this.#native.insertBefore(parentId, childId, beforeId)
  }

  setStyle(id: number, styleJson: string): void {
    this.#native.setStyle(id, styleJson)
  }

  setText(id: number, content: string): void {
    this.#native.setText(id, content)
  }

  setEventListener(id: number, eventType: string, hasHandler: boolean): void {
    this.#native.setEventListener(id, eventType, hasHandler)
  }

  setRoot(id: number): void {
    this.#native.setRoot(id)
  }

  setCustomProp(id: number, key: string, valueJson: string): void {
    this.#native.setCustomProp(id, key, valueJson)
  }

  commitMutations(): void {
    this.#native.commitMutations()
    this.commitCount++
  }

  applyBatch(json: string): number[] {
    const destroyed = this.#native.applyBatch(json)
    this.commitCount++
    return destroyed
  }

  /** Run GPUI rendering/layout until the native test dispatcher parks. */
  flush(): void {
    this.#native.flush()
  }

  drainEvents(): EventPayload[] {
    return this.#native.drainEvents()
  }

  /** Feed all pending native GPUI events through this Solid root. */
  dispatchNativeEvents(): void {
    const root = this.#root
    if (!root) {
      throw new Error("TestRenderer is not bound to a Solid test root")
    }

    for (;;) {
      const events = this.#native.drainEvents()
      if (events.length === 0) return
      for (const event of events) root.dispatch(event)
    }
  }

  simulateKeystrokes(keystrokes: string): void {
    this.#native.flush()
    this.#native.simulateKeystrokes(keystrokes)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateKeystrokes(elementId: number, keystrokes: string): void {
    this.#native.flush()
    this.#native.focusElement(elementId)
    this.#native.simulateKeystrokes(keystrokes)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateKeyDown(elementId: number, keystroke: string, isHeld = false): void {
    this.#native.flush()
    this.#native.focusElement(elementId)
    this.#native.simulateKeyDown(keystroke, isHeld)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateKeyUp(elementId: number, keystroke: string): void {
    this.#native.flush()
    this.#native.focusElement(elementId)
    this.#native.simulateKeyUp(keystroke)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateClick(x: number, y: number): void {
    this.#native.flush()
    this.#native.simulateClick(x, y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateScrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
  ): void {
    this.#native.flush()
    this.#native.simulateScrollWheel(x, y, deltaX, deltaY)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseMove(x: number, y: number, pressedButton?: number): void {
    this.#native.flush()
    this.#native.simulateMouseMove(x, y, pressedButton)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseDown(x: number, y: number, button = 0): void {
    this.#native.flush()
    this.#native.simulateMouseDown(x, y, button)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseUp(x: number, y: number, button = 0): void {
    this.#native.flush()
    this.#native.simulateMouseUp(x, y, button)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  focusElement(elementId: number): void {
    this.#native.flush()
    this.#native.focusElement(elementId)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  scrollTo(elementId: number, x: number, y: number): void {
    this.#native.flush()
    this.#native.scrollTo(elementId, x, y)
    this.#native.flush()
  }

  scrollToItem(elementId: number, index: number): void {
    this.#native.flush()
    this.#native.scrollToItem(elementId, index)
    this.#native.flush()
  }

  getScrollOffset(elementId: number): [number, number] | null {
    this.#native.flush()
    const offset = this.#native.getScrollOffset(elementId)
    if (!offset) return null
    const x = offset[0]
    const y = offset[1]
    if (x === undefined || y === undefined) {
      throw new Error("Native scroll offset did not contain two coordinates")
    }
    return [x, y]
  }

  dragSelect(x1: number, y1: number, x2: number, y2: number): string | null {
    this.#native.dragSelect(x1, y1, x2, y2)
    return this.#native.getSelectedText()
  }

  getSelectedText(): string | null {
    return this.#native.getSelectedText()
  }

  clearSelection(): void {
    this.#native.clearSelection()
    this.#native.flush()
  }

  getPaintedText(): string[] {
    return this.#native.getPaintedText()
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
    return this.#native.getElementBounds(elementId)
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
export function createTestRoot(): TestRoot {
  const renderer = new TestRenderer()
  const root = createRoot(renderer)
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
