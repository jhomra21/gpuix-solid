import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver, useDestroyUnlinksParentBatch } from "../src/host/mutations.js"
import { FakeRenderer } from "./fake-renderer.js"

describe("MutationDriver", () => {
  it("sends one applyBatch call for a synchronous mutation burst", () => {
    const renderer = new FakeRenderer()
    const events = new EventRegistry()
    const driver = new MutationDriver(renderer, events)

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setStyle", 1, { padding: 8 })
    driver.enqueue("setRoot", 1)
    driver.flush()

    expect(renderer.batches).toHaveLength(1)
    expect(renderer.batches[0]).toHaveLength(3)
  })

  it("realizes retained DOM click activation through native mouse-up without stealing explicit mouse-up", () => {
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setEventListener", 1, "click", true)
    driver.flush()
    expect(renderer.batches[0]).toEqual([
      ["createElement", 1, "div"],
      ["setEventListener", 1, "mouseUp", true],
    ])

    driver.enqueue("setEventListener", 1, "mouseUp", true)
    driver.flush()
    expect(renderer.batches).toHaveLength(1)

    driver.enqueue("setEventListener", 1, "click", false)
    driver.flush()
    expect(renderer.batches).toHaveLength(1)

    driver.enqueue("setEventListener", 1, "mouseUp", false)
    driver.flush()
    expect(renderer.batches.at(-1)).toEqual([
      ["setEventListener", 1, "mouseUp", false],
    ])
  })

  it("keeps one semantic click source for GPUIX custom adapters", () => {
    for (const [index, type] of ["input", "textarea", "anchored", "img", "svg", "code", "diff", "markdown"].entries()) {
      const renderer = new FakeRenderer()
      const driver = new MutationDriver(renderer, new EventRegistry())
      const id = index + 1

      driver.enqueue("createElement", id, type)
      driver.enqueue("setEventListener", id, "click", true)
      driver.flush()

      expect(renderer.batches[0]).toEqual([
        ["createElement", id, type],
        ["setEventListener", id, "click", true],
      ])
      expect(renderer.batches[0]).not.toContainEqual(["setEventListener", id, "mouseUp", true])
    }
  })

  it("chooses the relay channel from each descendant native type", () => {
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("createElement", 2, "text")
    driver.enqueue("createElement", 3, "input")
    driver.enqueue("setEventListener", 1, "click", true)
    driver.enqueue("appendChild", 1, 2)
    driver.enqueue("appendChild", 1, 3)
    driver.flush()

    expect(renderer.batches[0]).toContainEqual(["setEventListener", 1, "mouseUp", true])
    expect(renderer.batches[0]).toContainEqual(["setEventListener", 2, "mouseUp", true])
    expect(renderer.batches[0]).toContainEqual(["setEventListener", 3, "click", true])
    expect(renderer.batches[0]).not.toContainEqual(["setEventListener", 3, "mouseUp", true])
  })

  it("resolves em dimensions against the element font size", () => {
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, new EventRegistry())

    driver.enqueue("setStyle", 1, { fontSize: "12px", width: "1.5em", height: "2em" })
    driver.flush()

    expect(renderer.batches[0]?.[0]).toEqual([
      "setStyle",
      1,
      { fontSize: 12, width: 18, height: 24 },
    ])
  })

  it("canonicalizes CSS font-size before resolving em dimensions", () => {
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, new EventRegistry())

    driver.enqueue("setStyle", 1, { fontSize: 14, "font-size": "30px", width: "1em", height: "1em" })
    driver.flush()

    expect(renderer.batches[0]?.[0]).toEqual([
      "setStyle",
      1,
      { fontSize: 30, width: 30, height: 30 },
    ])
  })

  it("omits legacy removeChild when destroy unlinks its parent", () => {
    const renderer = new FakeRenderer()
    useDestroyUnlinksParentBatch(renderer)
    const driver = new MutationDriver(renderer, new EventRegistry())

    driver.enqueue("removeChild", 1, 2)
    driver.enqueue("destroyElement", 2)
    driver.flush()

    expect(renderer.batches.at(-1)).toEqual([["destroyElement", 2]])
  })

  it("serializes structured values for the direct N-API fallback", () => {
    const renderer = new FakeRenderer()
    Object.defineProperty(renderer, "applyBatch", { value: undefined })
    const driver = new MutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "img")
    driver.enqueue("setStyle", 1, { padding: 8 })
    driver.enqueue("setCustomProp", 1, "src", "image.png")
    driver.flush()

    expect(renderer.direct).toEqual([
      ["createElement", 1, "img"],
      ["setStyle", 1, '{"padding":8}'],
      ["setCustomProp", 1, "src", '"image.png"'],
      ["commitMutations"],
    ])
  })

  it("preserves the queue when applyBatch throws", () => {
    const renderer = new FakeRenderer()
    renderer.applyBatch = () => { throw new Error("native failed") }
    const driver = new MutationDriver(renderer, new EventRegistry())
    driver.enqueue("createElement", 1, "div")

    expect(() => driver.flush()).toThrow("native failed")
    expect(driver.pending).toBe(1)
  })
})
