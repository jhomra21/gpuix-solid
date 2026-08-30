import type { EventPayload } from "@gpuix/native"
import { createRenderEffect, createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import {
  App,
  AutomationError,
  type AutomationBackend,
  type AutomationTreeNode,
  type ElementBounds,
  createTestApp,
} from "../src/automation.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createElement, insert, insertNode, setProp } from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

type PointerCall = readonly [
  type: "move" | "down" | "up" | "wheel",
  x: number,
  y: number,
  first?: number,
  second?: number,
  modifiers?: string,
]

class RecordingBackend implements AutomationBackend {
  tree: AutomationTreeNode | null
  readonly clicks: Array<readonly [number, number, number | undefined, string | undefined]> = []
  readonly pointer: PointerCall[] = []
  readonly keys: Array<[number, string]> = []
  readonly screenshots: string[] = []
  nowMs = 0

  constructor(tree: AutomationTreeNode | null) {
    this.tree = tree
  }

  getTree(): AutomationTreeNode | null {
    return this.tree
  }

  getBounds(elementId: number): ElementBounds | null {
    const stack = this.tree === null ? [] : [this.tree]
    while (stack.length > 0) {
      const node = stack.pop()
      if (node === undefined) continue
      if (node.id === elementId) return node.bounds ?? null
      stack.push(...(node.children ?? []))
    }
    return null
  }

  click(x: number, y: number, button?: number, modifiers?: string): void {
    this.clicks.push([x, y, button, modifiers])
  }

  mouseMove(x: number, y: number, pressedButton?: number, modifiers?: string): void {
    this.pointer.push(["move", x, y, pressedButton, undefined, modifiers])
  }

  mouseDown(x: number, y: number, button?: number, modifiers?: string): void {
    this.pointer.push(["down", x, y, button, undefined, modifiers])
  }

  mouseUp(x: number, y: number, button?: number, modifiers?: string): void {
    this.pointer.push(["up", x, y, button, undefined, modifiers])
  }

  scrollWheel(
    x: number,
    y: number,
    deltaX: number,
    deltaY: number,
    modifiers?: string,
  ): void {
    this.pointer.push(["wheel", x, y, deltaX, deltaY, modifiers])
  }

  keystrokes(elementId: number, keys: string): void {
    this.keys.push([elementId, keys])
  }

  screenshot(path: string): void {
    this.screenshots.push(path)
  }

  clockPause(): number {
    return this.nowMs
  }

  clockSet(nowMs: number): number {
    this.nowMs = nowMs
    return this.nowMs
  }

  clockFastForward(deltaMs: number): number {
    this.nowMs += deltaMs
    return this.nowMs
  }

  clockResume(): number {
    return this.nowMs
  }

  close(): void {}
}

const tree: AutomationTreeNode = {
  id: 1,
  type: "div",
  testId: "panel",
  children: [
    {
      id: 2,
      type: "input",
      testId: "search",
      bounds: { x: 10, y: 20, width: 100, height: 30 },
    },
    { id: 3, type: "text", text: "Alpha result" },
    {
      id: 4,
      type: "div",
      testId: "list",
      bounds: { x: 200, y: 40, width: 120, height: 80 },
      children: [
        { id: 5, type: "text", text: "Alpha nested" },
        { id: 6, type: "text", text: "Beta nested" },
      ],
    },
  ],
}

describe("Playwright-like locator API", () => {
  it("queries by test id, type, text, and nested scope", async () => {
    const app = new App(new RecordingBackend(tree))

    expect(await app.getByTestId("search").count()).toBe(1)
    expect((await app.getByType("input").element()).id).toBe(2)
    expect(await app.getByTestId("list").getByText("Beta").textContent()).toBe("Beta nested")
    expect(await app.getByTestId("panel").getByType("text").count()).toBe(3)
  })

  it("returns descendant text content for matched containers", async () => {
    const app = new App(new RecordingBackend(tree))

    expect(await app.getByTestId("list").textContent()).toBe("Alpha nestedBeta nested")
  })

  it("is strict for missing and ambiguous locators", async () => {
    const app = new App(new RecordingBackend(tree))

    await expect(app.getByTestId("missing").element()).rejects.toMatchObject({
      name: "AutomationError",
      code: "NotFound",
    })
    await expect(app.getByText("Alpha").element()).rejects.toMatchObject({
      name: "AutomationError",
      code: "Ambiguous",
    })
  })

  it("clicks element centers and converts fill text to native keystrokes", async () => {
    const backend = new RecordingBackend(tree)
    const app = new App(backend)
    const input = app.getByTestId("search")

    await input.click()
    expect(backend.clicks).toEqual([[60, 35, undefined, undefined]])

    await input.fill("hi there")
    const selectAll = process.platform === "darwin" ? "cmd-a" : "ctrl-a"
    expect(backend.keys).toEqual([[2, `${selectAll} h i space t h e r e`]])

    await input.press("enter")
    expect(backend.keys.at(-1)).toEqual([2, "enter"])
  })

  it("drives hover, wheel, and multi-step drag through pointer primitives", async () => {
    const backend = new RecordingBackend(tree)
    const app = new App(backend)
    const input = app.getByTestId("search")
    const list = app.getByTestId("list")

    await input.hover({ modifiers: "shift" })
    await input.wheel(0, -120)
    await input.dragTo(list, { steps: 2, button: 0 })

    expect(backend.pointer).toEqual([
      ["move", 60, 35, undefined, undefined, "shift"],
      ["wheel", 60, 35, 0, -120, undefined],
      ["move", 60, 35, undefined, undefined, undefined],
      ["down", 60, 35, 0, undefined, undefined],
      ["move", 130, 57.5, 0, undefined, undefined],
      ["move", 260, 80, 0, undefined, undefined],
      ["up", 260, 80, 0, undefined, undefined],
    ])
  })

  it("forwards screenshot and clock operations through the backend", async () => {
    const backend = new RecordingBackend(tree)
    const app = new App(backend)

    expect(await app.clock.pause()).toBe(0)
    expect(await app.clock.set(100)).toBe(100)
    expect(await app.clock.fastForward(50)).toBe(150)
    expect(await app.clock.resume()).toBe(150)
    expect(await app.screenshot({ path: "/tmp/locator.png" })).toBe("/tmp/locator.png")
    expect(backend.screenshots).toEqual(["/tmp/locator.png"])
  })

  it("waits for a locator to become uniquely available", async () => {
    const backend = new RecordingBackend(null)
    const app = new App(backend)
    setTimeout(() => {
      backend.tree = tree
    }, 10)

    expect((await app.getByTestId("search").waitFor({ timeoutMs: 200 })).id).toBe(2)
  })

  it("reports a typed timeout when a locator never appears", async () => {
    const app = new App(new RecordingBackend(null))
    const pending = app.getByText("never").waitFor({ timeoutMs: 1 })
    await expect(pending).rejects.toBeInstanceOf(AutomationError)
    await expect(pending).rejects.toMatchObject({ code: "Timeout" })
  })
})

const nativeIt = hasNativeTestRenderer ? it : it.skip

function element(type: string): HostElementNode {
  const node = createElement(type)
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("native locator actions", () => {
  nativeIt("clicks, hovers, and fills through the real GPUI test renderer", async () => {
    const testRoot = createTestRoot()
    const app = createTestApp(testRoot.renderer)
    const [value, setValue] = createSignal("")
    const [clicked, setClicked] = createSignal(false)
    const [hovered, setHovered] = createSignal(false)

    testRoot.render(() => {
      const root = element("div")
      setProp(root, "style", {
        display: "flex",
        flexDirection: "column",
        width: 400,
        height: 180,
        gap: 8,
      })

      const action = element("div")
      setProp(action, "testId", "action")
      setProp(action, "style", { width: 120, height: 40 })
      setProp(action, "onClick", () => setClicked(true))
      setProp(action, "onMouseEnter", () => setHovered(true))
      insert(action, "Run")

      const input = element("input")
      setProp(input, "testId", "field")
      setProp(input, "style", { width: 300, height: 40 })
      setProp(input, "onChange", (event: EventPayload) => setValue(event.value ?? ""))
      createRenderEffect(
        () => value(),
        (next, previous) => {
          setProp(input, "value", next, previous)
        },
      )

      const clickedText = element("text")
      insert(clickedText, () => `Clicked: ${clicked() ? "yes" : "no"}`)
      const hoveredText = element("text")
      insert(hoveredText, () => `Hovered: ${hovered() ? "yes" : "no"}`)
      const valueText = element("text")
      insert(valueText, () => `Value: ${value()}`)

      insertNode(root, action)
      insertNode(root, input)
      insertNode(root, clickedText)
      insertNode(root, hoveredText)
      insertNode(root, valueText)
      return root
    })

    await app.getByTestId("action").hover()
    expect(await app.getByText("Hovered: yes").count()).toBe(1)

    await app.getByTestId("action").click()
    expect(await app.getByText("Clicked: yes").count()).toBe(1)

    await app.getByTestId("field").fill("hi")
    expect(await app.getByText("Value: hi").count()).toBe(1)
  })
})
