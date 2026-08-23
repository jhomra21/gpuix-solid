import { describe, expect, it } from "vitest"
import { createRoot } from "../src/runtime.js"
import { createElement, setProp } from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { FakeRenderer } from "./fake-renderer.js"

function element(): HostElementNode {
  const node = createElement("div")
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("root lifecycle", () => {
  it("replaces the mounted native root before mounting the next tree", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const first = element()
    const second = element()
    setProp(first, "testId", "first")
    setProp(second, "testId", "second")

    root.render(() => first)
    root.render(() => second)

    expect(renderer.batches).toEqual([
      [
        ["createElement", 1, "div"],
        ["setCustomPropValue", 1, "testId", "first"],
        ["setRoot", 1],
      ],
      [["destroyElement", 1]],
      [
        ["createElement", 2, "div"],
        ["setCustomPropValue", 2, "testId", "second"],
        ["setRoot", 2],
      ],
    ])
  })

  it("deactivates events from a replaced root", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const first = element()
    const second = element()
    let clicks = 0
    const click = () => { clicks += 1 }
    setProp(first, "onClick", click)

    root.render(() => first)
    root.dispatch({ elementId: first.id, eventType: "click" })
    expect(clicks).toBe(1)

    root.render(() => second)
    root.dispatch({ elementId: first.id, eventType: "click" })
    expect(clicks).toBe(1)
  })

  it("keeps renderer ids and event registries isolated across roots", () => {
    const rendererA = new FakeRenderer()
    const rendererB = new FakeRenderer()
    const rootA = createRoot(rendererA)
    const rootB = createRoot(rendererB)
    const nodeA = element()
    const nodeB = element()
    let clicksA = 0
    let clicksB = 0
    setProp(nodeA, "onClick", () => { clicksA += 1 })
    setProp(nodeB, "onClick", () => { clicksB += 1 })

    rootA.render(() => nodeA)
    rootB.render(() => nodeB)

    expect(nodeA.id).toBe(1)
    expect(nodeB.id).toBe(1)

    rootA.dispatch({ elementId: 1, eventType: "click" })
    expect(clicksA).toBe(1)
    expect(clicksB).toBe(0)

    rootB.dispatch({ elementId: 1, eventType: "click" })
    expect(clicksA).toBe(1)
    expect(clicksB).toBe(1)
  })

  it("flushes mutations from flushSync even when the callback throws", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = element()
    root.render(() => node)

    expect(() =>
      root.flushSync(() => {
        setProp(node, "testId", "after-error")
        throw new Error("expected failure")
      }),
    ).toThrow("expected failure")

    expect(renderer.batches.at(-1)).toEqual([
      ["setCustomPropValue", 1, "testId", "after-error"],
    ])
  })

  it("destroys the mounted native root on unmount", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = element()
    root.render(() => node)

    root.unmount()

    expect(renderer.batches.at(-1)).toEqual([["destroyElement", 1]])
  })
})
