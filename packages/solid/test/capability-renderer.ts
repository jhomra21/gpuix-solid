import type {
  DebugFrameOverlayMode,
  HighlightMatch,
  NativeWindowInsets,
} from "../src/host/types.js"
import { FakeRenderer } from "./fake-renderer.js"

export class CapabilityRenderer extends FakeRenderer {
  readonly capabilityCalls: Array<readonly [string, ...Array<string | number>]> = []
  windowSize = { width: 800, height: 600 }
  windowInsets: NativeWindowInsets = {
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    ime: { top: 0, right: 0, bottom: 0, left: 0 },
    effective: { top: 0, right: 0, bottom: 0, left: 0 },
  }
  selectedText: string | null = "selected"
  debugFrameOverlay: DebugFrameOverlayMode = "hidden"
  highlights: HighlightMatch[] = []

  focusElement(id: number): void { this.capabilityCalls.push(["focusElement", id]) }
  blur(): void { this.capabilityCalls.push(["blur"]) }
  scrollTo(id: number, x: number, y: number): void { this.capabilityCalls.push(["scrollTo", id, x, y]) }
  scrollToItem(id: number, index: number, offsetInItem?: number): void {
    if (offsetInItem === undefined) this.capabilityCalls.push(["scrollToItem", id, index])
    else this.capabilityCalls.push(["scrollToItem", id, index, offsetInItem])
  }
  getScrollOffset(id: number): number[] { this.capabilityCalls.push(["getScrollOffset", id]); return [-4, -8] }
  getListScrollTop(id: number): number[] { this.capabilityCalls.push(["getListScrollTop", id]); return [12, -6, 480] }
  getSelectedText(): string | null { this.capabilityCalls.push(["getSelectedText"]); return this.selectedText }
  clearSelection(): void { this.capabilityCalls.push(["clearSelection"]); this.selectedText = null }
  getPaintedHighlights(): HighlightMatch[] {
    this.capabilityCalls.push(["getPaintedHighlights"])
    return this.highlights
  }
  getWindowSize(): { width: number; height: number } {
    this.capabilityCalls.push(["getWindowSize"])
    return this.windowSize
  }
  getWindowInsets(): NativeWindowInsets {
    this.capabilityCalls.push(["getWindowInsets"])
    return this.windowInsets
  }
  activateWindow(): void { this.capabilityCalls.push(["activateWindow"]) }
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
