import { describe, expect, it } from "vitest"
import { createElement, insertNode, setProp } from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import type { EventPayload } from "../src/host/types.js"
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

describe("root semantic drag retargeting", () => {
  it("resolves root-carried move and release onto the semantic drop target", () => {
    const renderer = new BoundsRenderer()
    const root = createRoot(renderer)
    let shell: HostElementNode | undefined
    let source: HostElementNode | undefined
    let target: HostElementNode | undefined
    const events: string[] = []
    let dropped: unknown

    root.render(() => {
      const nextShell = element()
      shell = nextShell
      setProp(nextShell, "style", { width: 500, height: 180 })

      const nextSource = element()
      source = nextSource
      setProp(nextSource, "dragData", { clipId: "clip-1" })
      setProp(nextSource, "style", { width: 120, height: 80 })
      setProp(nextSource, "onClick", () => events.push("click"))
      setProp(nextSource, "onDragStart", () => events.push("start"))
      setProp(nextSource, "onDragEnd", () => events.push("end"))

      const nextTarget = element()
      target = nextTarget
      setProp(nextTarget, "style", { width: 140, height: 80 })
      setProp(nextTarget, "onDragOver", () => {
        if (!events.includes("over")) events.push("over")
      })
      setProp(nextTarget, "onDrop", (event: EventPayload) => {
        dropped = event.dragData
        events.push("drop")
      })

      insertNode(nextShell, nextSource)
      insertNode(nextShell, nextTarget)
      return nextShell
    })

    if (!shell || !source || !target) throw new Error("Expected drag fixture nodes")

    renderer.bounds.set(shell.id, [0, 0, 500, 180])
    renderer.bounds.set(source.id, [20, 20, 120, 80])
    renderer.bounds.set(target.id, [220, 20, 140, 80])

    expect(root.dispatch({
      eventType: "mouseDown",
      elementId: source.id,
      x: 60,
      y: 60,
      button: 0,
    })).toBe(true)

    expect(root.dispatch({
      eventType: "mouseMove",
      elementId: shell.id,
      x: 260,
      y: 60,
      pressedButton: 0,
    })).toBe(true)

    expect(root.dispatch({
      eventType: "mouseUp",
      elementId: shell.id,
      x: 260,
      y: 60,
      button: 0,
    })).toBe(true)

    expect(dropped).toEqual({ clipId: "clip-1" })
    expect(events).toEqual(["start", "over", "drop", "end"])
    expect(events).not.toContain("click")

    root.unmount()
  })
})
