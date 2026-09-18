import type { NativeRenderer } from "./host/types.js"

export type NativeListTarget = number

/**
 * Convenience wrappers around GPUIX's native retained-list scrolling surface.
 * Targets use the retained native element id exposed by a host ref.
 */
export const list = {
  scrollTo(
    renderer: NativeRenderer,
    target: NativeListTarget,
    x: number,
    y: number,
  ): void {
    if (!renderer.scrollTo) throw new Error("GPUIX native renderer does not expose scrollTo")
    renderer.scrollTo(target, x, y)
  },

  scrollToItem(
    renderer: NativeRenderer,
    target: NativeListTarget,
    index: number,
    offsetInItem?: number,
  ): void {
    if (!renderer.scrollToItem) throw new Error("GPUIX native renderer does not expose scrollToItem")
    renderer.scrollToItem(target, index, offsetInItem)
  },

  getScrollOffset(renderer: NativeRenderer, target: NativeListTarget): number[] | null {
    if (!renderer.getScrollOffset) throw new Error("GPUIX native renderer does not expose getScrollOffset")
    return renderer.getScrollOffset(target)
  },

  getScrollTop(renderer: NativeRenderer, target: NativeListTarget): number[] | null {
    if (!renderer.getListScrollTop) throw new Error("GPUIX native renderer does not expose getListScrollTop")
    return renderer.getListScrollTop(target)
  },
}
