import { createRequire } from "node:module"
import type { EventPayload, TestGpuixRenderer as NativeTestRendererApi } from "@gpuix/native"
import type { Element as SolidElement } from "solid-js"
import { useDestroyUnlinksParentBatch, type MutationValue } from "./host/mutations.js"
import type {
  DebugFrameOverlayMode,
  DebugFrameOverlayStats,
  HighlightMatch,
  NativeRenderer,
  StyleDesc,
} from "./host/types.js"
import { createRoot, type Root } from "./root.js"

type NativeTestRendererConstructor = new (
  width?: number | null,
  height?: number | null,
) => NativeTestRendererApi
type NativeModule = {
  TestGpuixRenderer?: NativeTestRendererConstructor
  hasTestGpuixRenderer?: () => boolean
}

function loadNativeTestRenderer(): NativeTestRendererConstructor | undefined {
  try {
    const require = createRequire(import.meta.url)
    // SAFETY: @gpuix/native's generated entrypoint exports this constructor
    // when the installed platform binding was built with native test support.
    const nativeModule = require("@gpuix/native") as NativeModule
    if (nativeModule.hasTestGpuixRenderer?.() !== true) return undefined
    return nativeModule.TestGpuixRenderer
  } catch {
    return undefined
  }
}

const NativeTestRenderer = loadNativeTestRenderer()

/** Whether this installed native build provides the real GPU-backed test renderer. */
export const hasNativeTestRenderer = NativeTestRenderer !== undefined

type TestCustomProps = Record<string, MutationValue>

export interface TestElement {
  id: number
  type: string
  style: StyleDesc
  text: string | null
  events: Set<string>
  children: number[]
  parentId: number | null
  customProps?: TestCustomProps
}

interface NativeTreeNode {
  id: number
  type: string
  testId?: string
  style?: StyleDesc
  text?: string | null
  events?: string[]
  children?: NativeTreeNode[]
  customProps?: TestCustomProps
}

function parseTree(json: string): NativeTreeNode | null {
  // SAFETY: TestGpuixRenderer.getTreeJson() is a native contract that returns
  // a serialized retained-tree node or null with this exact recursive shape.
  return JSON.parse(json) as NativeTreeNode | null
}

/** Solid adapter over GPUIX's native TestGpuixRenderer. */
export class TestRenderer implements NativeRenderer {
  readonly #native: NativeTestRendererApi
  #root: Root | undefined
  commitCount = 0

  constructor(width?: number, height?: number) {
    if (!NativeTestRenderer) {
      throw new Error(
        "Native TestGpuixRenderer not available. Use a native build with test support.",
      )
    }
    this.#native = new NativeTestRenderer(width, height)
  }

  bindRoot(root: Root): void {
    this.#root = root
  }

  createElement(id: number, elementType: string): void {
    this.#applyOne(["createElement", id, elementType])
  }

  destroyElement(id: number): number[] {
    return this.#applyOne(["destroyElement", id])
  }

  appendChild(parentId: number, childId: number): void {
    this.#applyOne(["appendChild", parentId, childId])
  }

  removeChild(parentId: number, childId: number): void {
    this.#applyOne(["removeChild", parentId, childId])
  }

  insertBefore(parentId: number, childId: number, beforeId: number): void {
    this.#applyOne(["insertBefore", parentId, childId, beforeId])
  }

  setStyle(id: number, styleJson: string): void {
    this.#applyOne(["setStyle", id, parseMutationValue(styleJson)])
  }

  setText(id: number, content: string): void {
    this.#applyOne(["setText", id, content])
  }

  setEventListener(id: number, eventType: string, hasHandler: boolean): void {
    this.#applyOne(["setEventListener", id, eventType, hasHandler])
  }

  setRoot(id: number): void {
    this.#applyOne(["setRoot", id])
  }

  setCustomProp(id: number, key: string, valueJson: string): void {
    this.#applyOne(["setCustomProp", id, key, parseMutationValue(valueJson)])
  }

  commitMutations(): void {
    // GPUIX 0.6 applyBatch commits immediately; compatibility calls above are already visible.
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

  nativeSimulateClick(
    x: number,
    y: number,
    button?: number,
    modifiers?: string,
  ): void {
    this.#native.flush()
    this.#native.simulateClick(x, y, button, modifiers)
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

  nativeSimulateMouseMove(
    x: number,
    y: number,
    pressedButton?: number,
    modifiers?: string,
  ): void {
    this.#native.flush()
    this.#native.simulateMouseMove(x, y, pressedButton, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseDown(
    x: number,
    y: number,
    button = 0,
    modifiers?: string,
  ): void {
    this.#native.flush()
    this.#native.simulateMouseDown(x, y, button, modifiers)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  nativeSimulateMouseUp(
    x: number,
    y: number,
    button = 0,
    modifiers?: string,
  ): void {
    this.#native.flush()
    this.#native.simulateMouseUp(x, y, button, modifiers)
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

  scrollToItem(elementId: number, index: number, offsetInItem?: number): void {
    this.#native.flush()
    this.#native.scrollToItem(elementId, index, offsetInItem)
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

  getWindowSize(): { width: number; height: number } {
    this.#native.flush()
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
export function createTestRoot(width?: number, height?: number): TestRoot {
  const renderer = new TestRenderer(width, height)
  useDestroyUnlinksParentBatch(renderer)
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

function parseMutationValue(value: string): MutationValue {
  // SAFETY: compatibility host methods receive JSON produced from renderer-owned styles and custom props.
  return JSON.parse(value) as MutationValue
}
