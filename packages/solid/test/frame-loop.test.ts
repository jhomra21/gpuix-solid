import { afterEach, describe, expect, it, vi } from "vitest"
import { setAutomationFrameOwnership, startFrameLoop } from "../src/frame-loop.js"

afterEach(() => {
  setAutomationFrameOwnership(false)
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("frame loop", () => {
  it("keeps pumping after a tick error and terminates only when native reports false", () => {
    vi.useFakeTimers()
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    let ticks = 0
    let terminated = 0

    const loop = startFrameLoop({
      requiresTick: () => true,
      tick: () => {
        ticks += 1
        if (ticks === 1) throw new Error("expected tick failure")
        return false
      },
    }, {
      frameMs: 1,
      onTerminated: () => { terminated += 1 },
    })

    expect(ticks).toBe(1)
    expect(terminated).toBe(0)
    expect(error).toHaveBeenCalledWith("[gpuix-solid] tick error", expect.any(Error))

    vi.runOnlyPendingTimers()

    expect(ticks).toBe(2)
    expect(terminated).toBe(1)
    loop.stop()
  })

  it("does not start a competing timer when live automation owns the frame pump", () => {
    vi.useFakeTimers()
    let ticks = 0
    setAutomationFrameOwnership(true)

    const loop = startFrameLoop({
      requiresTick: () => true,
      tick: () => {
        ticks += 1
        return true
      },
    }, { frameMs: 1 })

    expect(ticks).toBe(0)
    vi.runOnlyPendingTimers()
    expect(ticks).toBe(0)
    loop.stop()
  })
})
