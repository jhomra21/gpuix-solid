import type { NativeRenderer, PublicInstance } from "./host/types.js"

export type NativeListTarget = number | Pick<PublicInstance, "id">

function targetId(target: NativeListTarget): number {
  return typeof target === "number" ? target : target.id
}

/**
 * Convenience wrappers around GPUIX's native retained-list scrolling surface.
 * They accept either a raw host id or a Solid host ref.
 */
export const list = {
  scrollTo(
    renderer: NativeRenderer,
    target: NativeListTarget,
    x: number,
    y: number,
  ): void {
    if (!renderer.scrollTo) throw new Error("GPUIX native renderer does not expose scrollTo")
    renderer.scrollTo(targetId(target), x, y)
  },

  scrollToItem(
    renderer: NativeRenderer,
    target: NativeListTarget,
    index: number,
    offsetInItem?: number,
  ): void {
    if (!renderer.scrollToItem) throw new Error("GPUIX native renderer does not expose scrollToItem")
    renderer.scrollToItem(targetId(target), index, offsetInItem)
  },

  getScrollOffset(renderer: NativeRenderer, target: NativeListTarget): number[] | null {
    if (!renderer.getScrollOffset) throw new Error("GPUIX native renderer does not expose getScrollOffset")
    return renderer.getScrollOffset(targetId(target))
  },

  getScrollTop(renderer: NativeRenderer, target: NativeListTarget): number[] | null {
    if (!renderer.getListScrollTop) throw new Error("GPUIX native renderer does not expose getListScrollTop")
    return renderer.getListScrollTop(targetId(target))
  },
}
