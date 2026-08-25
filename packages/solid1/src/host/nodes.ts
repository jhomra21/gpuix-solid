import { EVENT_PROP_TO_TYPE, type EventRegistry } from "./events.js"
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

export class HostElementNode implements PublicInstance {
  readonly kind = "element" as const
  readonly type: ElementType
  readonly children: HostNode[] = []
  parent: HostParent | null = null
  root: HostRootNode | null = null
  id = 0
  nativeAlive = false
  style: StyleDesc | undefined
  readonly props = new Map<string, MutationValue>()
  readonly events = new Map<string, HostEventHandler>()

  constructor(type: ElementType) {
    this.type = type
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
    node.style = isStyle(value) ? value : undefined
    if (node.root && node.nativeAlive) node.root.driver.enqueue("setStyle", node.id, node.style ?? {})
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
    if (node.style && Object.keys(node.style).length > 0) {
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
