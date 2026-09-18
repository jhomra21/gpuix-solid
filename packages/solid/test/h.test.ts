import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { h, makeH } from "../src/h.js"
import { createRoot } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

describe("hyperscript authoring", () => {
  it("creates host nodes and keeps accessor props and children reactive", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const [active, setActive] = createSignal(false)

    const node = h(
      "div",
      {
        class: () => active()
          ? "flex px-4 bg-red-500"
          : "flex px-2 bg-blue-500",
        testId: "hyperscript-root",
      },
      () => active() ? "active" : "idle",
    )

    root.render(() => node)

    expect(node.style.display).toBe("flex")
    expect(node.style.paddingLeft).toBe(8)
    expect(node.style.paddingRight).toBe(8)
    expect(node.style.backgroundColor).toBe("#3b82f6")
    expect(node.children).toHaveLength(1)
    expect(node.children[0]?.kind).toBe("text")
    if (node.children[0]?.kind !== "text") throw new Error("Expected hyperscript text child")
    expect(node.children[0].text).toBe("idle")

    setActive(true)
    root.flush()

    expect(node.style.paddingLeft).toBe(16)
    expect(node.style.paddingRight).toBe(16)
    expect(node.style.backgroundColor).toBe("#ef4444")
    expect(node.children).toHaveLength(1)
    expect(node.children[0]?.kind).toBe("text")
    if (node.children[0]?.kind !== "text") throw new Error("Expected reactive hyperscript text child")
    expect(node.children[0].text).toBe("active")

    root.unmount()
  })

  it("keeps event handlers as handlers instead of invoking them as accessors", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    let clicks = 0
    const localH = makeH()

    const node = localH("button", {
      onClick: () => {
        clicks += 1
      },
    }, "Press")

    root.render(() => node)
    expect(clicks).toBe(0)
    expect(node.events.has("click")).toBe(true)

    root.dispatch({
      eventType: "click",
      elementId: node.id,
      x: 4,
      y: 4,
      button: 0,
    })

    expect(clicks).toBe(1)
    root.unmount()
  })
})
