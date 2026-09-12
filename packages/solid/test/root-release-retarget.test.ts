import type { EventPayload } from "@gpuix/native"
import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { createElement, insert, setProp } from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createRoot } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

class BoundsRenderer extends FakeRenderer {
  readonly bounds = new Map<number, number[]>()

  getElementBounds(elementId: number): number[] | null {
    return this.bounds.get(elementId) ?? null
  }
}

function element(): HostElementNode {
  const node = createElement("div")
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

function pointerEvent(eventType: "mouseDown" | "mouseUp", elementId: number): EventPayload {
  // SAFETY: this regression exercises the exact pointer fields consumed by the root relay.
  return { eventType, elementId, x: 10, y: 10, button: 0 } as EventPayload
}

describe("root release retargeting", () => {
  it("does not click replacement content with a duplicate root mouse-up", () => {
    const renderer = new BoundsRenderer()
    const root = createRoot(renderer)
    const [showFirst, setShowFirst] = createSignal(true)
    let shell: HostElementNode | undefined
    let first: HostElementNode | undefined
    let replacement: HostElementNode | undefined
    let firstClicks = 0
    let replacementClicks = 0

    root.render(() => {
      const nextShell = element()
      shell = nextShell
      setProp(nextShell, "style", { width: 100, height: 40 })
      insert(nextShell, () => {
        if (showFirst()) {
          const node = element()
          first = node
          setProp(node, "style", { width: 20, height: 20 })
          setProp(node, "onClick", () => {
            firstClicks += 1
            setShowFirst(false)
          })
          return node
        }

        const node = element()
        replacement = node
        setProp(node, "style", { width: 20, height: 20 })
        setProp(node, "onClick", () => {
          replacementClicks += 1
        })
        return node
      })
      return nextShell
    })

    if (!shell || !first) throw new Error("Expected initial retained click target")
    renderer.bounds.set(shell.id, [0, 0, 100, 40])
    renderer.bounds.set(first.id, [0, 0, 20, 20])

    expect(root.dispatch(pointerEvent("mouseDown", first.id))).toBe(true)
    expect(root.dispatch(pointerEvent("mouseUp", first.id))).toBe(true)
    expect(firstClicks).toBe(1)
    expect(replacement).toBeDefined()

    if (!replacement) throw new Error("Expected replacement click target")
    renderer.bounds.delete(first.id)
    renderer.bounds.set(replacement.id, [0, 0, 20, 20])

    expect(root.dispatch(pointerEvent("mouseUp", shell.id))).toBe(true)
    expect(replacementClicks).toBe(0)

    root.unmount()
  })
})
