import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
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

  it("preserves the queue when applyBatch throws", () => {
    const renderer = new FakeRenderer()
    renderer.applyBatch = () => { throw new Error("native failed") }
    const driver = new MutationDriver(renderer, new EventRegistry())
    driver.enqueue("createElement", 1, "div")

    expect(() => driver.flush()).toThrow("native failed")
    expect(driver.pending).toBe(1)
  })
})
