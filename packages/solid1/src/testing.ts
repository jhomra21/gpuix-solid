import { createRequire } from "node:module"
import type { EventPayload, TestGpuixRenderer as NativeTestRendererApi } from "@gpuix/native"
import type { JSX } from "solid-js"
import { useDestroyUnlinksParentBatch, type MutationValue } from "./host/mutations.js"
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
  customProps?: Record<string, MutationValue>
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

function findFirstNodeOfType(node: NativeTreeNode, type: string): NativeTreeNode | undefined {
  if (node.type === type) return node
  for (const child of node.children ?? []) {
    const found = findFirstNodeOfType(child, type)
    if (found) return found
  }
  return undefined
}

function nodeText(node: NativeTreeNode): string {
  let text = node.text ?? ""
  for (const child of node.children ?? []) text += nodeText(child)
  return text
}

function findElementByExactText(
  node: NativeTreeNode,
  text: string,
  parent?: NativeTreeNode,
): NativeTreeNode | undefined {
  if (node.text != null && nodeText(node).trim() === text) return parent ?? node
  for (const child of node.children ?? []) {
    const found = findElementByExactText(child, text, node)
    if (found) return found
  }
  if (node.text == null && nodeText(node).trim() === text) return node
  return undefined
}

function findParentNode(root: NativeTreeNode, childId: number): NativeTreeNode | undefined {
  for (const child of root.children ?? []) {
    if (child.id === childId) return root
    const found = findParentNode(child, childId)
    if (found) return found
  }
  return undefined
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
    useDestroyUnlinksParentBatch(this)
  }

  bindRoot(root: Root): void {
    this.#root = root
  }

  applyBatch(json: string): number[] { return this.#native.applyBatch(json) }
  focusElement(elementId: number): void { this.#native.focusElement(elementId) }
  getElementBounds(elementId: number): number[] | null { return this.#native.getElementBounds(elementId) }

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

  clickTestId(testId: string): void {
    const point = insetPoint(this.boundsTestId(testId))
    this.#native.simulateClick(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  clickTextWithinTestId(testId: string, text: string): void {
    const parent = this.requireTestId(testId)
    const node = findElementByExactText(parent, text)
    if (!node) throw new Error(`Expected visible text ${JSON.stringify(text)} inside ${testId}`)
    const point = insetPoint(this.boundsNode(node, `${testId} text ${JSON.stringify(text)}`))
    this.#native.simulateClick(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  boundsTextWithinTestId(testId: string, text: string): TestBounds {
    const parent = this.requireTestId(testId)
    const node = findElementByExactText(parent, text)
    if (!node) throw new Error(`Expected visible text ${JSON.stringify(text)} inside ${testId}`)
    return this.boundsNode(node, `${testId} text ${JSON.stringify(text)}`)
  }

  styleTextWithinTestId(testId: string, text: string): StyleDesc {
    const parent = this.requireTestId(testId)
    const node = findElementByExactText(parent, text)
    if (!node) throw new Error(`Expected visible text ${JSON.stringify(text)} inside ${testId}`)
    return node.style ?? {}
  }

  styleParentOfTextWithinTestId(testId: string, text: string): StyleDesc {
    const root = this.requireTestId(testId)
    const node = findElementByExactText(root, text)
    if (!node) throw new Error(`Expected visible text ${JSON.stringify(text)} inside ${testId}`)
    const parent = findParentNode(root, node.id)
    if (!parent) throw new Error(`Expected parent for visible text ${JSON.stringify(text)} inside ${testId}`)
    return parent.style ?? {}
  }

  rightClickTestId(testId: string): void {
    const point = insetPoint(this.boundsTestId(testId))
    this.#native.simulateMouseDown(point.x, point.y, 2)
    this.dispatchNativeEvents()
    this.#native.flush()
    this.#native.simulateMouseUp(point.x, point.y, 2)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  rightClickTextWithinTestId(testId: string, text: string): void {
    const parent = this.requireTestId(testId)
    const node = findElementByExactText(parent, text)
    if (!node) throw new Error(`Expected visible text ${JSON.stringify(text)} inside ${testId}`)
    const point = insetPoint(this.boundsNode(node, `${testId} text ${JSON.stringify(text)}`))
    this.#native.simulateMouseDown(point.x, point.y, 2)
    this.dispatchNativeEvents()
    this.#native.flush()
    this.#native.simulateMouseUp(point.x, point.y, 2)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  hoverTestId(testId: string): void {
    const point = insetPoint(this.boundsTestId(testId))
    this.#native.simulateMouseMove(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  hoverTextWithinTestId(testId: string, text: string): void {
    const parent = this.requireTestId(testId)
    const node = findElementByExactText(parent, text)
    if (!node) throw new Error(`Expected visible text ${JSON.stringify(text)} inside ${testId}`)
    const point = insetPoint(this.boundsNode(node, `${testId} text ${JSON.stringify(text)}`))
    this.#native.simulateMouseMove(point.x, point.y)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  pressKeyTestId(testId: string, key: string): void {
    const node = this.requireTestId(testId)
    this.#native.focusElement(node.id)
    this.pressKey(key)
  }

  pressKey(key: string): void {
    this.#native.simulateKeystrokes(key)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  scrollTestId(testId: string, x: number, y: number): void {
    const node = this.requireTestId(testId)
    this.#native.flush()
    this.#native.scrollTo(node.id, x, y)
    this.#native.flush()
  }

  scrollOffsetTestId(testId: string): [number, number] | null {
    const node = this.requireTestId(testId)
    this.#native.flush()
    const offset = this.#native.getScrollOffset(node.id)
    if (!offset) return null
    const x = offset[0]
    const y = offset[1]
    if (x === undefined || y === undefined) throw new Error(`${testId} returned an incomplete scroll offset`)
    return [x, y]
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
    return this.boundsNode(node, testId)
  }

  typeTestId(testId: string, text: string): void {
    const node = this.requireTestId(testId)
    this.typeNode(node, text)
  }

  typeFirstInputWithinTestId(testId: string, text: string): void {
    const parent = this.requireTestId(testId)
    const input = findFirstNodeOfType(parent, "input")
    if (!input) throw new Error(`Expected an input inside ${testId}`)
    this.typeNode(input, text)
  }

  hasTestId(testId: string): boolean {
    return findNode(parseTree(this.#native.getTreeJson()), testId) !== undefined
  }

  textContent(testId: string): string {
    return nodeText(this.requireTestId(testId))
  }

  styleTestId(testId: string): StyleDesc {
    return this.requireTestId(testId).style ?? {}
  }

  customPropTestId(testId: string, key: string): MutationValue | undefined {
    return this.requireTestId(testId).customProps?.[key]
  }

  captureScreenshot(path: string): void {
    this.#native.flush()
    this.#native.captureScreenshot(path)
  }

  private typeNode(node: NativeTreeNode, text: string): void {
    this.#native.focusElement(node.id)
    const keystrokes = [...text].map((character) => character === " " ? "space" : character).join(" ")
    this.#native.simulateKeystrokes(keystrokes)
    this.dispatchNativeEvents()
    this.#native.flush()
  }

  private boundsNode(node: NativeTreeNode, label: string): TestBounds {
    this.#native.flush()
    const bounds = this.#native.getElementBounds(node.id)
    if (!bounds || bounds.length < 4) throw new Error(`${label} has no painted bounds`)
    const x = bounds[0]
    const y = bounds[1]
    const width = bounds[2]
    const height = bounds[3]
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      throw new Error(`${label} returned incomplete bounds`)
    }
    return { x, y, width, height }
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