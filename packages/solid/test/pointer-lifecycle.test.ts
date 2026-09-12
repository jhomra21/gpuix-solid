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

const nestedDescendant = (elementId: number, ancestorId: number): boolean => elementId === 3 && ancestorId === 2

describe("browser pointer lifecycle compatibility", () => {
  it("does not manufacture native move capture on a mouse-down owner", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 1, "div")
    driver.enqueue("setEventListener", 1, "mouseDown", true)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 1, "mouseDown", true],
      ["setEventListener", 1, "mouseUp", true],
    ])
  })

  it("keeps window move/up relay armed without capturing click-only trees", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 10, "div")
    driver.enqueue("setRoot", 10)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 10, "mouseMove", true],
      ["setEventListener", 10, "mouseUp", true],
    ])
  })

  it("keeps root capture off while a connected authored gesture uses post-down move relay", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 10, "div")
    driver.enqueue("setRoot", 10)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("createElement", 11, "div")
    driver.enqueue("setEventListener", 11, "mouseDown", true)
    driver.enqueue("appendChild", 10, 11)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 11, "mouseDown", true],
      ["setEventListener", 11, "mouseUp", true],
    ])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 10, "mouseDown", true])

    renderer.batches.length = 0
    driver.beginAuthoredPointerRelay(11)
    driver.flush()
    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 11, "mouseMove", true],
    ])

    renderer.batches.length = 0
    driver.endAuthoredPointerRelay()
    driver.flush()
    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 11, "mouseMove", false],
    ])
  })

  it("does not arm root capture for a detached authored pointer-down owner", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 10, "div")
    driver.enqueue("setRoot", 10)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("createElement", 11, "div")
    driver.enqueue("setEventListener", 11, "mouseDown", true)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 11, "mouseDown", true],
      ["setEventListener", 11, "mouseUp", true],
    ])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 10, "mouseDown", true])
  })

  it("probes retained click targets on mouse-down without manufacturing move capture", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 20, "div")
    driver.enqueue("setEventListener", 20, "click", true)
    driver.flush()

    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 20, "mouseDown", true])
    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 20, "mouseUp", true])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 20, "mouseMove", true])

    renderer.batches.length = 0
    driver.enqueue("setEventListener", 20, "mouseMove", true)
    driver.flush()

    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 20, "mouseDown", false])
    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 20, "mouseMove", true])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 20, "mouseUp", false])
  })

  it("probes retained descendants of a click owner without giving them move capture", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 21, "div")
    driver.enqueue("createElement", 22, "text")
    driver.enqueue("setEventListener", 21, "click", true)
    driver.enqueue("appendChild", 21, 22)
    driver.flush()

    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 21, "mouseDown", true])
    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 22, "mouseDown", true])
    expect(listenerMutations(renderer)).toContainEqual(["setEventListener", 22, "mouseUp", true])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 21, "mouseMove", true])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 22, "mouseMove", true])
  })

  it("removes only synthetic mouse-up lifecycle when mouse-down is removed", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("setEventListener", 2, "mouseDown", true)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("setEventListener", 2, "mouseDown", false)
    driver.flush()

    expect(listenerMutations(renderer)).toEqual([
      ["setEventListener", 2, "mouseDown", false],
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

  it("does not remove click activation lifecycle when a drag owner is released", () => {
    const renderer = new FakeRenderer()
    const driver = new BrowserPointerMutationDriver(renderer, new EventRegistry())

    driver.enqueue("createElement", 4, "div")
    driver.enqueue("setEventListener", 4, "click", true)
    driver.enqueue("setEventListener", 4, "mouseDown", true)
    driver.flush()
    renderer.batches.length = 0

    driver.enqueue("setEventListener", 4, "mouseDown", false)
    driver.flush()

    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 4, "mouseDown", false])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 4, "mouseMove", false])
    expect(listenerMutations(renderer)).not.toContainEqual(["setEventListener", 4, "mouseUp", false])
  })

  it("routes a root-only stationary release back to its live pressed target", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const childId = 2

    expect(relay.route(pointerEvent("mouseDown", childId), rootId, () => true)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)?.elementId).toBe(childId)
  })

  it("keeps the deepest pressed target when native reports ancestor then child", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const ancestorId = 2
    const childId = 3

    expect(relay.route(pointerEvent("mouseDown", ancestorId), rootId, () => true, nestedDescendant)?.elementId).toBe(ancestorId)
    expect(relay.route(pointerEvent("mouseDown", childId), rootId, () => true, nestedDescendant)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", ancestorId), rootId, () => true, nestedDescendant)?.elementId).toBe(ancestorId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true, nestedDescendant)?.elementId).toBe(childId)
  })

  it("keeps the deepest pressed target when native reports child then ancestor", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const ancestorId = 2
    const childId = 3

    expect(relay.route(pointerEvent("mouseDown", childId), rootId, () => true, nestedDescendant)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseDown", ancestorId), rootId, () => true, nestedDescendant)?.elementId).toBe(ancestorId)
    expect(relay.route(pointerEvent("mouseUp", ancestorId), rootId, () => true, nestedDescendant)?.elementId).toBe(ancestorId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true, nestedDescendant)?.elementId).toBe(childId)
  })

  it("suppresses the matching root release after the local pressed owner completed it", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const ancestorId = 2
    const childId = 3

    relay.route(pointerEvent("mouseDown", ancestorId), rootId, () => true, nestedDescendant)
    relay.route(pointerEvent("mouseDown", childId), rootId, () => true, nestedDescendant)
    expect(relay.route(pointerEvent("mouseUp", childId), rootId, () => true, nestedDescendant)?.elementId).toBe(childId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true, nestedDescendant)).toBeUndefined()
  })

  it("suppresses the root copy after a remounted pressed target releases through a sibling relay", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const pressedId = 2
    const relayId = 3

    relay.route(pointerEvent("mouseDown", pressedId), rootId, () => true)
    expect(relay.route(pointerEvent("mouseUp", relayId), rootId, () => false)?.elementId).toBe(relayId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => false)).toBeUndefined()
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
