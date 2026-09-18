import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"

describe("semantic internal drag/drop", () => {
  it("starts after movement, resolves the drop target, and suppresses click", () => {
    const events = new EventRegistry()
    const sourceId = 11
    const targetId = 12
    const order: string[] = []
    let startPayload: unknown
    let payload: unknown

    events.activate(sourceId)
    events.activate(targetId)
    events.setParent(sourceId, null)
    events.setParent(targetId, null)
    events.setDragData(sourceId, { clipId: "clip-1" })

    events.set(sourceId, "dragStart", (event) => {
      startPayload = event.dragData
      order.push("start")
    })
    events.set(sourceId, "dragEnd", (event) => {
      order.push(`end:${event.dropTargetId === targetId ? "target" : "none"}`)
    })
    events.set(targetId, "dragOver", () => order.push("over"))
    events.set(targetId, "drop", (event) => {
      payload = event.dragData
      order.push("drop")
    })
    events.set(targetId, "click", () => order.push("click"))

    events.dispatch({ elementId: sourceId, eventType: "mouseDown", x: 10, y: 10, button: 0 })
    events.dispatch({ elementId: targetId, eventType: "mouseMove", x: 30, y: 10, button: 0 })
    expect(events.activeDragPreview()).toEqual({ sourceId, startX: 10, startY: 10 })
    events.dispatch({ elementId: targetId, eventType: "mouseUp", x: 30, y: 10, button: 0 })

    expect(events.activeDragPreview()).toBeUndefined()
    expect(startPayload).toEqual({ clipId: "clip-1" })
    expect(payload).toEqual({ clipId: "clip-1" })
    expect(order).toEqual(["start", "over", "drop", "end:target"])
  })

  it("does not promote pointer jitter into a drag", () => {
    const events = new EventRegistry()
    const sourceId = 21
    let starts = 0

    events.activate(sourceId)
    events.setParent(sourceId, null)
    events.setDragData(sourceId, "item")
    events.set(sourceId, "dragStart", () => { starts += 1 })

    events.dispatch({ elementId: sourceId, eventType: "mouseDown", x: 10, y: 10, button: 0 })
    events.dispatch({ elementId: sourceId, eventType: "mouseMove", x: 12, y: 11, button: 0 })
    events.dispatch({ elementId: sourceId, eventType: "mouseUp", x: 12, y: 11, button: 0 })

    expect(starts).toBe(0)
  })
})
