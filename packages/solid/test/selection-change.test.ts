import { describe, expect, it } from "vitest"
import { createTextSelection } from "../src/primitives/create-text-selection.js"
import { createElement } from "../src/host/universal.js"
import { createRoot } from "../src/root.js"
import { render, resetRender } from "../src/runtime.js"
import { FakeRenderer } from "./fake-renderer.js"

function element() {
  const node = createElement("div")
  if (node.kind !== "element") throw new TypeError("Expected GPUIX host element")
  return node
}

describe("window text selection", () => {
  it("routes only the current native selection lease and disables it on unmount", () => {
    const renderer = new FakeRenderer()
    const values: Array<string | null> = []
    const root = createRoot(renderer, {
      onSelectionChange: (event) => values.push(event.value ?? null),
    })

    root.render(() => element())
    const firstId = renderer.windowSelectionChanges.at(-1)?.[1]
    if (firstId === undefined) throw new Error("Expected initial selection event id")
    expect(renderer.windowSelectionChanges.at(-1)).toEqual([true, firstId])

    root.render(() => element())
    const secondId = renderer.windowSelectionChanges.at(-1)?.[1]
    if (secondId === undefined) throw new Error("Expected remounted selection event id")
    expect(secondId).toBeGreaterThan(firstId)

    expect(root.dispatch({ elementId: firstId, eventType: "selectionChange", value: "stale" })).toBe(false)
    expect(root.dispatch({ elementId: secondId, eventType: "selectionChange", value: "hello" })).toBe(true)
    expect(root.dispatch({ elementId: secondId, eventType: "selectionChange" })).toBe(true)
    expect(values).toEqual(["hello", null])

    root.unmount()
    expect(renderer.windowSelectionChanges.at(-1)).toEqual([false, secondId])
  })

  it("exposes selection as a Solid accessor instead of React-style component state", () => {
    const renderer = new FakeRenderer()
    let selectedText: (() => string | null) | undefined

    const handle = render(() => {
      const selection = createTextSelection()
      selectedText = selection.text
      return element()
    }, { renderer })

    const eventId = renderer.windowSelectionChanges.at(-1)?.[1]
    if (eventId === undefined || !selectedText) throw new Error("Expected reactive selection subscription")
    expect(renderer.windowSelectionChanges.at(-1)).toEqual([true, eventId])
    expect(selectedText()).toBeNull()

    expect(handle.root.dispatch({ elementId: eventId, eventType: "selectionChange", value: "solid" })).toBe(true)
    expect(selectedText()).toBe("solid")

    handle.unmount()
    resetRender()
  })
})
