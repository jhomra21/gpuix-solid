import type { EventPayload } from "@gpuix/native"
import { describe, expect, it } from "vitest"
import { createElement, insertNode, setProp } from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native window pointer drag parity", () => {
  nativeIt("delivers a retained pointer drag to window listeners", () => {
    const testRoot = createTestRoot(400, 120)
    let dragOwner: HostElementNode | undefined
    const deltas: number[] = []

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 120 })

      const owner = createElement("div")
      if (owner.kind !== "element") throw new TypeError("Expected retained drag owner")
      dragOwner = owner
      setProp(owner, "style", { width: 200, height: 60 })
      setProp(owner, "onPointerDown", (event: EventPayload) => {
        const startX = event.x ?? 0
        const move = (next: PointerEvent) => {
          deltas.push(next.clientX - startX)
        }
        const up = () => {
          window.removeEventListener("pointermove", move, true)
          window.removeEventListener("pointerup", up, true)
        }
        window.addEventListener("pointermove", move, true)
        window.addEventListener("pointerup", up, true)
      })
      insertNode(root, owner)
      return root
    })

    const bounds = dragOwner?.getBoundingClientRect()
    if (!bounds) throw new Error("Expected retained drag bounds")
    const startX = bounds.left + bounds.width / 2
    const startY = bounds.top + bounds.height / 2

    testRoot.renderer.nativeSimulateMouseDown(startX, startY, 0)
    testRoot.renderer.nativeSimulateMouseMove(startX + 40, startY, 0)
    testRoot.renderer.nativeSimulateMouseUp(startX + 40, startY, 0)

    expect(deltas).toContain(40)
    testRoot.unmount()
  })
})
