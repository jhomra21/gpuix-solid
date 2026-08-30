import { describe, expect, it } from "vitest"
import type { EventPayload } from "../src/host/types.js"
import { findRanges } from "../src/hooks/use-text-search.js"
import {
  createElement,
  insert,
  insertNode,
  setProp,
} from "../src/host/universal.js"
import { createTestRoot, hasNativeTestRenderer } from "../src/testing.js"

const nativeIt = hasNativeTestRenderer ? it : it.skip

function matched(renderer: { getPaintedHighlights(): Array<{ text: string; start: number; end: number }> }): string[] {
  return renderer.getPaintedHighlights().map((hit) => hit.text.slice(hit.start, hit.end))
}

describe("text search parity", () => {
  it("matches the published GPUIX Unicode and whole-word contract", () => {
    expect(findRanges({ text: "Fox fox FOX", query: "fox" })).toEqual([[0, 3], [4, 7], [8, 11]])
    expect(findRanges({ text: "Fox fox FOX", query: "fox", caseSensitive: true })).toEqual([[4, 7]])
    expect(findRanges({ text: "cat scatter cat_ cat", query: "cat", wholeWord: true })).toEqual([[0, 3], [17, 20]])
    expect(findRanges({ text: "İx ix", query: "x" })).toEqual([[1, 2], [4, 5]])
    expect(findRanges({ text: "a👋b 👋", query: "👋" })).toEqual([[1, 3], [5, 7]])
  })

  nativeIt("paints a descendant query through the real GPUI highlight pipeline", () => {
    const { renderer, render, unmount } = createTestRoot(420, 180)

    render(() => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 140, padding: 20 })
      setProp(root, "highlight", { query: "quick" })
      const text = createElement("text")
      setProp(text, "style", { color: "#ffffff", fontSize: 20 })
      insert(text, "the quick brown fox")
      insertNode(root, text)
      return root
    })

    const hits = renderer.getPaintedHighlights()
    expect(matched(renderer)).toEqual(["quick"])
    expect(hits[0]?.rects[0]?.width).toBeGreaterThan(0)
    expect(hits[0]?.rects[0]?.height).toBeGreaterThan(0)

    unmount()
  })

  nativeIt("reports changed match counts through onHighlight", () => {
    const { renderer, render, unmount } = createTestRoot(420, 180)
    const counts: number[] = []

    const app = (query: string) => {
      const root = createElement("div")
      setProp(root, "style", { width: 400, height: 140, padding: 20 })
      setProp(root, "highlight", { query })
      setProp(root, "onHighlight", (event: EventPayload) => counts.push(event.matchCount ?? -1))
      const text = createElement("text")
      setProp(text, "style", { color: "#ffffff", fontSize: 20 })
      insert(text, "fox fox dog")
      insertNode(root, text)
      return root
    }

    render(() => app("fox"))
    renderer.dispatchNativeEvents()
    expect(counts).toEqual([2])

    render(() => app("fox"))
    renderer.dispatchNativeEvents()
    expect(counts).toEqual([2])

    render(() => app("dog"))
    renderer.dispatchNativeEvents()
    expect(counts).toEqual([2, 1])

    unmount()
  })
})
