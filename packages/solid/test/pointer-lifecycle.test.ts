import type { EventPayload } from "@gpuix/native"
import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { BrowserPointerMutationDriver, BrowserPointerReleaseRelay } from "../src/host/pointer-lifecycle.js"
import { FakeRenderer } from "./fake-renderer.js"

function listenerMutations(renderer: FakeRenderer) {
  return renderer.batches
    .flat()
    .filter((mutation) => mutation[0] === "setEventListener")
}

function pointerEvent(eventType: "mouseDown" | "mouseUp", elementId: number, x = 40, y = 20): EventPayload {
  // SAFETY: these relay unit tests exercise only the mouse event fields consumed by BrowserPointerReleaseRelay.
  return { eventType, elementId, x, y, button: 0 } as EventPayload
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

  it("keeps native move/up armed on the mounted root", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 10, "div")
    driver.enqueue("setRoot", 10)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 10, "mouseMove", true],
      ["setEventListener", 10, "mouseUp", true],
    ])

    renderer.batches.length = 0
    driver.enqueue("setEventListener", 10, "mouseMove", false)
    driver.enqueue("setEventListener", 10, "mouseUp", false)
    driver.flush()
    expect(listenerMutations(renderer)).toEqual([])
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

  it("routes a root-only stationary release back to its live pressed target", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const childId = 2

    expect(relay.route(pointerEvent("mouseDown", childId), rootId, () => true)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)?.elementId).toBe(childId)
  })

  it("keeps the nested local press when an ancestor release arrives before the root relay", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const ancestorId = 2
    const childId = 3

    expect(relay.route(pointerEvent("mouseDown", ancestorId), rootId, () => true)?.elementId).toBe(ancestorId)
    expect(relay.route(pointerEvent("mouseDown", childId), rootId, () => true)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", ancestorId), rootId, () => true)?.elementId).toBe(ancestorId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)?.elementId).toBe(childId)
  })

  it("does not replay a nested release after the local pressed owner received it directly", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const ancestorId = 2
    const childId = 3

    relay.route(pointerEvent("mouseDown", ancestorId), rootId, () => true)
    relay.route(pointerEvent("mouseDown", childId), rootId, () => true)
    expect(relay.route(pointerEvent("mouseUp", childId), rootId, () => true)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)?.elementId).toBe(rootId)
  })

  it("does not recover a root release outside the pressed target", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const childId = 2

    relay.route(pointerEvent("mouseDown", childId), rootId, () => true)
    expect(relay.route(pointerEvent("mouseUp", rootId, 200, 200), rootId, () => false)?.elementId).toBe(rootId)
  })

  it("suppresses a late native child release after root fallback already delivered it", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const childId = 2

    relay.route(pointerEvent("mouseDown", childId), rootId, () => true)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", childId), rootId, () => true)).toBeUndefined()
  })
})
