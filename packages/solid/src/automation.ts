import { parseJson } from "./automation/json.js"
import {
  parseAutomationTreeValue,
  type AutomationTreeNode,
  type ElementBounds,
} from "./automation/tree.js"
import type { TestRenderer } from "./testing.js"

export type { AutomationTreeNode, ElementBounds } from "./automation/tree.js"

export type AutomationErrorCode =
  | "NotFound"
  | "Ambiguous"
  | "Timeout"
  | "Protocol"
  | "Closed"
  | "Unsupported"
  | "Security"
  | "Cancelled"

export class AutomationError extends Error {
  readonly code: AutomationErrorCode

  constructor(code: AutomationErrorCode, message: string) {
    super(message)
    this.name = "AutomationError"
    this.code = code
  }
}

export interface AutomationBackend {
  getTree(): AutomationTreeNode | null | Promise<AutomationTreeNode | null>
  getBounds(elementId: number): ElementBounds | null | Promise<ElementBounds | null>
  click(x: number, y: number): void | Promise<void>
  keystrokes(elementId: number, keys: string): void | Promise<void>
  screenshot(path: string): void | Promise<void>
  clockPause(): number | Promise<number>
  clockSet(nowMs: number): number | Promise<number>
  clockFastForward(deltaMs: number): number | Promise<number>
  clockResume(): number | Promise<number>
  close(): void | Promise<void>
}

export function parseAutomationTree(json: string): AutomationTreeNode | null {
  return parseAutomationTreeValue(parseJson(json))
}

export function parseBounds(bounds: number[] | null): ElementBounds | null {
  if (bounds === null) return null
  const x = bounds[0]
  const y = bounds[1]
  const width = bounds[2]
  const height = bounds[3]
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    throw new Error("Native element bounds did not contain four coordinates")
  }
  return { x, y, width, height }
}

export class InProcessAutomationBackend implements AutomationBackend {
  readonly #renderer: TestRenderer

  constructor(renderer: TestRenderer) {
    this.#renderer = renderer
  }

  getTree(): AutomationTreeNode | null {
    return parseAutomationTree(this.#renderer.getAutomationTree())
  }

  getBounds(elementId: number): ElementBounds | null {
    return parseBounds(this.#renderer.getElementBounds(elementId))
  }

  click(x: number, y: number): void {
    this.#renderer.nativeSimulateClick(x, y)
  }

  keystrokes(elementId: number, keys: string): void {
    this.#renderer.nativeSimulateKeystrokes(elementId, keys)
  }

  screenshot(path: string): void {
    this.#renderer.captureScreenshot(path)
  }

  clockPause(): number {
    return this.#renderer.clockPause()
  }

  clockSet(nowMs: number): number {
    return this.#renderer.clockSet(nowMs)
  }

  clockFastForward(deltaMs: number): number {
    return this.#renderer.clockFastForward(deltaMs)
  }

  clockResume(): number {
    return this.#renderer.clockResume()
  }

  close(): void {}
}

interface Selector {
  testId?: string
  text?: string
  type?: string
  parent?: Selector
}

function matches(node: AutomationTreeNode, selector: Selector): boolean {
  if (selector.testId !== undefined && node.testId !== selector.testId) return false
  if (selector.type !== undefined && node.type !== selector.type) return false
  if (selector.text !== undefined && !(node.text ?? "").includes(selector.text)) return false
  return true
}

function collect(node: AutomationTreeNode | null, selector: Selector): AutomationTreeNode[] {
  if (node === null) return []
  const roots = selector.parent === undefined ? [node] : collect(node, selector.parent)
  const found: AutomationTreeNode[] = []

  const walk = (current: AutomationTreeNode): void => {
    if (matches(current, selector)) found.push(current)
    for (const child of current.children ?? []) walk(child)
  }

  for (const root of roots) {
    if (selector.parent === undefined) {
      walk(root)
      continue
    }
    for (const child of root.children ?? []) walk(child)
  }

  return found
}

function toKeystrokes(text: string): string {
  return [...text]
    .map((character) => {
      if (character === " ") return "space"
      if (character === "\n") return "enter"
      if (character === "\t") return "tab"
      return character
    })
    .join(" ")
}

export class Locator {
  readonly #app: App
  readonly #selector: Selector

  constructor(app: App, selector: Selector) {
    this.#app = app
    this.#selector = selector
  }

  getByTestId(testId: string): Locator {
    return new Locator(this.#app, { testId, parent: this.#selector })
  }

  getByText(text: string): Locator {
    return new Locator(this.#app, { text, parent: this.#selector })
  }

  getByType(type: string): Locator {
    return new Locator(this.#app, { type, parent: this.#selector })
  }

  async all(): Promise<AutomationTreeNode[]> {
    return collect(await this.#app.backend.getTree(), this.#selector)
  }

  async count(): Promise<number> {
    return (await this.all()).length
  }

  async element(): Promise<AutomationTreeNode> {
    const found = await this.all()
    if (found.length === 0) {
      throw new AutomationError("NotFound", "Locator did not match any element")
    }
    if (found.length > 1) {
      throw new AutomationError("Ambiguous", `Locator matched ${found.length} elements`)
    }
    const node = found[0]
    if (node === undefined) throw new Error("Locator result disappeared")
    return node
  }

  async bounds(): Promise<ElementBounds> {
    const node = await this.element()
    if (node.bounds !== undefined) return node.bounds
    const bounds = await this.#app.backend.getBounds(node.id)
    if (bounds === null) {
      throw new AutomationError("NotFound", "Element has no painted bounds")
    }
    return bounds
  }

  async click(): Promise<void> {
    const bounds = await this.bounds()
    await this.#app.backend.click(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    )
  }

  async fill(text: string): Promise<void> {
    const node = await this.element()
    const selectAll = process.platform === "darwin" ? "cmd-a" : "ctrl-a"
    const replacement = text.length === 0 ? "backspace" : toKeystrokes(text)
    await this.#app.backend.keystrokes(node.id, `${selectAll} ${replacement}`)
  }

  async press(key: string): Promise<void> {
    const node = await this.element()
    await this.#app.backend.keystrokes(node.id, key)
  }

  async textContent(): Promise<string> {
    return (await this.element()).text ?? ""
  }

  async waitFor(options: { timeoutMs?: number } = {}): Promise<AutomationTreeNode> {
    const timeoutMs = options.timeoutMs ?? 5000
    const started = Date.now()
    for (;;) {
      const found = await this.all()
      if (found.length === 1) {
        const node = found[0]
        if (node !== undefined) return node
      }
      if (Date.now() - started >= timeoutMs) {
        const code: AutomationErrorCode = found.length === 0 ? "Timeout" : "Ambiguous"
        throw new AutomationError(code, `waitFor timed out after ${timeoutMs}ms`)
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 16))
    }
  }
}

export class App {
  readonly backend: AutomationBackend
  readonly clock: {
    pause: () => Promise<number>
    set: (nowMs: number) => Promise<number>
    fastForward: (deltaMs: number) => Promise<number>
    resume: () => Promise<number>
  }

  constructor(backend: AutomationBackend) {
    this.backend = backend
    this.clock = {
      pause: async () => await backend.clockPause(),
      set: async (nowMs) => await backend.clockSet(nowMs),
      fastForward: async (deltaMs) => await backend.clockFastForward(deltaMs),
      resume: async () => await backend.clockResume(),
    }
  }

  getByTestId(testId: string): Locator {
    return new Locator(this, { testId })
  }

  getByText(text: string): Locator {
    return new Locator(this, { text })
  }

  getByType(type: string): Locator {
    return new Locator(this, { type })
  }

  async screenshot(options: { path: string }): Promise<string> {
    await this.backend.screenshot(options.path)
    return options.path
  }

  async close(): Promise<void> {
    await this.backend.close()
  }
}

export function createTestApp(renderer: TestRenderer): App {
  return new App(new InProcessAutomationBackend(renderer))
}
