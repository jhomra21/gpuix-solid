import { describe, expect, it } from "vitest"
import { createDeferredNativeEventHandler } from "../src/native-event-queue.js"

describe("native event callback boundary", () => {
  it("delivers events only after the native callback stack unwinds", async () => {
    const observedInsideNativeCallback: boolean[] = []
    let insideNativeCallback = true
    const handleNativeEvent = createDeferredNativeEventHandler(
      () => observedInsideNativeCallback.push(insideNativeCallback),
      (error) => { throw error },
    )

    handleNativeEvent(undefined, { elementId: 1, eventType: "click" })

    expect(observedInsideNativeCallback).toEqual([])
    insideNativeCallback = false
    await Promise.resolve()
    expect(observedInsideNativeCallback).toEqual([false])
  })

  it("preserves native event order while delivery is deferred", async () => {
    const elementIds: number[] = []
    const handleNativeEvent = createDeferredNativeEventHandler(
      (event) => elementIds.push(event.elementId),
      (error) => { throw error },
    )

    handleNativeEvent(undefined, { elementId: 1, eventType: "mouseDown" })
    handleNativeEvent(undefined, { elementId: 2, eventType: "click" })

    expect(elementIds).toEqual([])
    await Promise.resolve()
    expect(elementIds).toEqual([1, 2])
  })
})
