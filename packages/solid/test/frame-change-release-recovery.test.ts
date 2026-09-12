import type { EventPayload } from "@gpuix/native"
import { describe, expect, it } from "vitest"
import { BrowserPointerReleaseRelay } from "../src/host/pointer-lifecycle.js"

function pointerEvent(
  eventType: "mouseDown" | "mouseUp",
  elementId: number,
  x = 40,
  y = 20,
): EventPayload {
  // SAFETY: these relay tests exercise only the pointer fields consumed by BrowserPointerReleaseRelay.
  return { eventType, elementId, x, y, button: 0 } as EventPayload
}

describe("frame-change pointer release recovery", () => {
  it("recovers a sibling relay release to a live pressed target", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const pressedId = 2
    const overlayId = 4

    relay.route(pointerEvent("mouseDown", pressedId), rootId, () => true)
    expect(relay.route(pointerEvent("mouseUp", overlayId), rootId, () => true)?.elementId).toBe(pressedId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)).toBeUndefined()
    expect(relay.route(pointerEvent("mouseUp", pressedId), rootId, () => true)).toBeUndefined()
  })

  it("keeps a sibling relay release global-only after the pressed target remounts", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const pressedId = 2
    const overlayId = 4

    relay.route(pointerEvent("mouseDown", pressedId), rootId, () => true)
    expect(relay.route(pointerEvent("mouseUp", overlayId), rootId, () => false)?.elementId).toBe(overlayId)
    expect(relay.route(pointerEvent("mouseUp", rootId), rootId, () => true)?.elementId).toBe(rootId)
  })

  it("does not reinterpret an ancestor callback as a sibling relay release", () => {
    const relay = new BrowserPointerReleaseRelay()
    const rootId = 1
    const ancestorId = 2
    const pressedId = 3
    const isDescendantOf = (elementId: number, ancestor: number): boolean =>
      elementId === pressedId && ancestor === ancestorId

    relay.route(pointerEvent("mouseDown", ancestorId), rootId, () => true, isDescendantOf)
    relay.route(pointerEvent("mouseDown", pressedId), rootId, () => true, isDescendantOf)
    expect(
      relay.route(pointerEvent("mouseUp", ancestorId), rootId, () => true, isDescendantOf)?.elementId,
    ).toBe(ancestorId)
    expect(
      relay.route(pointerEvent("mouseUp", rootId), rootId, () => true, isDescendantOf)?.elementId,
    ).toBe(pressedId)
  })
})
