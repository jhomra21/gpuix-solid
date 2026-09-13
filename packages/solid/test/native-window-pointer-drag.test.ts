import type { EventPayload } from "@gpuix/native"
import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { createElement, insert, insertNode, setProp } from "../src/host/universal.js"
import type { HostElementNode } from "../src/host/nodes.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native window pointer drag parity", () => {
  nativeIt("delivers a retained pointer drag to window listeners", () => {
    const testRoot = createTestRoot(400, 120)
    let dragOwner: HostElementNode | undefined
    const deltas: number[] = []
    let releases = 0

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
          releases += 1
        }
        window.addEventListener("pointermove", move, true)
        window.addEventListener("pointerup", up, true)
        queueMicrotask(() => {
          window.removeEventListener("pointermove", move, true)
          window.removeEventListener("pointerup", up, true)
        })
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

    expect(deltas).toEqual([40])
    expect(releases).toBe(1)
    testRoot.unmount()
  })

  nativeIt("delivers window lifecycle once after the pressed node remounts during drag", () => {
    const testRoot = createTestRoot(400, 120)
    const [generation, setGeneration] = createSignal(0)
    let dragOwner: HostElementNode | undefined
    const deltas: number[] = []
    let releases = 0
    let moveListener: ((event: PointerEvent) => void) | undefined
    let upListener: (() => void) | undefined

    testRoot.render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 120 })

      insert(root, () => {
        void generation()
        const owner = createElement("div")
        if (owner.kind !== "element") throw new TypeError("Expected remounting drag owner")
        dragOwner = owner
        setProp(owner, "style", { width: 200, height: 60 })
        setProp(owner, "onPointerDown", (event: EventPayload) => {
          const startX = event.x ?? 0
          const move = (next: PointerEvent) => {
            deltas.push(next.clientX - startX)
            if (deltas.length === 1) setGeneration((value) => value + 1)
          }
          const up = () => {
            releases += 1
          }
          moveListener = move
          upListener = up
          window.addEventListener("pointermove", move, true)
          window.addEventListener("pointerup", up, true)
        })
        return owner
      })
      return root
    })

    const bounds = dragOwner?.getBoundingClientRect()
    if (!bounds) throw new Error("Expected remounting drag bounds")
    const startX = bounds.left + bounds.width / 2
    const startY = bounds.top + bounds.height / 2

    testRoot.renderer.nativeSimulateMouseDown(startX, startY, 0)
    testRoot.renderer.nativeSimulateMouseMove(startX + 40, startY, 0)
    expect(generation()).toBe(1)
    testRoot.renderer.nativeSimulateMouseMove(startX + 60, startY, 0)
    testRoot.renderer.nativeSimulateMouseUp(startX + 60, startY, 0)

    if (moveListener) window.removeEventListener("pointermove", moveListener, true)
    if (upListener) window.removeEventListener("pointerup", upListener, true)
    expect(deltas).toEqual([40, 60])
    expect(releases).toBe(1)
    testRoot.unmount()
  })
})
