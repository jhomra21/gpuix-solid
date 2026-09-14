import { describe, expect, it } from "vitest"
import {
  LiveAutomationBackend,
  type LiveAutomationRenderer,
} from "../src/automation/server.js"

const tree = JSON.stringify({
  id: 1,
  type: "div",
  testId: "root",
  bounds: { x: 0, y: 0, width: 100, height: 80 },
})

class FrameOwnedRenderer implements LiveAutomationRenderer {
  ticks = 0

  tick(): boolean {
    this.ticks += 1
    return true
  }

  simulateClick(): void {}
  simulateMouseMove(): void {}
  simulateMouseDown(): void {}
  simulateMouseUp(): void {}
  simulateScrollWheel(): void {}
  simulateKeystrokes(): void {}
  focusElement(): void {}
  blur(): void {}
  scrollTo(): void {}
  getScrollOffset(): number[] | null { return null }
  getAllText(): string[] { return [] }
  getPaintedText(): string[] { return [] }
  getSelectedText(): string | null { return null }
  clearSelection(): void {}
  captureScreenshot(): void {}
  getAutomationTree(): string { return tree }
  getElementBounds(): number[] | null { return [0, 0, 100, 80] }
  clockPause(): number { return 0 }
  clockSet(nowMs: number): number { return nowMs }
  clockFastForward(deltaMs: number): number { return deltaMs }
  clockResume(): number { return 0 }
}

describe("automation frame ownership", () => {
  it("pumps reads without adding a competing post-input tick", () => {
    const renderer = new FrameOwnedRenderer()
    const backend = new LiveAutomationBackend(renderer, {
      tickAfterInput: false,
      tickBeforeRead: true,
    })

    expect(backend.getTree()?.testId).toBe("root")
    expect(backend.getBounds(1)).toEqual({ x: 0, y: 0, width: 100, height: 80 })
    expect(renderer.ticks).toBe(2)

    backend.click(50, 40)
    expect(renderer.ticks).toBe(2)
  })
})
