import { describe, expect, it } from "vitest"
import {
  TestRenderer,
  createTestRoot,
  hasNativeTestRenderer,
} from "../src/testing.js"
import {
  createElement,
  createTextNode,
  insertNode,
  setProp,
} from "../src/host/universal.js"

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

    expect(renderer.getWindowSize()).toEqual({ width: 320, height: 200 })

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
})
