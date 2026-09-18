import type { HostElementNode, HostNode, HostRootNode } from "./nodes.js"
import type { NativeRenderer, StyleDesc } from "./types.js"

type BoundsRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
}

const PREVIEW_TEST_ID = "gpuix-drag-preview"
const BUILT_IN_VISUAL_PROPS = new Set(["highlight"])
const OMITTED_PREVIEW_PROPS = new Set([
  "autoFocus",
  "motion",
  "role",
  "tabIndex",
  "testId",
  "title",
])

const wrapperBaseStyle: StyleDesc = {
  position: "absolute",
  display: "flex",
  flexDirection: "row",
  flexGrow: 0,
  flexShrink: 0,
  pointerEvents: "none",
  userSelect: "none",
  opacity: 0.94,
}

function findElement(root: HostRootNode, elementId: number): HostElementNode | undefined {
  const pending: HostNode[] = [...root.children]
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node) continue
    if (node.kind === "element" && node.id === elementId) return node
    pending.push(...node.children)
  }
  return undefined
}

function previewPropAllowed(node: HostElementNode, name: string): boolean {
  if (OMITTED_PREVIEW_PROPS.has(name) || name.startsWith("aria-")) return false
  if (node.nativeType === "div" || node.nativeType === "text") {
    return BUILT_IN_VISUAL_PROPS.has(name)
  }
  return true
}

function previewChildStyle(style: StyleDesc): StyleDesc {
  return {
    ...style,
    pointerEvents: "none",
    userSelect: "none",
  }
}

function previewRootStyle(style: StyleDesc, width: number, height: number): StyleDesc {
  const {
    position: _position,
    top: _top,
    right: _right,
    bottom: _bottom,
    left: _left,
    ...visualStyle
  } = style
  return {
    ...visualStyle,
    position: "relative",
    top: 0,
    left: 0,
    width,
    height,
    minWidth: width,
    minHeight: height,
    maxWidth: width,
    maxHeight: height,
    margin: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
    flexGrow: 0,
    flexShrink: 0,
    pointerEvents: "none",
    userSelect: "none",
  }
}

export class SemanticDragPreview {
  readonly #root: HostRootNode
  readonly #renderer: BoundsRenderer
  #parentId: number | undefined
  #wrapperId: number | undefined
  #sourceId: number | undefined
  #grabX = 0
  #grabY = 0
  #width = 0
  #height = 0

  constructor(root: HostRootNode, renderer: NativeRenderer) {
    this.#root = root
    this.#renderer = renderer
  }

  show(
    parentId: number,
    x: number,
    y: number,
    sourceId: number,
    startX: number,
    startY: number,
  ): void {
    const source = findElement(this.#root, sourceId)
    const bounds = this.#renderer.getElementBounds?.(sourceId)
    if (!source || !bounds || bounds.length < 4) {
      this.hide()
      return
    }

    const left = bounds[0] ?? 0
    const top = bounds[1] ?? 0
    const width = bounds[2] ?? 0
    const height = bounds[3] ?? 0
    if (width <= 0 || height <= 0) {
      this.hide()
      return
    }

    if (this.#sourceId !== sourceId || this.#wrapperId === undefined || this.#parentId !== parentId) {
      this.hide()
      this.#parentId = parentId
      this.#sourceId = sourceId
      this.#grabX = Math.min(width, Math.max(0, startX - left))
      this.#grabY = Math.min(height, Math.max(0, startY - top))
      this.#width = width
      this.#height = height

      const wrapperId = this.#root.allocateId()
      this.#wrapperId = wrapperId
      this.#root.driver.enqueue("createElement", wrapperId, "div")
      this.#root.driver.enqueue("setCustomProp", wrapperId, "testId", PREVIEW_TEST_ID)

      const cloneId = this.#cloneNode(source, true)
      this.#root.driver.enqueue("appendChild", wrapperId, cloneId)
      this.#root.driver.enqueue("appendChild", parentId, wrapperId)
    }

    this.#root.driver.enqueue("setStyle", this.#wrapperId, {
      ...wrapperBaseStyle,
      left: Math.round(x - this.#grabX),
      top: Math.round(y - this.#grabY),
      width: this.#width,
      height: this.#height,
    })
  }

  hide(): void {
    const parentId = this.#parentId
    const wrapperId = this.#wrapperId
    if (parentId !== undefined && wrapperId !== undefined) {
      this.#root.driver.enqueue("removeChild", parentId, wrapperId)
      this.#root.driver.enqueue("destroyElement", wrapperId)
    }
    this.#parentId = undefined
    this.#wrapperId = undefined
    this.#sourceId = undefined
    this.#grabX = 0
    this.#grabY = 0
    this.#width = 0
    this.#height = 0
  }

  #cloneNode(node: HostNode, isRoot = false): number {
    const id = this.#root.allocateId()
    this.#root.driver.enqueue(
      "createElement",
      id,
      node.kind === "element" ? node.nativeType : node.type,
    )

    if (node.kind === "text") {
      this.#root.driver.enqueue("setText", id, node.text)
      this.#root.driver.enqueue("setStyle", id, {
        pointerEvents: "none",
        userSelect: "none",
      })
      return id
    }

    const style = isRoot
      ? previewRootStyle(node.style, this.#width, this.#height)
      : previewChildStyle(node.style)
    this.#root.driver.enqueue("setStyle", id, style)

    for (const [name, value] of node.props) {
      if (!previewPropAllowed(node, name)) continue
      this.#root.driver.enqueue("setCustomProp", id, name, value)
    }

    for (const child of node.children) {
      const childId = this.#cloneNode(child)
      this.#root.driver.enqueue("appendChild", id, childId)
    }
    return id
  }
}
