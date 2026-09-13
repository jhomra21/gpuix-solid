import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { BrowserPointerMutationDriver } from "../src/host/pointer-lifecycle.js"
import { FakeRenderer } from "./fake-renderer.js"

function listenerMutations(renderer: FakeRenderer) {
  return renderer.batches
    .flat()
    .filter((mutation) => mutation[0] === "setEventListener")
}

describe("active browser window pointer relay", () => {
  it("adds native move to the authored press owner only after the press begins", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setRoot", 1)
    driver.enqueue("createElement", 2, "div")
    driver.enqueue("setEventListener", 2, "mouseDown", true)
    driver.enqueue("appendChild", 1, 2)
    driver.flush()

    const initial = listenerMutations(renderer)
    expect(initial).toContainEqual(["setEventListener", 2, "mouseDown", true])
    expect(initial).toContainEqual(["setEventListener", 2, "mouseUp", true])
    expect(initial).not.toContainEqual(["setEventListener", 2, "mouseMove", true])

    renderer.batches.length = 0
    driver.beginAuthoredPointerRelay(2)
    driver.flush()
    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 2, "mouseMove", true],
    ])

    renderer.batches.length = 0
    driver.endAuthoredPointerRelay()
    driver.flush()
    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 2, "mouseMove", false],
    ])
  })

  it("relays move/up through surfaces mounted during an authored press without giving them mouse-down capture", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setRoot", 1)
    driver.enqueue("createElement", 2, "div")
    driver.enqueue("setEventListener", 2, "mouseDown", true)
    driver.enqueue("appendChild", 1, 2)
    driver.flush()
    renderer.batches.length = 0

    driver.beginAuthoredPointerRelay(2)
    driver.enqueue("createElement", 3, "div")
    driver.enqueue("appendChild", 1, 3)
    driver.flush()

    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 3, "mouseMove", true])
    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 3, "mouseUp", true])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 3, "mouseDown", true])
  })

  it("does not start the authored relay from a synthetic click press probe", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setRoot", 1)
    driver.enqueue("createElement", 2, "button")
    driver.enqueue("setEventListener", 2, "click", true)
    driver.enqueue("appendChild", 1, 2)
    driver.flush()
    renderer.batches.length = 0

    driver.beginAuthoredPointerRelay(2)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([])
  })
})
