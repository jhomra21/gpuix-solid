import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"
import { MutationDriver } from "../src/host/mutations.js"
import { FakeRenderer } from "./fake-renderer.js"

function primaryMouseUp(elementId: number) {
  return {
    elementId,
    eventType: "mouseUp",
    x: 24,
    y: 16,
    button: 0,
  } satisfies NativeEventPayload
}

function primaryClick(elementId: number) {
  return {
    elementId,
    eventType: "click",
    x: 24,
    y: 16,
    button: 0,
    clickCount: 1,
  } satisfies NativeEventPayload
}

function mouseUpListenerMutations(renderer: FakeRenderer, id: number) {
  return renderer.batches
    .flat()
    .filter((mutation) => mutation[0] === "setEventListener" && mutation[1] === id && mutation[2] === "mouseUp")
}

describe("embedded primary click compatibility", () => {
  it("delivers primary mouse-up once and deduplicates a following native click", () => {
    const events = new EventRegistry()
    const elementId = 7
    let clicks = 0

    events.activate(elementId)
    events.set(elementId, "click", () => {
      clicks += 1
    })

    const mouseUp = primaryMouseUp(elementId)
    events.dispatch(mouseUp)
    expect(clicks).toBe(1)

    events.dispatch({ ...mouseUp, eventType: "click" })
    expect(clicks).toBe(1)

    events.dispatch({ ...mouseUp, eventType: "mouseUp", button: 2 })
    expect(clicks).toBe(1)
  })

  it("replays a missed owner pointer-down before a relayed primary click", () => {
    const events = new EventRegistry()
    const parentId = 8
    const childId = 9
    const order: string[] = []

    events.activate(parentId)
    events.activate(childId)
    events.setParent(childId, parentId)
    events.set(parentId, "pointerDown", () => {
      order.push("pointerDown")
    })
    events.set(parentId, "click", () => {
      order.push("click")
    })

    events.dispatch(primaryClick(childId))
    expect(order).toEqual(["pointerDown", "click"])
  })

  it("arms nested retained content with the same mouse-up activation relay as its click owner", () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 11
    const childId = 12
    let parentClicks = 0

    events.activate(parentId)
    events.activate(childId)
    events.set(parentId, "click", () => {
      parentClicks += 1
    })
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("appendChild", parentId, childId)
    driver.flush()

    expect(mouseUpListenerMutations(renderer, parentId)).toContainEqual(["setEventListener", parentId, "mouseUp", true])
    expect(mouseUpListenerMutations(renderer, childId)).toContainEqual(["setEventListener", childId, "mouseUp", true])

    const mouseUp = primaryMouseUp(childId)
    events.dispatch(mouseUp)
    expect(parentClicks).toBe(1)

    events.dispatch({ ...mouseUp, eventType: "click" })
    expect(parentClicks).toBe(1)

    driver.enqueue("removeChild", parentId, childId)
    driver.flush()
    expect(mouseUpListenerMutations(renderer, childId).at(-1)).toEqual(["setEventListener", childId, "mouseUp", false])

    events.dispatch(primaryMouseUp(childId))
    expect(parentClicks).toBe(1)
  })

  it("coalesces GPUI bubble callbacks from a relay child and its click owner", async () => {
    const events = new EventRegistry()
    const parentId = 31
    const childId = 32
    let parentClicks = 0

    events.activate(parentId)
    events.activate(childId)
    events.set(parentId, "click", () => {
      parentClicks += 1
    })
    events.setParent(childId, parentId)

    events.dispatch(primaryClick(childId))
    events.dispatch(primaryClick(parentId))
    expect(parentClicks).toBe(1)

    await Promise.resolve()
    events.dispatch(primaryClick(parentId))
    expect(parentClicks).toBe(2)
  })

  it("removes descendant mouse-up relays when the ancestor click surface is disabled", () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 15
    const childId = 16

    events.activate(parentId)
    events.activate(childId)
    events.set(parentId, "click", () => undefined)
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("appendChild", parentId, childId)
    driver.flush()

    events.delete(parentId, "click")
    driver.enqueue("setEventListener", parentId, "click", false)
    driver.flush()

    expect(mouseUpListenerMutations(renderer, parentId).at(-1)).toEqual(["setEventListener", parentId, "mouseUp", false])
    expect(mouseUpListenerMutations(renderer, childId).at(-1)).toEqual(["setEventListener", childId, "mouseUp", false])
  })

  it("keeps exact-target click ownership when the nested child is interactive", () => {
    const events = new EventRegistry()
    const renderer = new FakeRenderer()
    const driver = new MutationDriver(renderer, events)
    const parentId = 21
    const childId = 22
    let parentClicks = 0
    let childClicks = 0

    events.activate(parentId)
    events.activate(childId)
    events.set(parentId, "click", () => {
      parentClicks += 1
    })
    events.set(childId, "click", () => {
      childClicks += 1
    })
    driver.enqueue("setEventListener", parentId, "click", true)
    driver.enqueue("setEventListener", childId, "click", true)
    driver.enqueue("appendChild", parentId, childId)
    driver.flush()

    events.dispatch(primaryMouseUp(childId))
    expect(childClicks).toBe(1)
    expect(parentClicks).toBe(0)
  })

  it("coalesces the ancestor callback when the nested child owns the click", () => {
    const events = new EventRegistry()
    const parentId = 41
    const childId = 42
    let parentClicks = 0
    let childClicks = 0

    events.activate(parentId)
    events.activate(childId)
    events.setParent(childId, parentId)
    events.set(parentId, "click", () => {
      parentClicks += 1
    })
    events.set(childId, "click", () => {
      childClicks += 1
    })

    events.dispatch(primaryClick(childId))
    events.dispatch(primaryClick(parentId))

    expect(childClicks).toBe(1)
    expect(parentClicks).toBe(0)
  })

  it("keeps double-click-only controls activatable through primary mouse-up", () => {
    const events = new EventRegistry()
    const elementId = 51
    let doubleClicks = 0

    events.activate(elementId)
    events.set(elementId, "dblClick", () => {
      doubleClicks += 1
    })

    events.dispatch(primaryMouseUp(elementId))
    events.dispatch(primaryMouseUp(elementId))

    expect(doubleClicks).toBe(1)
  })
})
