import type { HostRootNode } from "./nodes.js"
import type { NativeRenderer, StyleDesc } from "./types.js"

type DragPreviewRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
}

const PREVIEW_OFFSET = 14

const previewStyle: StyleDesc = {
  position: "absolute",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  maxWidth: 240,
  paddingTop: 6,
  paddingRight: 10,
  paddingBottom: 6,
  paddingLeft: 10,
  borderWidth: 1,
  borderColor: "#ffffff26",
  borderRadius: 7,
  backgroundColor: "#313244e6",
  boxShadow: {
    offsetX: 0,
    offsetY: 5,
    blurRadius: 16,
    spreadRadius: 0,
    color: "#00000055",
  },
  pointerEvents: "none",
  userSelect: "none",
}

const previewTextStyle: StyleDesc = {
  maxWidth: 220,
  color: "#f2f2f4",
  fontSize: 12,
  lineHeight: 16,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  pointerEvents: "none",
  userSelect: "none",
}

export class SemanticDragPreview {
  readonly #root: HostRootNode
  readonly #renderer: DragPreviewRenderer
  #parentId: number | undefined
  #surfaceId: number | undefined
  #textId: number | undefined
  #label = ""

  constructor(root: HostRootNode, renderer: DragPreviewRenderer) {
    this.#root = root
    this.#renderer = renderer
  }

  show(parentId: number, x: number, y: number, label: string): void {
    if (this.#parentId !== undefined && this.#parentId !== parentId) this.hide()

    if (this.#surfaceId === undefined || this.#textId === undefined) {
      this.#parentId = parentId
      this.#surfaceId = this.#root.allocateId()
      this.#textId = this.#root.allocateId()
      this.#root.driver.enqueue("createElement", this.#surfaceId, "div")
      this.#root.driver.enqueue("setCustomProp", this.#surfaceId, "testId", "gpuix-drag-preview")
      this.#root.driver.enqueue("createElement", this.#textId, "text")
      this.#root.driver.enqueue("setStyle", this.#textId, previewTextStyle)
      this.#root.driver.enqueue("appendChild", this.#surfaceId, this.#textId)
      this.#root.driver.enqueue("appendChild", parentId, this.#surfaceId)
    }

    if (this.#label !== label) {
      this.#label = label
      this.#root.driver.enqueue("setText", this.#textId, label)
    }

    const parentBounds = this.#renderer.getElementBounds?.(parentId)
    const parentX = parentBounds?.[0] ?? 0
    const parentY = parentBounds?.[1] ?? 0
    this.#root.driver.enqueue("setStyle", this.#surfaceId, {
      ...previewStyle,
      left: Math.round(x - parentX + PREVIEW_OFFSET),
      top: Math.round(y - parentY + PREVIEW_OFFSET),
    })
  }

  hide(): void {
    const parentId = this.#parentId
    const surfaceId = this.#surfaceId
    if (parentId !== undefined && surfaceId !== undefined) {
      this.#root.driver.enqueue("removeChild", parentId, surfaceId)
      this.#root.driver.enqueue("destroyElement", surfaceId)
    }
    this.#parentId = undefined
    this.#surfaceId = undefined
    this.#textId = undefined
    this.#label = ""
  }
}
