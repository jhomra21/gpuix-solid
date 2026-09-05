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
  click(x: number, y: number, button?: number, modifiers?: string): void | Promise<void>
  mouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void | Promise<void>
  mouseDown(x: number, y: number, button?: number, modifiers?: string): void | Promise<void>
  mouseUp(x: number, y: number, button?: number, modifiers?: string): void | Promise<void>
  scrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): void | Promise<void>
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

  click(x: number, y: number, button?: number, modifiers?: string): void {
    this.#renderer.nativeSimulateClick(x, y, button, modifiers)
  }

  mouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void {
    this.#renderer.nativeSimulateMouseMove(x, y, pressedButton, modifiers)
  }

  mouseDown(x: number, y: number, button?: number, modifiers?: string): void {
    this.#renderer.nativeSimulateMouseDown(x, y, button, modifiers)
  }

  mouseUp(x: number, y: number, button?: number, modifiers?: string): void {
    this.#renderer.nativeSimulateMouseUp(x, y, button, modifiers)
  }

  scrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): void {
    this.#renderer.nativeSimulateScrollWheel(x, y, deltaX, deltaY, modifiers)
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

function nodeTextContent(node: AutomationTreeNode): string {
  let text = node.text ?? ""
  for (const child of node.children ?? []) text += nodeTextContent(child)
  return text
}

function toKeystrokes(text: string): string {
  return [...text]
    .map((character) => {
      if (character === " ") return "space"
      if (character === "\n") return "enter"
      if (character === "\t") return "tab"
      if (character >= "A" && character <= "Z") return `shift-${character.toLowerCase()}`
      return character
    })
    .join(" ")
}

export interface Point {
  x: number
  y: number
}

export type PointTarget = Point | Locator

export interface MouseOptions {
  button?: number
  modifiers?: string
}

export interface DragOptions extends MouseOptions {
  steps?: number
  offset?: Point
}

function centerOf(bounds: ElementBounds): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
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

  async center(): Promise<Point> {
    return centerOf(await this.bounds())
  }

  async click(options: MouseOptions = {}): Promise<void> {
    const point = await this.center()
    await this.#app.backend.click(point.x, point.y, options.button, options.modifiers)
  }

  async hover(options: MouseOptions = {}): Promise<void> {
    await this.#app.mouse.move(this, options)
  }

  async wheel(deltaX: number, deltaY: number, options: MouseOptions = {}): Promise<void> {
    await this.#app.mouse.wheel(this, deltaX, deltaY, options)
  }

  async dragTo(target: PointTarget, options: DragOptions = {}): Promise<void> {
    await this.#app.mouse.drag(this, target, options)
  }

  async dragBy(dx: number, dy: number, options: DragOptions = {}): Promise<void> {
    const start = await this.center()
    const offset = options.offset ?? { x: 0, y: 0 }
    await this.#app.mouse.drag(
      this,
      { x: start.x + offset.x + dx, y: start.y + offset.y + dy },
      options,
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
    return nodeTextContent(await this.element())
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
  readonly mouse: {
    move: (target: PointTarget, options?: MouseOptions & { pressedButton?: number }) => Promise<void>
    down: (target: PointTarget, options?: MouseOptions) => Promise<void>
    up: (target: PointTarget, options?: MouseOptions) => Promise<void>
    click: (target: PointTarget, options?: MouseOptions) => Promise<void>
    wheel: (target: PointTarget, deltaX: number, deltaY: number, options?: MouseOptions) => Promise<void>
    drag: (from: PointTarget, to: PointTarget, options?: DragOptions) => Promise<void>
  }

  constructor(backend: AutomationBackend) {
    this.backend = backend
    this.mouse = {
      move: async (target, options = {}) => {
        const point = await this.#resolvePoint(target)
        await backend.mouseMove(point.x, point.y, options.pressedButton, options.modifiers)
      },
      down: async (target, options = {}) => {
        const point = await this.#resolvePoint(target)
        await backend.mouseDown(point.x, point.y, options.button, options.modifiers)
      },
      up: async (target, options = {}) => {
        const point = await this.#resolvePoint(target)
        await backend.mouseUp(point.x, point.y, options.button, options.modifiers)
      },
      click: async (target, options = {}) => {
        const point = await this.#resolvePoint(target)
        await backend.click(point.x, point.y, options.button, options.modifiers)
      },
      wheel: async (target, deltaX, deltaY, options = {}) => {
        const point = await this.#resolvePoint(target)
        await backend.scrollWheel(point.x, point.y, deltaX, deltaY, options.modifiers)
      },
      drag: async (from, to, options = {}) => {
        const offset = options.offset ?? { x: 0, y: 0 }
        const origin = await this.#resolvePoint(from)
        const start = { x: origin.x + offset.x, y: origin.y + offset.y }
        const end = await this.#resolvePoint(to)
        const button = options.button ?? 0
        const steps = Math.max(1, Math.floor(options.steps ?? 8))

        await backend.mouseMove(start.x, start.y, undefined, options.modifiers)
        await backend.mouseDown(start.x, start.y, button, options.modifiers)
        for (let step = 1; step <= steps; step += 1) {
          const progress = step / steps
          await backend.mouseMove(
            start.x + (end.x - start.x) * progress,
            start.y + (end.y - start.y) * progress,
            button,
            options.modifiers,
          )
        }
        await backend.mouseUp(end.x, end.y, button, options.modifiers)
      },
    }
    this.clock = {
      pause: async () => await backend.clockPause(),
      set: async (nowMs) => await backend.clockSet(nowMs),
      fastForward: async (deltaMs) => await backend.clockFastForward(deltaMs),
      resume: async () => await backend.clockResume(),
    }
  }

  async #resolvePoint(target: PointTarget): Promise<Point> {
    return target instanceof Locator ? await target.center() : target
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
