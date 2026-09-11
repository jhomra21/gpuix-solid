import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { BrowserPointerMutationDriver } from "../src/host/pointer-lifecycle.js"
import { FakeRenderer } from "./fake-renderer.js"

function listenerMutations(renderer: FakeRenderer) {
  return renderer.batches
    .flat()
    .filter((mutation) => mutation[0] === "setEventListener")
}

describe("browser pointer lifecycle compatibility", () => {
  it("arms native capture lifecycle on the same mouse-down owner", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setEventListener", 1, "mouseDown", true)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 1, "mouseDown", true],
      ["setEventListener", 1, "mouseMove", true],
      ["setEventListener", 1, "mouseUp", true],
    ])
  })

  it("removes only synthetic move/up lifecycle when mouse-down is removed", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("setEventListener", 2, "mouseDown", true)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("setEventListener", 2, "mouseDown", false)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 2, "mouseDown", false],
      ["setEventListener", 2, "mouseMove", false],
      ["setEventListener", 2, "mouseUp", false],
    ])
  })

  it("preserves authored move/up handlers after mouse-down is removed", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("setEventListener", 3, "mouseMove", true)
    driver.enqueue("setEventListener", 3, "mouseUp", true)
    driver.enqueue("setEventListener", 3, "mouseDown", true)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("setEventListener", 3, "mouseDown", false)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 3, "mouseDown", false],
    ])
  })

  it("does not remove click activation mouse-up when a drag owner is released", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 4, "div")
    driver.enqueue("setEventListener", 4, "click", true)
    driver.enqueue("setEventListener", 4, "mouseDown", true)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("setEventListener", 4, "mouseDown", false)
    driver.flush()

    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 4, "mouseDown", false])
    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 4, "mouseMove", false])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 4, "mouseUp", false])
  })
})
