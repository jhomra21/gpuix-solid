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

  it("resolves nested primary activation to the nearest live click owner", () => {
    const events = new EventRegistry()
    const driver = new MutationDriver(new FakeRenderer(), events)
    const parentId = 11
    const childId = 12
    let parentClicks = 0

    events.activate(parentId)
    events.activate(childId)
    events.set(parentId, "click", () => {
      parentClicks += 1
    })
    driver.enqueue("appendChild", parentId, childId)

    const mouseUp = primaryMouseUp(childId)
    events.dispatch(mouseUp)
    expect(parentClicks).toBe(1)

    events.dispatch({ ...mouseUp, eventType: "click" })
    expect(parentClicks).toBe(1)

    driver.enqueue("removeChild", parentId, childId)
    events.dispatch(primaryMouseUp(childId))
    expect(parentClicks).toBe(1)
  })

  it("keeps exact-target click ownership when the nested child is interactive", () => {
    const events = new EventRegistry()
    const driver = new MutationDriver(new FakeRenderer(), events)
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
    driver.enqueue("appendChild", parentId, childId)

    events.dispatch(primaryMouseUp(childId))
    expect(childClicks).toBe(1)
    expect(parentClicks).toBe(0)
  })
})
