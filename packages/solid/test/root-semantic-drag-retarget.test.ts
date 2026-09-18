import { describe, expect, it, vi } from "vitest"
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
    let dropped: EventPayload["dragData"]

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

  it("resolves captured source move and release onto the semantic drop target", () => {
    const renderer = new BoundsRenderer()
    const root = createRoot(renderer)
    let shell: HostElementNode | undefined
    let source: HostElementNode | undefined
    let target: HostElementNode | undefined
    const events: string[] = []
    let dropped: EventPayload["dragData"]

    root.render(() => {
      const nextShell = element()
      shell = nextShell
      setProp(nextShell, "style", { width: 500, height: 180 })

      const nextSource = element()
      source = nextSource
      setProp(nextSource, "dragData", { clipId: "clip-2" })
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

    if (!shell || !source || !target) throw new Error("Expected captured drag fixture nodes")

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
      elementId: source.id,
      x: 260,
      y: 60,
      pressedButton: 0,
    })).toBe(true)

    expect(root.dispatch({
      eventType: "mouseUp",
      elementId: source.id,
      x: 260,
      y: 60,
      button: 0,
    })).toBe(true)

    expect(dropped).toEqual({ clipId: "clip-2" })
    expect(events).toEqual(["start", "over", "drop", "end"])
    expect(events).not.toContain("click")

    root.unmount()
  })

  it("returns a rejected drag preview to its source before removing it", () => {
    vi.useFakeTimers()
    const renderer = new BoundsRenderer()
    const root = createRoot(renderer)

    try {
      let shell: HostElementNode | undefined
      let source: HostElementNode | undefined
      let target: HostElementNode | undefined

      root.render(() => {
        const nextShell = element()
        shell = nextShell
        setProp(nextShell, "style", { width: 500, height: 180 })

        const nextSource = element()
        source = nextSource
        setProp(nextSource, "dragData", { clipId: "clip-return" })
        setProp(nextSource, "style", { width: 120, height: 80 })

        const nextTarget = element()
        target = nextTarget
        setProp(nextTarget, "style", { width: 140, height: 80 })
        setProp(nextTarget, "onDrop", () => undefined)

        insertNode(nextShell, nextSource)
        insertNode(nextShell, nextTarget)
        return nextShell
      })

      if (!shell || !source || !target) throw new Error("Expected rejected drag fixture nodes")

      renderer.bounds.set(shell.id, [0, 0, 500, 180])
      renderer.bounds.set(source.id, [20, 20, 120, 80])
      renderer.bounds.set(target.id, [220, 20, 140, 80])

      root.dispatch({
        eventType: "mouseDown",
        elementId: source.id,
        x: 60,
        y: 60,
        button: 0,
      })
      root.dispatch({
        eventType: "mouseMove",
        elementId: shell.id,
        x: 400,
        y: 120,
        pressedButton: 0,
      })

      const previewMutation = renderer.batches
        .flat()
        .find((mutation) =>
          mutation[0] === "setCustomProp"
          && mutation[2] === "testId"
          && mutation[3] === "gpuix-drag-preview")
      const previewId = Number(previewMutation?.[1])
      if (!Number.isInteger(previewId)) {
        throw new Error("Expected semantic drag preview")
      }
      const releaseBatchStart = renderer.batches.length

      root.dispatch({
        eventType: "mouseUp",
        elementId: shell.id,
        x: 400,
        y: 120,
        button: 0,
      })

      const releaseMutations = renderer.batches.slice(releaseBatchStart).flat()
      expect(releaseMutations).toContainEqual([
        "setCustomProp",
        previewId,
        "motion",
        {
          initial: { left: 360, top: 80 },
          animate: { left: 20, top: 20 },
          transition: { duration: 0.15, ease: "easeOut" },
        },
      ])
      expect(releaseMutations.some((mutation) =>
        mutation[0] === "destroyElement" && mutation[1] === previewId
      )).toBe(false)

      vi.advanceTimersByTime(149)
      expect(renderer.batches.slice(releaseBatchStart).flat().some((mutation) =>
        mutation[0] === "destroyElement" && mutation[1] === previewId
      )).toBe(false)

      vi.advanceTimersByTime(1)
      expect(renderer.batches.slice(releaseBatchStart).flat()).toContainEqual([
        "destroyElement",
        previewId,
      ])
    } finally {
      root.unmount()
      vi.useRealTimers()
    }
  })

})

