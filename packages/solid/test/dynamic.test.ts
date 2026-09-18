import { createSignal } from "solid-js"
import { describe, expect, it } from "vitest"
import { Dynamic } from "../src/components/dynamic.js"
import { createRoot } from "../src/root.js"
import { FakeRenderer } from "./fake-renderer.js"

describe("Dynamic", () => {
  it("replaces the intrinsic host element when component identity changes", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const [tag, setTag] = createSignal<"div" | "text">("div")

    root.render(() => Dynamic({
      get component() {
        return tag()
      },
      testId: "dynamic-host",
      children: "Dynamic child",
    }))

    const initialMutations = renderer.batches.flat()
    expect(initialMutations.some((mutation) =>
      mutation[0] === "createElement" && mutation[2] === "div"
    )).toBe(true)

    const batchStart = renderer.batches.length
    setTag("text")
    root.flush()

    const updates = renderer.batches.slice(batchStart).flat()
    expect(updates.some((mutation) =>
      mutation[0] === "createElement" && mutation[2] === "text"
    )).toBe(true)
    expect(updates.some((mutation) => mutation[0] === "destroyElement")).toBe(true)

    root.unmount()
  })

  it("updates intrinsic props without replacing the host node", () => {
    const renderer = new FakeRenderer()
    const root = createRoot(renderer)
    const [title, setTitle] = createSignal("before")

    root.render(() => Dynamic({
      component: "div",
      get title() {
        return title()
      },
      children: "Stable child",
    }))

    const initialCreateCount = renderer.batches
      .flat()
      .filter((mutation) => mutation[0] === "createElement")
      .length
    const batchStart = renderer.batches.length

    setTitle("after")
    root.flush()

    const updates = renderer.batches.slice(batchStart).flat()
    expect(updates.some((mutation) =>
      mutation[0] === "setCustomProp"
      && mutation[2] === "title"
      && mutation[3] === "after"
    )).toBe(true)
    expect(renderer.batches
      .flat()
      .filter((mutation) => mutation[0] === "createElement")
      .length
    ).toBe(initialCreateCount)

    root.unmount()
  })
})
