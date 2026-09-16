import { describe, expect, it } from "vitest"
import { createElement } from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createRoot } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

function element(): HostElementNode {
  const node = createElement("div")
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("synthetic pointer relay bursts", () => {
  it("emits one browser-global pointermove for duplicate native carriers", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = element()
    root.render(() => node)

    let moves = 0
    const onPointerMove = () => { moves += 1 }
    window.addEventListener("pointermove", onPointerMove)

    try {
      const event = { elementId: node.id, eventType: "mouseMove", x: 42, y: 24, button: 0 } as const
      expect(root.dispatch(event)).toBe(true)
      expect(root.dispatch(event)).toBe(true)
      expect(moves).toBe(1)
    } finally {
      window.removeEventListener("pointermove", onPointerMove)
      root.unmount()
    }
  })

  it("does not suppress an authored pointermove at the same coordinates", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const node = element()
    let localMoves = 0
    let globalMoves = 0

    node.events.set("pointerMove", () => { localMoves += 1 })
    root.render(() => node)

    const onPointerMove = () => { globalMoves += 1 }
    window.addEventListener("pointermove", onPointerMove)

    try {
      const event = { elementId: node.id, eventType: "mouseMove", x: 42, y: 24, button: 0 } as const
      expect(root.dispatch(event)).toBe(true)
      expect(root.dispatch(event)).toBe(true)
      expect(localMoves).toBe(2)
      expect(globalMoves).toBe(2)
    } finally {
      window.removeEventListener("pointermove", onPointerMove)
      root.unmount()
    }
  })
})