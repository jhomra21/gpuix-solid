import type { MutationValue } from "./host/mutations.js"
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
  focusNext?(): void
  focusPrevious?(): void
  blur?(): void
  setWindowKeyEvents?(keyDown: boolean, keyUp: boolean, eventId: number): void
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
      applyOne(["setStyle", id, parseMutationValue(styleJson)])
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
      applyOne(["setCustomProp", id, key, parseMutationValue(valueJson)])
    },
    commitMutations() {
      // Single-operation compatibility calls above already commit through applyBatch.
    },
    applyBatch(json) {
      return renderer.applyBatch(json)
    },
  }

  if (renderer.focusElement) adapted.focusElement = renderer.focusElement.bind(renderer)
  if (renderer.focusNext) adapted.focusNext = renderer.focusNext.bind(renderer)
  if (renderer.focusPrevious) adapted.focusPrevious = renderer.focusPrevious.bind(renderer)
  if (renderer.blur) adapted.blur = renderer.blur.bind(renderer)
  if (renderer.setWindowKeyEvents) adapted.setWindowKeyEvents = renderer.setWindowKeyEvents.bind(renderer)
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

function parseMutationValue(value: string): MutationValue {
  // SAFETY: legacy host methods receive JSON produced from renderer-owned styles and custom props, whose wire values are exactly MutationValue.
  return JSON.parse(value) as MutationValue
}
