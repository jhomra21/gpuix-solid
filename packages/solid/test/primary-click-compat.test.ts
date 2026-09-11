import type { EventPayload as NativeEventPayload } from "@gpuix/native"
import { describe, expect, it } from "vitest"
import { EventRegistry } from "../src/host/events.js"

describe("embedded primary click compatibility", () => {
  it("delivers primary mouse-up once and deduplicates a following native click", () => {
    const events = new EventRegistry()
    const elementId = 7
    let clicks = 0

    events.activate(elementId)
    events.set(elementId, "click", () => {
      clicks += 1
    })

    const primaryMouseUp = {
      elementId,
      eventType: "mouseUp",
      x: 24,
      y: 16,
      button: 0,
    } satisfies NativeEventPayload

    events.dispatch(primaryMouseUp)
    expect(clicks).toBe(1)

    events.dispatch({ ...primaryMouseUp, eventType: "click" })
    expect(clicks).toBe(1)

    events.dispatch({ ...primaryMouseUp, eventType: "mouseUp", button: 2 })
    expect(clicks).toBe(1)
  })
})
