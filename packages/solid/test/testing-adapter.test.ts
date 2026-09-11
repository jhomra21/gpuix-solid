import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import {
  createElement,
  createTextNode,
  insert,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import {
  TestRenderer,
  createTestRoot,
  hasNativeTestRenderer,
} from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

describe("native TestRenderer adapter", () => {
  it("loads safely when native test support is unavailable", () => {
    if (hasNativeTestRenderer) return
    expect(() => new TestRenderer()).toThrow("Native TestGpuixRenderer not available")
  })

  nativeIt("renders and inspects the real native retained tree", () => {
    const { renderer, render, unmount } = createTestRoot()

    render(() => {
      const root = createElement("div")
      const text = createTextNode("Solid native test renderer")
      insertNode(root, text)
      return root
    })

    expect(renderer.getRoot()?.type).toBe("div")
    expect(renderer.getAllText()).toContain("Solid native test renderer")
    expect(renderer.findByType("div")).toHaveLength(1)
    expect(renderer.toJSON()).not.toBeNull()

    unmount()
  })

  nativeIt("reports the granted native window size", () => {
    const { renderer, unmount } = createTestRoot(320, 200)

    const size = renderer.getWindowSize()
    expect(size.width).toBeGreaterThan(0)
    expect(size.height).toBeGreaterThan(0)
    expect(size).not.toEqual({ width: 800, height: 600 })

    unmount()
  })

  nativeIt("routes simulated GPUI clicks through the root-owned Solid event registry", () => {
    const { renderer, render, unmount } = createTestRoot()
    let clicks = 0

    render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 240, height: 120 })
      setProp(root, "onClick", () => {
        clicks++
      })
      return root
    })

    renderer.nativeSimulateClick(20, 20)
    expect(clicks).toBe(1)

    unmount()
  })

  nativeIt("flushes pointer-down remounts before the physical click release", () => {
    const { renderer, render, unmount } = createTestRoot(240, 120)
    const [generation, setGeneration] = createSignal(0)
    let pointerDowns = 0
    let pointerUps = 0

    render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 240, height: 120 })
      insert(root, () => {
        void generation()
        const owner = createElement("div")
        setProp(owner, "style", { width: 120, height: 60 })
        setProp(owner, "onPointerDown", () => {
          pointerDowns += 1
          setGeneration((value) => value + 1)
        })
        setProp(owner, "onPointerUp", () => {
          pointerUps += 1
        })
        return owner
      })
      return root
    })

    renderer.nativeSimulateClick(40, 20)

    expect(generation()).toBe(1)
    expect(pointerDowns).toBe(1)
    expect(pointerUps).toBe(1)
    unmount()
  })
})
