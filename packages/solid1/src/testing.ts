import { createRequire } from "node:module"
import type { EventPayload, TestGpuixRenderer as NativeTestRendererApi } from "@gpuix/native"
import type { JSX } from "solid-js"
import type { NativeRenderer, StyleDesc } from "./host/types.js"
import { createRoot, type Root } from "./root.js"

type NativeTestRendererConstructor = new () => NativeTestRendererApi
type NativeModule = { TestGpuixRenderer?: NativeTestRendererConstructor }

interface NativeTreeNode {
  id: number
  type: string
  testId?: string
  style?: StyleDesc
  text?: string | null
  children?: NativeTreeNode[]
}

export interface TestBounds {
  x: number
  y: number
  width: number
  height: number
}

function loadNativeTestRenderer(): NativeTestRendererConstructor | undefined {
  try {
    const require = createRequire(import.meta.url)
    // SAFETY: @gpuix/native exports TestGpuixRenderer when the installed platform binding includes test support.
    const nativeModule = require("@gpuix/native") as NativeModule
    return nativeModule.TestGpuixRenderer
  } catch {
    return undefined
  }
}

function parseTree(json: string): NativeTreeNode | null {
  // SAFETY: TestGpuixRenderer.getTreeJson() is a native contract with this recursive retained-tree shape.
  return JSON.parse(json) as NativeTreeNode | null
}

function findNode(node: NativeTreeNode | null, testId: string): NativeTreeNode | undefined {
  if (!node) return undefined
  if (node.testId === testId) return node
  for (const child of node.children ?? []) {
    const found = findNode(child, testId)
    if (found) return found
  }
  return undefined
}

function nodeText(node: NativeTreeNode): string {
  let text = node.text ?? ""
  for (const child of node.children ?? []) text += nodeText(child)
  return text
}

function insetPoint(bounds: TestBounds) {
  return {
    x: bounds.x + Math.min(4, bounds.width / 4),
    y: bounds.y + Math.min(4, bounds.height / 4),
  }
}

const NativeTestRenderer = loadNativeTestRenderer()
export const hasNativeTestRenderer = NativeTestRenderer !== undefined

export class TestRenderer implements NativeRenderer {
  readonly #native: NativeTestRendererApi
  #root: Root | undefined

  constructor() {
    if (!NativeTestRenderer) throw new Error("Native TestGpuixRenderer is unavailable")
    this.#native = new NativeTestRenderer()
  }

  bindRoot(root: Root): void {
    this.#root = root
  }

  createElement(id: number, elementType: string): void { this.#native.createElement(id, elementType) }
  destroyElement(id: number): number[] { return this.#native.destroyElement(id) }
  appendChild(parentId: number, childId: number): void { this.#native.appendChild(parentId, childId) }
  removeChild(parentId: number, childId: number): void { this.#native.removeChild(parentId, childId) }
  insertBefore(parentId: number, childId: number, beforeId: number): void { this.#native.insertBefore(parentId, childId, beforeId) }
  setStyle(id: number, styleJson: string): void { this.#native.setStyle(id, styleJson) }
  setText(id: number, content: string): void { this.#native.setText(id, content) }
  setEventListener(id: number, eventType: string, hasHandler: boolean): void { this.#native.setEventListener(id, eventType, hasHandler) }
  setRoot(id: number): void { this.#native.setRoot(id) }
  setCustomProp(id: number, key: string, valueJson: string): void { this.#native.setCustomProp(id, key, valueJson) }
  commitMutations(): void { this.#native.commitMutations() }
  applyBatch(json: string): number[] { return this.#native.applyBatch(json) }
  focusElement(elementId: number): void { this.#native.focusElement(elementId) }

  flush(): void { this.#native.flush() }

  dispatchNativeEvents(): void {
    const root = this.#root
    if (!root) throw new Error("TestRenderer is not bound to a Solid 1 root")
    for (;;) {
      const events = this.#native.drainEvents()
      if (events.length === 0) return
      for (const event of events) root.dispatch(event)
    }
  }

  clickTestId(testId: string, button = 0): void {
    const point = insetPoint(this.boundsTestId(testId))
    this.#native.simulateClick(point.x, point.y, button)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  hoverTestId(testId: string): void {
    const point = insetPoint(this.boundsTestId(testId))
    this.#native.simulateMouseMove(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  pressKeyTestId(testId: string, key: string): void {
    const node = this.requireTestId(testId)
    this.#native.focusElement(node.id)
    this.#native.simulateKeystrokes(key)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  dragTestId(testId: string, deltaX: number, deltaY: number): void {
    const start = insetPoint(this.boundsTestId(testId))
    const endX = start.x + deltaX
    const endY = start.y + deltaY

    this.#native.simulateMouseMove(start.x, start.y)
    this.dispatchNativeEvents()
    this.#native.flush()

    this.#native.simulateMouseDown(start.x, start.y, 0)
    this.dispatchNativeEvents()
    this.#native.flush()

    this.#native.simulateMouseMove(endX, endY, 0)
    this.dispatchNativeEvents()
    this.#native.flush()

    this.#native.simulateMouseUp(endX, endY, 0)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  boundsTestId(testId: string): TestBounds {
    const node = this.requireTestId(testId)
    this.#native.flush()
    const bounds = this.#native.getElementBounds(node.id)
    if (!bounds || bounds.length < 4) throw new Error(`${testId} has no painted bounds`)
    const x = bounds[0]
    const y = bounds[1]
    const width = bounds[2]
    const height = bounds[3]
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      throw new Error(`${testId} returned incomplete bounds`)
    }
    return { x, y, width, height }
  }

  typeTestId(testId: string, text: string): void {
    const node = this.requireTestId(testId)
    this.#native.focusElement(node.id)
    const keystrokes = [...text].map((character) => character === " " ? "space" : character).join(" ")
    this.#native.simulateKeystrokes(keystrokes)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  hasTestId(testId: string): boolean {
    return findNode(parseTree(this.#native.getTreeJson()), testId) !== undefined
  }

  textContent(testId: string): string {
    return nodeText(this.requireTestId(testId))
  }

  captureScreenshot(path: string): void {
    this.#native.flush()
    this.#native.captureScreenshot(path)
  }

  private requireTestId(testId: string): NativeTreeNode {
    const node = findNode(parseTree(this.#native.getTreeJson()), testId)
    if (!node) throw new Error(`Expected ${testId} in native tree`)
    return node
  }
}

export interface TestRoot {
  root: Root
  renderer: TestRenderer
  render(code: () => JSX.Element): void
  unmount(): void
}

export function createTestRoot(): TestRoot {
  const renderer = new TestRenderer()
  const root = createRoot(renderer)
  renderer.bindRoot(root)
  return {
    root,
    renderer,
    render(code) {
      root.render(code)
      renderer.flush()
    },
    unmount() {
      root.unmount()
      renderer.flush()
    },
  }
}

export type { EventPayload }
