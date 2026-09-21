import {
  CANVAS_DRAW_LIST_VERSION,
  createCanvas2DRecorder,
  type Canvas2DRecorder,
} from "./canvas.js"
import { parseDragData } from "./drag-data.js"
import { EVENT_PROP_TO_TYPE, nativeEventTypeForDomEvent, type DomCompatTarget, type EventRegistry } from "./events.js"
import type { MutationDriver, MutationValue } from "./mutations.js"
import type {
  DragData,
  ElementType,
  HostEventHandler,
  NativeRenderer,
  PublicInstance,
  StyleDesc,
  VideoFrameSurfaceFrame,
} from "./types.js"

const RESERVED_PROPS = new Set(["children", "ref", "style", "className", "key", "dragData", "frame"])
const BUILT_IN_TYPES = new Set<ElementType>(["div", "text"])
const UNIVERSAL_PROPS = new Set(["autoFocus", "tabIndex", "motion", "testId", "highlight", "title"])

const RANGE_INPUT_PROPS = new Set(["type", "min", "max", "step", "value", "disabled"])

function isRangeInput(node: HostElementNode): boolean {
  return node.localName === "input" && String(node.props.get("type") ?? "").toLowerCase() === "range"
}

function isForwardedBuiltInProp(node: HostElementNode, name: string): boolean {
  return UNIVERSAL_PROPS.has(name) ||
    name === "hidden" ||
    name === "role" ||
    name.startsWith("aria-") ||
    (node.localName === "select" && name === "value") ||
    (isRangeInput(node) && RANGE_INPUT_PROPS.has(name))
}
const DOCUMENT_POSITION_DISCONNECTED = 0x01
const DOCUMENT_POSITION_PRECEDING = 0x02
const DOCUMENT_POSITION_FOLLOWING = 0x04
const DOCUMENT_POSITION_CONTAINS = 0x08
const DOCUMENT_POSITION_CONTAINED_BY = 0x10
const DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20

type BoundsCapableRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
}

type HostStyleDeclaration = StyleDesc & {
  setProperty(name: string, value: string, priority?: string): void
  removeProperty(name: string): string
  getPropertyValue(name: string): string
}

const customStyleProperties = new WeakMap<HostElementNode, Map<string, string>>()
const appliedPointerEvents = new WeakMap<HostElementNode, StyleDesc["pointerEvents"] | undefined>()
const INTERACTIVE_TAG_NAMES = new Set(["a", "button", "input", "label", "select", "summary", "textarea"])
const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "option",
  "radio",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
])

export class HostRootNode {
  readonly kind = "root" as const
  readonly children: HostNode[] = []
  readonly events: EventRegistry
  readonly driver: MutationDriver
  #nextId = 1

  constructor(renderer: NativeRenderer, events: EventRegistry, driver: MutationDriver) {
    if (driver.renderer !== renderer) throw new Error("Mutation driver renderer mismatch")
    this.events = events
    this.driver = driver
  }

  allocateId(): number {
    return this.#nextId++
  }
}

export class HostElementNode implements PublicInstance, DomCompatTarget {
  static readonly DOCUMENT_POSITION_DISCONNECTED = DOCUMENT_POSITION_DISCONNECTED
  static readonly DOCUMENT_POSITION_PRECEDING = DOCUMENT_POSITION_PRECEDING
  static readonly DOCUMENT_POSITION_FOLLOWING = DOCUMENT_POSITION_FOLLOWING
  static readonly DOCUMENT_POSITION_CONTAINS = DOCUMENT_POSITION_CONTAINS
  static readonly DOCUMENT_POSITION_CONTAINED_BY = DOCUMENT_POSITION_CONTAINED_BY
  static readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC

  readonly kind = "element" as const
  readonly type: ElementType
  nativeType: ElementType
  readonly tagName: string
  readonly localName: string
  readonly nodeName: string
  readonly children: HostNode[] = []
  parent: HostParent | null = null
  root: HostRootNode | null = null
  id = 0
  nativeAlive = false
  style: HostStyleDeclaration
  readonly props = new Map<string, MutationValue>()
  dragData: DragData | undefined
  readonly events = new Map<string, HostEventHandler>()
  readonly classList = {
    add: (..._tokens: string[]): void => undefined,
    remove: (..._tokens: string[]): void => undefined,
  }
  readonly #eventListeners = new Map<string, Set<EventListenerOrEventListenerObject>>()
  #canvas2d: Canvas2DRecorder | undefined
  #canvasDrawQueued = false
  #videoFrame: VideoFrameSurfaceFrame | null | undefined

  constructor(type: ElementType, tagName: string = type) {
    this.type = type
    this.nativeType = type
    this.localName = tagName
    this.tagName = tagName.toUpperCase()
    this.nodeName = this.tagName
    this.style = createHostStyleDeclaration(this, {})
  }

  get ownerDocument(): Document {
    return document
  }

  get offsetParent(): HostElementNode | null {
    return null
  }

  get parentNode(): HostElementNode | null {
    return this.parent?.kind === "element" ? this.parent : null
  }

  get parentElement(): HostElementNode | null {
    return this.parentNode
  }

  getContext(contextId: string): CanvasRenderingContext2D | null {
    if (this.localName !== "canvas" || contextId !== "2d") return null
    const root = this.root
    if (!root || !this.nativeAlive) return null
    if (root.driver.renderer.getCanvasDrawListVersion?.() !== CANVAS_DRAW_LIST_VERSION) return null

    this.#canvas2d ??= createCanvas2DRecorder(
      () => ({ width: this.width, height: this.height }),
      () => this.#scheduleCanvasDrawList(),
    )
    this.#scheduleCanvasDrawList()
    return this.#canvas2d.context
  }

  get width(): number {
    return canvasDimension(this.props.get("width"), 300)
  }

  set width(value: number) {
    setHostProperty(this, "width", canvasDimension(value, 300))
  }

  get height(): number {
    return canvasDimension(this.props.get("height"), 150)
  }

  set height(value: number) {
    setHostProperty(this, "height", canvasDimension(value, 150))
  }

  resetCanvas2D(): void {
    this.#canvas2d?.reset()
  }

  setVideoFrame(frame: VideoFrameSurfaceFrame | null): void {
    this.#videoFrame = frame
    this.syncVideoFrameSurface()
  }

  syncVideoFrameSurface(): void {
    if (this.localName !== "video-frame" || this.#videoFrame === undefined) return
    const root = this.root
    if (!root || !this.nativeAlive) return
    const renderer = root.driver.renderer
    if (renderer.getVideoFrameSurfaceVersion?.() !== 1) return

    root.driver.flush()
    const frame = this.#videoFrame
    if (frame === null) {
      renderer.clearVideoFrame?.(this.id)
      return
    }
    renderer.setVideoFrameBgra?.(this.id, frame.width, frame.height, frame.data)
  }

  #scheduleCanvasDrawList(): void {
    if (this.#canvasDrawQueued) return
    this.#canvasDrawQueued = true
    queueMicrotask(() => {
      this.#canvasDrawQueued = false
      const root = this.root
      const recorder = this.#canvas2d
      if (!root || !recorder || !this.nativeAlive) return
      if (root.driver.renderer.getCanvasDrawListVersion?.() !== CANVAS_DRAW_LIST_VERSION) return
      root.driver.enqueue("setCustomProp", this.id, "drawList", recorder.snapshot())
      root.driver.flush()
    })
  }

  get clientWidth(): number {
    return this.getBoundingClientRect().width
  }

  get clientHeight(): number {
    return this.getBoundingClientRect().height
  }

  get clientLeft(): number {
    return 0
  }

  get clientTop(): number {
    return 0
  }

  get offsetWidth(): number {
    return this.getBoundingClientRect().width
  }

  get offsetHeight(): number {
    return this.getBoundingClientRect().height
  }

  get scrollWidth(): number {
    return this.clientWidth
  }

  get scrollHeight(): number {
    return this.clientHeight
  }

  get value(): string {
    const value = this.props.get("value")
    return value === null || value === undefined ? "" : String(value)
  }

  set value(value: string) {
    setHostProperty(this, "value", value)
  }

  get checked(): boolean {
    return this.props.get("checked") === true
  }

  set checked(value: boolean) {
    setHostProperty(this, "checked", Boolean(value))
  }

  focus(): void {
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.enqueue("setEventListener", this.id, "keyDown", true)
    root.driver.enqueue("setEventListener", this.id, "keyUp", true)
    root.driver.flush()
    root.driver.renderer.focusElement?.(this.id)
  }

  blur(): void {
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.blur?.()
  }

  scrollIntoView(): void {
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.scrollIntoView?.(this.id)
  }

  setImage(bytes: Uint8Array): void {
    if (this.localName !== "img") return
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.setImage?.(this.id, bytes)
  }

  setImagePixels(width: number, height: number, pixels: Uint8Array): void {
    if (this.localName !== "img") return
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.setImagePixels?.(this.id, width, height, pixels)
  }

  select(): void {
    this.focus()
  }

  get scrollLeft(): number {
    const offset = this.scrollOffset()
    return -(offset?.[0] ?? 0)
  }

  set scrollLeft(value: number) {
    this.setScrollOffset(value, this.scrollTop)
  }

  get scrollTop(): number {
    const offset = this.scrollOffset()
    return -(offset?.[1] ?? 0)
  }

  set scrollTop(value: number) {
    this.setScrollOffset(this.scrollLeft, value)
  }

  setPointerCapture(pointerId: number): void {
    const root = this.root
    if (!root || !this.nativeAlive) throw new DOMException("Pointer capture target is not connected", "InvalidStateError")
    root.events.setPointerCapture(this.id, pointerId)
  }

  releasePointerCapture(pointerId: number): void {
    this.root?.events.releasePointerCapture(this.id, pointerId)
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.root?.events.hasPointerCapture(this.id, pointerId) ?? false
  }

  compareDocumentPosition(other: HostElementNode): number {
    return compareHostDocumentPosition(this, other)
  }

  get dataset() {
    const dataset: Record<string, string> = {}
    for (const [name, value] of this.props) {
      if (!name.startsWith("data-") || value === null || value === undefined) continue
      dataset[dataAttributeProperty(name.slice(5))] = String(value)
    }
    return dataset
  }

  getAttribute(name: string): string | null {
    const value = this.props.get(name)
    return value === null || value === undefined ? null : String(value)
  }

  hasAttribute(name: string): boolean {
    return this.props.has(name)
  }

  setAttribute(name: string, value: string): void {
    setHostProperty(this, name, String(value))
  }

  removeAttribute(name: string): void {
    setHostProperty(this, name, undefined)
  }

  contains(other: HostElementNode | null): boolean {
    if (!other) return false
    let current: HostElementNode | null = other
    while (current) {
      if (current === this) return true
      current = current.parentElement
    }
    return false
  }

  matches(selector: string): boolean {
    return selector.split(",").some((candidate) => matchesSimpleSelector(this, candidate.trim()))
  }

  closest(selector: string): HostElementNode | null {
    if (this.matches(selector)) return this
    let current = this.parentElement
    while (current) {
      if (current.matches(selector)) return current
      current = current.parentElement
    }
    return null
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (!listener) return
    const listeners = this.#eventListeners.get(type) ?? new Set<EventListenerOrEventListenerObject>()
    listeners.add(listener)
    this.#eventListeners.set(type, listeners)
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (!listener) return
    const listeners = this.#eventListeners.get(type)
    listeners?.delete(listener)
    if (listeners?.size === 0) this.#eventListeners.delete(type)
  }

  dispatchEvent(event: Event): boolean {
    if (event.target === null) {
      Object.defineProperty(event, "target", { configurable: true, value: this })
    }
    Object.defineProperty(event, "currentTarget", { configurable: true, value: this })
    for (const listener of this.#eventListeners.get(event.type) ?? []) {
      if (listener instanceof Function) listener.call(this, event)
      else listener.handleEvent(event)
    }
    return !event.defaultPrevented
  }

  getBoundingClientRect(): {
    x: number
    y: number
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
    toJSON(): Record<string, number>
  } {
    const root = this.root
    if (!root || !this.nativeAlive) return emptyBounds()
    root.driver.flush()
    // SAFETY: The installed GPUIX production/test renderers expose getElementBounds; the optional capability keeps older bindings compatible.
    const renderer = root.driver.renderer as BoundsCapableRenderer
    const bounds = renderer.getElementBounds?.(this.id)
    if (!bounds || bounds.length < 4) return emptyBounds()
    const x = bounds[0] ?? 0
    const y = bounds[1] ?? 0
    const width = bounds[2] ?? 0
    const height = bounds[3] ?? 0
    const paddingLeft = this.type === "div" ? this.style.paddingLeft ?? this.style.padding ?? 0 : 0
    const paddingTop = this.type === "div" ? this.style.paddingTop ?? this.style.padding ?? 0 : 0
    return domBounds(x - paddingLeft, y - paddingTop, width, height)
  }

  private scrollOffset(): number[] | null {
    const root = this.root
    if (!root || !this.nativeAlive) return null
    root.driver.flush()
    return root.driver.renderer.getScrollOffset?.(this.id) ?? null
  }

  private setScrollOffset(left: number, top: number): void {
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.scrollTo?.(this.id, -Math.max(0, left), -Math.max(0, top))
  }
}

export class HostTextNode {
  readonly kind = "text" as const
  readonly type = "text" as const
  readonly children: HostNode[] = []
  parent: HostParent | null = null
  root: HostRootNode | null = null
  id = 0
  nativeAlive = false
  text: string

  constructor(text: string) {
    this.text = text
  }
}

const appliedTextPointerEvents = new WeakMap<HostTextNode, StyleDesc["pointerEvents"] | undefined>()

export type HostNode = HostElementNode | HostTextNode
export type HostParent = HostRootNode | HostElementNode
type HostTreeNode = HostRootNode | HostNode

export function createHostElement(type: string, tagName = type): HostElementNode {
  if (!isElementType(type)) throw new Error(`Unsupported GPUIX element <${type}>`)
  return new HostElementNode(type, tagName)
}

export function createHostText(value: string): HostTextNode {
  return new HostTextNode(String(value))
}

export function replaceHostText(node: HostTextNode, value: string): void {
  const text = String(value)
  if (node.text === text) return
  const layoutChanged = (node.text.length === 0) !== (text.length === 0)
  node.text = text
  if (!node.root || !node.nativeAlive) return
  node.root.driver.enqueue("setText", node.id, text)
  if (layoutChanged) node.root.driver.enqueue("setStyle", node.id, nativeTextStyle(node))
}

export function setHostProperty<T>(
  node: HostNode,
  name: string,
  value: T,
  _previous?: T,
): void {
  if (node.kind === "text") return
  if (name === "children" || name === "ref" || name === "key") return

  if (name === "style") {
    const previousPointerEvents = effectivePointerEvents(node)
    node.style = createHostStyleDeclaration(node, isStyle(value) ? value : {})
    if (node.root && node.nativeAlive) {
      const nextPointerEvents = effectivePointerEvents(node)
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
      if (previousPointerEvents !== nextPointerEvents) {
        for (const child of node.children) refreshInheritedPointerEvents(child)
      }
    }
    return
  }

  if (node.localName === "video-frame" && name === "frame") {
    node.setVideoFrame(parseVideoFrameSurfaceFrame(value))
    return
  }

  if (name === "dragData") {
    const previousDragNativeHandlers = new Map(
      (["mouseDown", "mouseMove", "mouseUp"] as const).map((nativeType) => [
        nativeType,
        hasNativeEventHandler(node, nativeType),
      ]),
    )
    node.dragData = parseDragData(value)
    if (!node.root || !node.nativeAlive) return
    node.root.events.setDragData(node.id, node.dragData)
    for (const nativeType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      const previous = previousDragNativeHandlers.get(nativeType) ?? false
      const next = hasNativeEventHandler(node, nativeType)
      if (previous !== next) node.root.driver.enqueue("setEventListener", node.id, nativeType, next)
    }
    const nextPointerEvents = effectivePointerEvents(node)
    node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
    appliedPointerEvents.set(node, nextPointerEvents)
    return
  }

  const eventType = EVENT_PROP_TO_TYPE.get(name)
  if (eventType) {
    const previousPointerEvents = effectivePointerEvents(node)
    const nativeEventType = nativeEventTypeForDomEvent(eventType)
    const hadNativeHandler = nativeEventType ? hasNativeEventHandler(node, nativeEventType) : false
    const hadNativeClickHandler = hasNativeEventHandler(node, "click")
    const hadRangeNativeHandlers = new Map(
      (["mouseDown", "mouseMove", "mouseUp"] as const).map((nativeType) => [nativeType, hasNativeEventHandler(node, nativeType)]),
    )
    const handler = isHostEventHandler(value) ? value : undefined
    if (handler) node.events.set(eventType, handler)
    else node.events.delete(eventType)

    if (!node.root || !node.nativeAlive) return
    if (handler) node.root.events.set(node.id, eventType, handler)
    else node.root.events.delete(node.id, eventType)
    if (eventType === "contextMenu") {
      node.root.driver.setContextMenuListener(node.id, handler !== undefined)
    }

    if (nativeEventType) {
      const hasNativeHandler = hasNativeEventHandler(node, nativeEventType)
      if (hadNativeHandler != hasNativeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, nativeEventType, hasNativeHandler)
      }
    }
    if (nativeEventType !== "click") {
      const hasNativeClickHandler = hasNativeEventHandler(node, "click")
      if (hadNativeClickHandler !== hasNativeClickHandler) {
        node.root.driver.enqueue("setEventListener", node.id, "click", hasNativeClickHandler)
      }
    }
    for (const rangeNativeType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      const hadRangeHandler = hadRangeNativeHandlers.get(rangeNativeType) ?? false
      const hasRangeHandler = hasNativeEventHandler(node, rangeNativeType)
      if (hadRangeHandler !== hasRangeHandler) {
        node.root.driver.enqueue("setEventListener", node.id, rangeNativeType, hasRangeHandler)
      }
    }

    const nextPointerEvents = effectivePointerEvents(node)
    if (previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
    }
    return
  }

  const previousPointerEvents = name === "role" ? effectivePointerEvents(node) : undefined
  const previousTypeClickHandler = name === "type" ? hasNativeEventHandler(node, "click") : false
  const previousTypeRangeHandlers = name === "type"
    ? new Map((["mouseDown", "mouseMove", "mouseUp"] as const).map((nativeType) => [nativeType, hasNativeEventHandler(node, nativeType)]))
    : undefined
  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))

  if (node.localName === "canvas" && (name === "width" || name === "height")) {
    node.resetCanvas2D()
  }

  if (name === "type" && node.tagName === "INPUT" && !node.nativeAlive) {
    node.nativeType = String(value).toLowerCase() === "range" ? "div" : "input"
  }

  if (node.root && node.nativeAlive && name === "role") {
    const nextPointerEvents = effectivePointerEvents(node)
    if (previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
      appliedPointerEvents.set(node, nextPointerEvents)
    }
  }
  if (node.root && node.nativeAlive && name === "type") {
    const nextTypeClickHandler = hasNativeEventHandler(node, "click")
    if (previousTypeClickHandler !== nextTypeClickHandler) {
      node.root.driver.enqueue("setEventListener", node.id, "click", nextTypeClickHandler)
    }
    for (const rangeNativeType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      const previous = previousTypeRangeHandlers?.get(rangeNativeType) ?? false
      const next = hasNativeEventHandler(node, rangeNativeType)
      if (previous !== next) node.root.driver.enqueue("setEventListener", node.id, rangeNativeType, next)
    }
    node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node))
  }
  if (!node.root || !node.nativeAlive || isReserved(name)) return
  if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(node, name)) return
  node.root.driver.enqueue("setCustomProp", node.id, name, customPropValue(value))
}

export function insertHostNode(parent: HostParent, node: HostNode, anchor?: HostNode | null): void {
  if (anchor && anchor.parent !== parent) throw new Error("GPUIX Solid anchor is not a child of parent")
  if (parent.kind === "root" && parent.children.length > 0 && parent.children[0] !== node) {
    throw new Error("GPUIX native roots support one top-level host node")
  }

  const root = rootOf(parent)
  if (!root && node.root) {
    throw new Error("Cannot move an adopted GPUIX host node under a detached parent")
  }
  if (root) adopt(root, node)

  const oldParent = node.parent
  if (oldParent) removeFromChildren(oldParent, node)

  const index = anchor ? parent.children.indexOf(anchor) : parent.children.length
  parent.children.splice(index, 0, node)
  node.parent = parent

  if (root) refreshInheritedPointerEvents(node)
  if (!root) return
  if (parent.kind === "root") {
    root.driver.enqueue("setRoot", node.id)
    return
  }

  if (anchor) root.driver.enqueue("insertBefore", parent.id, node.id, anchor.id)
  else root.driver.enqueue("appendChild", parent.id, node.id)
}

export function removeHostNode(parent: HostParent, node: HostNode): void {
  if (node.parent !== parent) return
  removeFromChildren(parent, node)
  node.parent = null
  const root = rootOf(parent)
  if (!root || !node.root) return
  if (parent.kind === "element") root.driver.enqueue("removeChild", parent.id, node.id)
  markNativeDead(root, node)
  root.driver.enqueue("destroyElement", node.id)
}

export function getParentNode(node: HostNode): HostParent | undefined {
  return node.parent ?? undefined
}

export function getFirstChild(parent: HostParent): HostNode | undefined {
  return parent.children[0]
}

export function getNextSibling(node: HostNode): HostNode | undefined {
  const parent = node.parent
  if (!parent) return undefined
  const index = parent.children.indexOf(node)
  return index < 0 ? undefined : parent.children[index + 1]
}

export function isHostTextNode(node: HostNode | HostParent): node is HostTextNode {
  return node.kind === "text"
}

function nativeTextLayoutStyle(text: string): StyleDesc {
  return text.length === 0
    ? {
        display: "none",
        width: 0,
        height: 0,
        minWidth: 0,
        minHeight: 0,
        maxWidth: 0,
        maxHeight: 0,
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 0,
      }
    : {}
}

function inheritedTextPointerEvents(node: HostTextNode): StyleDesc["pointerEvents"] | undefined {
  let parent = node.parent
  while (parent?.kind === "element") {
    const pointerEvents = parent.style.pointerEvents
    if (pointerEvents === "none") return "none"
    if (pointerEvents === "auto") return undefined
    parent = parent.parent
  }
  return undefined
}

function nativeTextStyle(
  node: HostTextNode,
  pointerEvents = inheritedTextPointerEvents(node),
): StyleDesc {
  const layout = nativeTextLayoutStyle(node.text)
  if (pointerEvents === undefined) return layout
  return { ...layout, pointerEvents }
}

function canvasDimension(value: MutationValue | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function dataAttributeProperty(name: string): string {
  return name.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
}

function matchesSimpleSelector(node: HostElementNode, selector: string): boolean {
  if (!selector) return false
  const attribute = selector.match(/^\[([A-Za-z_:][\w:.-]*)(?:=(['"]?)(.*?)\2)?\]$/)
  if (attribute) {
    const name = attribute[1]
    if (!name || !node.hasAttribute(name)) return false
    const expected = attribute[3]
    return expected === undefined || node.getAttribute(name) === expected
  }
  return /^[A-Za-z][A-Za-z0-9-]*$/.test(selector) && node.localName === selector.toLowerCase()
}

function compareHostDocumentPosition(reference: HostNode, other: HostNode): number {
  if (reference === other) return 0

  const referencePath = hostTreePath(reference)
  const otherPath = hostTreePath(other)
  if (referencePath[0] !== otherPath[0]) {
    return DOCUMENT_POSITION_DISCONNECTED | DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
  }

  const sharedLength = Math.min(referencePath.length, otherPath.length)
  let branchIndex = 0
  while (branchIndex < sharedLength && referencePath[branchIndex] === otherPath[branchIndex]) {
    branchIndex += 1
  }

  if (branchIndex === referencePath.length) {
    return DOCUMENT_POSITION_FOLLOWING | DOCUMENT_POSITION_CONTAINED_BY
  }
  if (branchIndex === otherPath.length) {
    return DOCUMENT_POSITION_PRECEDING | DOCUMENT_POSITION_CONTAINS
  }

  const sharedParent = referencePath[branchIndex - 1]
  const referenceBranch = referencePath[branchIndex]
  const otherBranch = otherPath[branchIndex]
  if (!sharedParent || !referenceBranch || !otherBranch || referenceBranch.kind === "root" || otherBranch.kind === "root") {
    return DOCUMENT_POSITION_DISCONNECTED | DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
  }

  const referenceIndex = sharedParent.children.indexOf(referenceBranch)
  const otherIndex = sharedParent.children.indexOf(otherBranch)
  if (referenceIndex < 0 || otherIndex < 0) {
    return DOCUMENT_POSITION_DISCONNECTED | DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
  }
  return otherIndex < referenceIndex ? DOCUMENT_POSITION_PRECEDING : DOCUMENT_POSITION_FOLLOWING
}

function hostTreePath(node: HostNode): HostTreeNode[] {
  const path: HostTreeNode[] = [node]
  let parent = node.parent
  while (parent) {
    path.unshift(parent)
    parent = parent.kind === "root" ? null : parent.parent
  }
  return path
}

function inheritedPointerEvents(node: HostElementNode): StyleDesc["pointerEvents"] | undefined {
  let parent = node.parent
  while (parent?.kind === "element") {
    if (parent.style.pointerEvents !== undefined) return parent.style.pointerEvents
    parent = parent.parent
  }
  return undefined
}

function ownsSemanticHitSurface(node: HostElementNode): boolean {
  if (INTERACTIVE_TAG_NAMES.has(node.localName)) return true
  const role = node.props.get("role")
  return role !== undefined && role !== null && INTERACTIVE_ROLES.has(String(role))
}

function effectivePointerEvents(node: HostElementNode): StyleDesc["pointerEvents"] | undefined {
  // Preserve explicit source ownership first. In particular, a descendant
  // pointer-events:auto must be able to re-enable itself beneath an inherited none.
  if (node.style.pointerEvents !== undefined) return node.style.pointerEvents

  // Browser pointer-events:none applies through the subtree until a descendant
  // explicitly re-enables itself. Materialize only that inherited none; inherited
  // auto is intentionally left implicit so decorative descendants do not become
  // separate GPUIX hit targets.
  if (inheritedPointerEvents(node) === "none") return "none"

  // GPUIX 0.7 needs an explicit hit surface for transparent semantic controls.
  // Plain event-bearing divs keep their existing paint/hit behavior so parent
  // containers do not become new occluding surfaces.
  if (
    node.dragData !== undefined
    || node.events.has("fileDrop")
    || node.events.has("dragOver")
    || node.events.has("drop")
    || (node.events.size > 0 && ownsSemanticHitSurface(node))
  ) return "auto"
  return undefined
}

function nativeStyleFor(
  node: HostElementNode,
  pointerEvents = effectivePointerEvents(node),
): StyleDesc {
  // Browser range controls contribute their intrinsic width to auto flex sizing,
  // but an authored width such as w-full must still be allowed to shrink below
  // that preferred size. Preserve the 129px browser-like basis while removing
  // the 129px minimum that previously forced compact mixer cells to overflow.
  let style: StyleDesc = isRangeInput(node)
    ? node.style.width === undefined
      ? { minHeight: 16, height: 16, width: 129, minWidth: 129, ...node.style }
      : node.style.width === "100%"
        ? { minHeight: 16, height: 16, ...node.style, width: 129, minWidth: 0, flexShrink: 1 }
        : { minHeight: 16, height: 16, minWidth: 0, ...node.style }
    : node.style
  if (node.dragData !== undefined && node.style.userSelect === undefined) {
    style = { ...style, userSelect: "none" }
  }
  if (node.style.pointerEvents !== undefined || pointerEvents === undefined) return style
  return { ...style, pointerEvents }
}

function refreshInheritedPointerEvents(node: HostNode): void {
  if (node.kind === "text") {
    const nextPointerEvents = inheritedTextPointerEvents(node)
    const previousPointerEvents = appliedTextPointerEvents.get(node)
    if (node.root && node.nativeAlive && previousPointerEvents !== nextPointerEvents) {
      node.root.driver.enqueue("setStyle", node.id, nativeTextStyle(node, nextPointerEvents))
      appliedTextPointerEvents.set(node, nextPointerEvents)
    }
    return
  }
  const nextPointerEvents = effectivePointerEvents(node)
  const previousPointerEvents = appliedPointerEvents.get(node)
  if (node.root && node.nativeAlive && previousPointerEvents !== nextPointerEvents) {
    // A transition back to undefined intentionally sends the base style once so
    // a previously materialized auto/none value is cleared natively.
    node.root.driver.enqueue("setStyle", node.id, nativeStyleFor(node, nextPointerEvents))
    appliedPointerEvents.set(node, nextPointerEvents)
  }
  for (const child of node.children) refreshInheritedPointerEvents(child)
}

function createHostStyleDeclaration(node: HostElementNode, style: StyleDesc): HostStyleDeclaration {
  // SAFETY: methods are installed non-enumerably so native style serialization sees only StyleDesc fields.
  const declaration = { ...style } as HostStyleDeclaration
  Object.defineProperties(declaration, {
    setProperty: {
      enumerable: false,
      value: (name: string, value: string, _priority?: string) => {
        const properties = customStyleProperties.get(node) ?? new Map<string, string>()
        properties.set(name, String(value))
        customStyleProperties.set(node, properties)
      },
    },
    removeProperty: {
      enumerable: false,
      value: (name: string) => {
        const properties = customStyleProperties.get(node)
        const previous = properties?.get(name) ?? ""
        properties?.delete(name)
        return previous
      },
    },
    getPropertyValue: {
      enumerable: false,
      value: (name: string) => customStyleProperties.get(node)?.get(name) ?? "",
    },
  })
  return declaration
}

function adopt(root: HostRootNode, node: HostNode): void {
  if (node.root && node.root !== root) {
    throw new Error("Cannot insert a GPUIX host node into a different root")
  }
  if (!node.root) {
    node.root = root
    node.id = root.allocateId()
  }
  if (node.nativeAlive) return

  if (node.kind === "element" && node.localName === "canvas") {
    node.nativeType = root.driver.renderer.getCanvasDrawListVersion?.() === CANVAS_DRAW_LIST_VERSION
      ? "canvas"
      : "div"
  }
  if (node.kind === "element" && node.localName === "video-frame") {
    node.nativeType = root.driver.renderer.getVideoFrameSurfaceVersion?.() === 1
      ? "video-frame"
      : "div"
  }

  node.nativeAlive = true
  root.events.activate(node.id)
  root.driver.enqueue("createElement", node.id, node.kind === "element" ? node.nativeType : node.type)

  if (node.kind === "text") {
    root.driver.enqueue("setText", node.id, node.text)
    const pointerEvents = inheritedTextPointerEvents(node)
    const nativeStyle = nativeTextStyle(node, pointerEvents)
    if (Object.keys(nativeStyle).length > 0) {
      root.driver.enqueue("setStyle", node.id, nativeStyle)
    }
    appliedTextPointerEvents.set(node, pointerEvents)
  } else {
    root.events.setTarget(node.id, node)
    if (node.dragData !== undefined) root.events.setDragData(node.id, node.dragData)
    const nativeEventTypes = new Set<string>()
    const pointerEvents = effectivePointerEvents(node)
    const nativeStyle = nativeStyleFor(node, pointerEvents)
    if (Object.keys(nativeStyle).length > 0) {
      root.driver.enqueue("setStyle", node.id, nativeStyle)
    }
    appliedPointerEvents.set(node, pointerEvents)
    for (const [eventType, handler] of node.events) {
      root.events.set(node.id, eventType, handler)
      const nativeEventType = nativeEventTypeForDomEvent(eventType)
      if (nativeEventType) nativeEventTypes.add(nativeEventType)
    }
    if (node.events.has("contextMenu")) root.driver.setContextMenuListener(node.id, true)
    for (const nativeEventType of ["mouseDown", "mouseMove", "mouseUp"] as const) {
      if (hasNativeEventHandler(node, nativeEventType)) nativeEventTypes.add(nativeEventType)
    }
    if (hasCheckboxActivationHandler(node)) nativeEventTypes.add("click")
    if (hasRangeChangeHandler(node)) {
      nativeEventTypes.add("mouseDown")
      nativeEventTypes.add("mouseMove")
      nativeEventTypes.add("mouseUp")
    }
    for (const eventType of nativeEventTypes) {
      root.driver.enqueue("setEventListener", node.id, eventType, true)
    }
    for (const [name, value] of node.props) {
      if (isReserved(name)) continue
      if (BUILT_IN_TYPES.has(node.nativeType) && !isForwardedBuiltInProp(node, name)) continue
      root.driver.enqueue("setCustomProp", node.id, name, customPropValue(value))
    }
    node.syncVideoFrameSurface()
  }

  for (const child of node.children) {
    adopt(root, child)
    root.driver.enqueue("appendChild", node.id, child.id)
  }
}

function hasCheckboxActivationHandler(node: HostElementNode): boolean {
  return node.tagName === "INPUT" &&
    String(node.props.get("type") ?? "").toLowerCase() === "checkbox" &&
    (node.events.has("change") || node.events.has("input"))
}

function hasRangeChangeHandler(node: HostElementNode): boolean {
  return isRangeInput(node) && (node.events.has("change") || node.events.has("input"))
}

function hasNativeEventHandler(node: HostElementNode, nativeEventType: string): boolean {
  const hasDragSource = node.dragData !== undefined
  // GPUI implicitly captures a pointer when a node owns mouseDown + mouseMove at
  // press time. Pre-arm drag sources for mouseDown only; BrowserPointerMutationDriver
  // adds move/up after the physical press, while drop targets may safely own
  // move/up because they do not own the source mouseDown.
  if (nativeEventType === "mouseDown" && hasDragSource) return true
  if (nativeEventType === "mouseMove" && node.events.has("dragOver")) return true
  if (nativeEventType === "mouseUp" && node.events.has("drop")) return true
  if (nativeEventType === "click" && hasCheckboxActivationHandler(node)) return true
  if ((nativeEventType === "mouseDown" || nativeEventType === "mouseMove" || nativeEventType === "mouseUp") && hasRangeChangeHandler(node)) return true
  for (const eventType of node.events.keys()) {
    if (nativeEventTypeForDomEvent(eventType) === nativeEventType) return true
  }
  return false
}

function markNativeDead(root: HostRootNode, node: HostNode): void {
  node.nativeAlive = false
  root.events.deactivate(node.id)
  for (const child of node.children) markNativeDead(root, child)
}

function rootOf(parent: HostParent): HostRootNode | null {
  return parent.kind === "root" ? parent : parent.root
}

function removeFromChildren(parent: HostParent, node: HostNode): void {
  const index = parent.children.indexOf(node)
  if (index >= 0) parent.children.splice(index, 1)
}

function isReserved(name: string): boolean {
  return RESERVED_PROPS.has(name) || EVENT_PROP_TO_TYPE.has(name)
}

function customPropValue<T>(value: T): MutationValue {
  if (value === undefined || isHostEventHandler(value)) return null
  if (isMutationValue(value)) {
    return value
  }
  return String(value)
}

function isMutationValue<T>(value: T): value is T & MutationValue {
  return value === null || typeof value === "string" || typeof value === "number" ||
    typeof value === "boolean" || isObjectValue(value)
}

function isHostEventHandler<T>(value: T): value is T & HostEventHandler {
  return typeof value === "function"
}

function isObjectValue<T>(value: T): value is T & object {
  return value !== null && typeof value === "object"
}

function isStyle<T>(value: T): value is T & StyleDesc {
  return isObjectValue(value) && !Array.isArray(value)
}

function parseVideoFrameSurfaceFrame<T>(value: T): VideoFrameSurfaceFrame | null {
  if (value === null || value === undefined) return null
  if (!isObjectValue(value)) throw new TypeError("video-frame frame must be an object")

  // SAFETY: the object shape is validated field-by-field below before a frame is returned.
  const candidate = value as Partial<VideoFrameSurfaceFrame>
  if (!(candidate.data instanceof Uint8Array)) {
    throw new TypeError("video-frame frame.data must be a Uint8Array")
  }
  if (!Number.isInteger(candidate.width) || Number(candidate.width) <= 0) {
    throw new TypeError("video-frame frame.width must be a positive integer")
  }
  if (!Number.isInteger(candidate.height) || Number(candidate.height) <= 0) {
    throw new TypeError("video-frame frame.height must be a positive integer")
  }

  const width = Number(candidate.width)
  const height = Number(candidate.height)
  const expectedBytes = width * height * 4
  if (!Number.isSafeInteger(expectedBytes) || candidate.data.byteLength !== expectedBytes) {
    throw new TypeError(
      `video-frame BGRA byte length mismatch: got ${candidate.data.byteLength}, expected ${expectedBytes}`,
    )
  }
  return { data: candidate.data, width, height }
}

function domBounds(x: number, y: number, width: number, height: number) {
  const right = x + width
  const bottom = y + height
  return {
    x,
    y,
    left: x,
    top: y,
    right,
    bottom,
    width,
    height,
    toJSON() {
      return { x, y, left: x, top: y, right, bottom, width, height }
    },
  }
}

function emptyBounds() {
  return domBounds(0, 0, 0, 0)
}

function installDomConstructors(): void {
  if (!Object.hasOwn(globalThis, "Node")) {
    Object.defineProperty(globalThis, "Node", {
      configurable: true,
      writable: true,
      value: HostElementNode,
    })
  }
  if (!Object.hasOwn(globalThis, "Element")) {
    Object.defineProperty(globalThis, "Element", {
      configurable: true,
      writable: true,
      value: HostElementNode,
    })
  }
  if (!Object.hasOwn(globalThis, "HTMLElement")) {
    Object.defineProperty(globalThis, "HTMLElement", {
      configurable: true,
      writable: true,
      value: HostElementNode,
    })
  }
}

function isElementType(value: string): value is ElementType {
  return [
    "div",
    "text",
    "img",
    "svg",
    "canvas",
    "video-frame",
    "input",
    "textarea",
    "anchored",
    "code",
    "diff",
    "markdown",
    "virtual-list",
  ].includes(value)
}

installDomConstructors()
