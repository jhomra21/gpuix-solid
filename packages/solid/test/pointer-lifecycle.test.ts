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
  it("keeps native move/up relays on the mounted root for window pointer listeners", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setRoot", 1)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual(expect.arrayContaining([
      ["setEventListener", 1, "mouseMove", true],
      ["setEventListener", 1, "mouseUp", true],
    ]))

    renderer.batches.length = 0
    driver.enqueue("setEventListener", 1, "mouseMove", false)
    driver.enqueue("setEventListener", 1, "mouseUp", false)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([])
  })

  it("keeps the root mouse-up relay when click activation is removed", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 2, "div")
    driver.enqueue("setRoot", 2)
    driver.enqueue("setEventListener", 2, "click", true)
    driver.flush()

    renderer.batches.length = 0
    driver.enqueue("setEventListener", 2, "click", false)
    driver.flush()

    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 2, "mouseUp", false])
  })
})
