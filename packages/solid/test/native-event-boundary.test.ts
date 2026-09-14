import { describe, expect, it } from "vitest"
import { createNativeEventBoundary } from "../src/native-event-boundary.js"

describe("native event boundary", () => {
  it("keeps ordinary native events synchronous", () => {
    const observed: number[] = []
    const boundary = createNativeEventBoundary(
      (event) => observed.push(event.elementId),
      (error) => { throw error },
    )

    boundary.handleNativeEvent(undefined, { elementId: 1, eventType: "click" })

    expect(observed).toEqual([1])
  })

  it("defers events that arrive during tick until tick returns", () => {
    const phases: string[] = []
    const boundary = createNativeEventBoundary(
      (event) => phases.push(`event:${event.elementId}`),
      (error) => { throw error },
    )

    const result = boundary.runTick(() => {
      phases.push("tick:start")
      boundary.handleNativeEvent(undefined, { elementId: 1, eventType: "mouseUp" })
      boundary.handleNativeEvent(undefined, { elementId: 2, eventType: "click" })
      phases.push("tick:end")
      return 42
    })

    expect(result).toBe(42)
    expect(phases).toEqual([
      "tick:start",
      "tick:end",
      "event:1",
      "event:2",
    ])
  })

  it("does not commit back into native while the tick lease is held", () => {
    let viewLeaseHeld = false
    let commits = 0
    const boundary = createNativeEventBoundary(
      () => {
        if (viewLeaseHeld) throw new Error("reentrant native commit")
        commits += 1
      },
      (error) => { throw error },
    )

    const nativeTick = (): boolean => {
      viewLeaseHeld = true
      try {
        boundary.handleNativeEvent(undefined, { elementId: 3, eventType: "click" })
        expect(commits).toBe(0)
        return true
      } finally {
        viewLeaseHeld = false
      }
    }

    expect(boundary.runTick(nativeTick)).toBe(true)
    expect(commits).toBe(1)
  })

  it("flushes queued events even when tick throws", () => {
    const phases: string[] = []
    const boundary = createNativeEventBoundary(
      (event) => phases.push(`event:${event.elementId}`),
      (error) => { throw error },
    )

    expect(() => boundary.runTick(() => {
      boundary.handleNativeEvent(undefined, { elementId: 7, eventType: "click" })
      throw new Error("tick failed")
    })).toThrow("tick failed")

    expect(phases).toEqual(["event:7"])
  })
})
