import type { DebugFrameOverlayMode } from "../src/host/types.js"
import { FakeRenderer } from "./fake-renderer.js"

export class CapabilityRenderer extends FakeRenderer {
  readonly capabilityCalls: Array<readonly [string, ...Array<string | number>]> = []
  windowSize = { width: 800, height: 600 }
  selectedText: string | null = "selected"
  debugFrameOverlay: DebugFrameOverlayMode = "hidden"

  focusElement(id: number): void { this.capabilityCalls.push(["focusElement", id]) }
  blur(): void { this.capabilityCalls.push(["blur"]) }
  scrollTo(id: number, x: number, y: number): void { this.capabilityCalls.push(["scrollTo", id, x, y]) }
  scrollToItem(id: number, index: number): void { this.capabilityCalls.push(["scrollToItem", id, index]) }
  getScrollOffset(id: number): number[] { this.capabilityCalls.push(["getScrollOffset", id]); return [-4, -8] }
  getSelectedText(): string | null { this.capabilityCalls.push(["getSelectedText"]); return this.selectedText }
  clearSelection(): void { this.capabilityCalls.push(["clearSelection"]); this.selectedText = null }
  getWindowSize(): { width: number; height: number } {
    this.capabilityCalls.push(["getWindowSize"])
    return this.windowSize
  }
  setWindowTitle(title: string): void { this.capabilityCalls.push(["setWindowTitle", title]) }
  setDebugFrameOverlay(mode: DebugFrameOverlayMode): string {
    this.debugFrameOverlay = mode
    this.capabilityCalls.push(["setDebugFrameOverlay", mode])
    return mode
  }
  getDebugFrameOverlay(): string {
    this.capabilityCalls.push(["getDebugFrameOverlay"])
    return this.debugFrameOverlay
  }
  cycleDebugFrameOverlay(): string {
    this.debugFrameOverlay = this.debugFrameOverlay === "hidden"
      ? "minimal"
      : this.debugFrameOverlay === "minimal" ? "full" : "hidden"
    this.capabilityCalls.push(["cycleDebugFrameOverlay"])
    return this.debugFrameOverlay
  }
  resetDebugFrameOverlayStats(): void { this.capabilityCalls.push(["resetDebugFrameOverlayStats"]) }
}
