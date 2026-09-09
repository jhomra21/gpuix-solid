import { describe, expect, it } from "vitest"
import { createDeferredNativeEventHandler } from "../src/native-event-queue.js"

function nextImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe("native event callback boundary", () => {
  it("waits past a microtask checkpoint before delivering native events", async () => {
    const phases: string[] = []
    const handleNativeEvent = createDeferredNativeEventHandler(
      () => phases.push("event"),
      (error) => { throw error },
    )

    handleNativeEvent(undefined, { elementId: 1, eventType: "click" })
    queueMicrotask(() => phases.push("microtask"))

    expect(phases).toEqual([])
    await Promise.resolve()
    expect(phases).toEqual(["microtask"])
    await nextImmediate()
    expect(phases).toEqual(["microtask", "event"])
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
    expect(elementIds).toEqual([])
    await nextImmediate()
    expect(elementIds).toEqual([1, 2])
  })
})
