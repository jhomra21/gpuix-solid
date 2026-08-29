import type {
  DebugFrameOverlayMode,
  DebugFrameOverlayStats,
  NativeRenderer,
} from "./host/types.js"

type BoundsCapableRenderer = NativeRenderer & {
  getElementBounds?: (elementId: number) => number[] | null
}

export interface BatchRendererApi {
  applyBatch(json: string): number[]
  focusElement?(elementId: number): void
  blur?(): void
  scrollTo?(elementId: number, x: number, y: number): void
  scrollToItem?(elementId: number, index: number): void
  getScrollOffset?(elementId: number): number[] | null
  getSelectedText?(): string | null
  clearSelection?(): void
  getWindowSize?(): { width: number; height: number }
  setWindowTitle?(title: string): void
  setDebugFrameOverlay?(mode: DebugFrameOverlayMode): string
  getDebugFrameOverlay?(): string
  cycleDebugFrameOverlay?(): string
  resetDebugFrameOverlayStats?(): void
  getDebugFrameOverlayStats?(): DebugFrameOverlayStats
  getElementBounds?(elementId: number): number[] | null
}

export function adaptBatchRenderer(renderer: BatchRendererApi): BoundsCapableRenderer {
  const applyOne = (mutation: readonly unknown[]): number[] =>
    renderer.applyBatch(JSON.stringify([mutation]))

  const adapted: BoundsCapableRenderer = {
    createElement(id, elementType) {
      applyOne(["createElement", id, elementType])
    },
    destroyElement(id) {
      return applyOne(["destroyElement", id])
    },
    appendChild(parentId, childId) {
      applyOne(["appendChild", parentId, childId])
    },
    removeChild(parentId, childId) {
      applyOne(["removeChild", parentId, childId])
    },
    insertBefore(parentId, childId, beforeId) {
      applyOne(["insertBefore", parentId, childId, beforeId])
    },
    setStyle(id, styleJson) {
      applyOne(["setStyle", id, parseJson(styleJson)])
    },
    setText(id, content) {
      applyOne(["setText", id, content])
    },
    setEventListener(id, eventType, hasHandler) {
      applyOne(["setEventListener", id, eventType, hasHandler])
    },
    setRoot(id) {
      applyOne(["setRoot", id])
    },
    setCustomProp(id, key, valueJson) {
      applyOne(["setCustomProp", id, key, parseJson(valueJson)])
    },
    commitMutations() {
      // Single-operation compatibility calls above already commit through applyBatch.
    },
    applyBatch(json) {
      return renderer.applyBatch(json)
    },
  }

  if (renderer.focusElement) adapted.focusElement = renderer.focusElement.bind(renderer)
  if (renderer.blur) adapted.blur = renderer.blur.bind(renderer)
  if (renderer.scrollTo) adapted.scrollTo = renderer.scrollTo.bind(renderer)
  if (renderer.scrollToItem) adapted.scrollToItem = renderer.scrollToItem.bind(renderer)
  if (renderer.getScrollOffset) adapted.getScrollOffset = renderer.getScrollOffset.bind(renderer)
  if (renderer.getSelectedText) adapted.getSelectedText = renderer.getSelectedText.bind(renderer)
  if (renderer.clearSelection) adapted.clearSelection = renderer.clearSelection.bind(renderer)
  if (renderer.getWindowSize) adapted.getWindowSize = renderer.getWindowSize.bind(renderer)
  if (renderer.setWindowTitle) adapted.setWindowTitle = renderer.setWindowTitle.bind(renderer)
  if (renderer.setDebugFrameOverlay) adapted.setDebugFrameOverlay = renderer.setDebugFrameOverlay.bind(renderer)
  if (renderer.getDebugFrameOverlay) adapted.getDebugFrameOverlay = renderer.getDebugFrameOverlay.bind(renderer)
  if (renderer.cycleDebugFrameOverlay) adapted.cycleDebugFrameOverlay = renderer.cycleDebugFrameOverlay.bind(renderer)
  if (renderer.resetDebugFrameOverlayStats) adapted.resetDebugFrameOverlayStats = renderer.resetDebugFrameOverlayStats.bind(renderer)
  if (renderer.getDebugFrameOverlayStats) adapted.getDebugFrameOverlayStats = renderer.getDebugFrameOverlayStats.bind(renderer)
  if (renderer.getElementBounds) adapted.getElementBounds = renderer.getElementBounds.bind(renderer)

  return adapted
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}
