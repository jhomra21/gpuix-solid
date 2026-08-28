import { EVENT_PROP_TO_TYPE, type DomCompatTarget, type EventRegistry } from "./events.js"
import type { MutationDriver, MutationValue } from "./mutations.js"
import type {
  ElementType,
  HostEventHandler,
  NativeRenderer,
  PublicInstance,
  StyleDesc,
} from "./types.js"

const RESERVED_PROPS = new Set(["children", "ref", "style", "className", "key"])
const BUILT_IN_TYPES = new Set<ElementType>(["div", "text"])
const UNIVERSAL_PROPS = new Set(["autoFocus", "tabIndex", "motion", "testId"])

type BoundsCapableRenderer = NativeRenderer & {
  getElementBounds?(elementId: number): number[] | null
}

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
  readonly kind = "element" as const
  readonly type: ElementType
  readonly children: HostNode[] = []
  parent: HostParent | null = null
  root: HostRootNode | null = null
  id = 0
  nativeAlive = false
  style: StyleDesc = {}
  readonly props = new Map<string, MutationValue>()
  readonly events = new Map<string, HostEventHandler>()
  readonly classList = {
    add: (..._tokens: string[]): void => undefined,
    remove: (..._tokens: string[]): void => undefined,
  }
  readonly #capturedPointers = new Set<number>()

  constructor(type: ElementType) {
    this.type = type
  }

  get ownerDocument(): Document {
    return document
  }

  get value(): string {
    const value = this.props.get("value")
    return value === null || value === undefined ? "" : String(value)
  }

  set value(value: string) {
    setHostProperty(this, "value", value)
  }

  focus(): void {
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.focusElement?.(this.id)
  }

  blur(): void {
    const root = this.root
    if (!root || !this.nativeAlive) return
    root.driver.flush()
    root.driver.renderer.blur?.()
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
    this.#capturedPointers.add(pointerId)
  }

  releasePointerCapture(pointerId: number): void {
    this.#capturedPointers.delete(pointerId)
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.#capturedPointers.has(pointerId)
  }

  closest(_selector: string): HostElementNode | null {
    return null
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
    return domBounds(x, y, width, height)
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

installDomConstructors()

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

export type HostNode = HostElementNode | HostTextNode
export type HostParent = HostRootNode | HostElementNode

export function createHostElement(type: string): HostElementNode {
  if (!isElementType(type)) throw new Error(`Unsupported GPUIX element <${type}>`)
  return new HostElementNode(type)
}

export function createHostText(value: string): HostTextNode {
  return new HostTextNode(String(value))
}

export function replaceHostText(node: HostTextNode, value: string): void {
  const text = String(value)
  if (node.text === text) return
  node.text = text
  if (node.root && node.nativeAlive) node.root.driver.enqueue("setText", node.id, text)
}

export function setHostProperty<T>(
  node: HostNode,
  name: string,
  value: T,
  previous?: T,
): void {
  if (node.kind === "text") return
  if (name === "children" || name === "ref" || name === "key") return

  if (name === "style") {
    node.style = isStyle(value) ? value : {}
    if (node.root && node.nativeAlive) node.root.driver.enqueue("setStyle", node.id, node.style)
    return
  }

  const eventType = EVENT_PROP_TO_TYPE.get(name)
  if (eventType) {
    const oldHandler = isHostEventHandler(previous) ? previous : undefined
    const handler = isHostEventHandler(value) ? value : undefined
    if (handler) node.events.set(eventType, handler)
    else node.events.delete(eventType)

    if (!node.root || !node.nativeAlive) return
    if (handler) node.root.events.set(node.id, eventType, handler)
    else node.root.events.delete(node.id, eventType)
    if (Boolean(oldHandler) !== Boolean(handler)) {
      node.root.driver.enqueue("setEventListener", node.id, eventType, Boolean(handler))
    }
    return
  }

  if (value === undefined) node.props.delete(name)
  else node.props.set(name, customPropValue(value))
  if (!node.root || !node.nativeAlive || isReserved(name)) return
  if (BUILT_IN_TYPES.has(node.type) && !UNIVERSAL_PROPS.has(name)) return
  node.root.driver.enqueue("setCustomPropValue", node.id, name, customPropValue(value))
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

function adopt(root: HostRootNode, node: HostNode): void {
  if (node.root && node.root !== root) {
    throw new Error("Cannot insert a GPUIX host node into a different root")
  }
  if (!node.root) {
    node.root = root
    node.id = root.allocateId()
  }
  if (node.nativeAlive) return

  node.nativeAlive = true
  root.events.activate(node.id)
  root.driver.enqueue("createElement", node.id, node.type)

  if (node.kind === "text") {
    root.driver.enqueue("setText", node.id, node.text)
  } else {
    root.events.setTarget(node.id, node)
    if (Object.keys(node.style).length > 0) {
      root.driver.enqueue("setStyle", node.id, node.style)
    }
    for (const [eventType, handler] of node.events) {
      root.events.set(node.id, eventType, handler)
      root.driver.enqueue("setEventListener", node.id, eventType, true)
    }
    for (const [name, value] of node.props) {
      if (isReserved(name)) continue
      if (BUILT_IN_TYPES.has(node.type) && !UNIVERSAL_PROPS.has(name)) continue
      root.driver.enqueue("setCustomPropValue", node.id, name, customPropValue(value))
    }
  }

  for (const child of node.children) {
    adopt(root, child)
    root.driver.enqueue("appendChild", node.id, child.id)
  }
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
    "input",
    "textarea",
    "anchored",
    "code",
    "diff",
    "markdown",
    "virtual-list",
  ].includes(value)
}
