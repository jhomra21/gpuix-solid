import {
  HostElementNode,
  createHostElement,
  insertHostNode,
  removeHostNode,
  setHostProperty,
} from "./host/nodes.js"

type CompatListener = (event: Event) => void

type CompatEventTarget = {
  addEventListener?: (type: string, listener: CompatListener | null) => void
  removeEventListener?: (type: string, listener: CompatListener | null) => void
  dispatchEvent?: (event: Event) => boolean
}

type CompatListenerTarget = CompatEventTarget | HostElementNode

type CompatRect = {
  x: number
  y: number
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

type CompatDataset = {
  liveAnnouncer: string | undefined
  reactAriaTopLayer: string | undefined
}

type CompatTreeElement = HostElementNode | CompatDocumentNode

type CompatTreeWalkerFilter = {
  acceptNode(node: HostElementNode): number
}

type CompatTreeWalker = {
  nextNode(): HostElementNode | null
}

type CompatDocument = CompatEventTarget & {
  body?: CompatDocumentNode
  documentElement?: CompatDocumentNode
  defaultView?: CompatWindow
  createElement?: (tagName: string) => HostElementNode
  createTreeWalker?: (
    root: CompatTreeElement,
    whatToShow: number,
    filter: CompatTreeWalkerFilter,
  ) => CompatTreeWalker
}

type CompatDocumentNode = CompatEventTarget & {
  ownerDocument: CompatDocument
  nodeName: string
  tagName: string
  localName: string
  parentElement: CompatDocumentNode | null
  readonly children: readonly CompatTreeElement[]
  readonly dataset: CompatDataset
  clientWidth: number
  clientHeight: number
  clientLeft: number
  clientTop: number
  scrollWidth: number
  scrollHeight: number
  scrollLeft: number
  scrollTop: number
  getAttribute(name: string): string | null
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  contains(node: CompatTreeElement): boolean
  querySelectorAll(selector: string): HostElementNode[]
  getBoundingClientRect(): CompatRect
}

type CompatImage = {
  onload: (() => void) | null
  onerror: (() => void) | null
  src: string
}

type CompatImageConstructor = new () => CompatImage

type CompatComputedStyle = {
  animationName: string
  animationDuration: string
  transitionDuration: string
  transitionProperty: string
  display: string
  direction: string
  position: string
  overflow: string
  overflowX: string
  overflowY: string
  width: string
  height: string
  paddingLeft: string
  paddingTop: string
  transform: string
  perspective: string
  containerType: string
  backdropFilter: string
  filter: string
  willChange: string
  contain: string
}

type CompatGetComputedStyle = (element: Element, pseudoElement?: string | null) => CompatComputedStyle

type CompatNodeFilter = {
  readonly FILTER_ACCEPT: 1
  readonly FILTER_REJECT: 2
  readonly FILTER_SKIP: 3
  readonly SHOW_ELEMENT: 1
}

type CompatMutationRecord = {
  type: "childList"
  target: CompatTreeElement
  addedNodes: HostElementNode[]
  removedNodes: HostElementNode[]
}

type CompatMutationCallback = (records: CompatMutationRecord[]) => void

type CompatMutationObserverConstructor = new (callback: CompatMutationCallback) => CompatMutationObserver

type CompatMutationObserverOptions = {
  childList?: boolean
  subtree?: boolean
}

type CompatAnimationFrameRequest = (callback: (time: number) => void) => ReturnType<typeof globalThis.setTimeout>
type CompatAnimationFrameCancel = (handle: ReturnType<typeof globalThis.setTimeout>) => void

type CompatWindow = CompatEventTarget & {
  document?: CompatDocument
  setTimeout?: (callback: () => void, delay?: number) => ReturnType<typeof globalThis.setTimeout>
  clearTimeout?: (handle: ReturnType<typeof globalThis.setTimeout>) => void
  requestAnimationFrame?: CompatAnimationFrameRequest
  cancelAnimationFrame?: CompatAnimationFrameCancel
  MutationObserver?: CompatMutationObserverConstructor
  NodeFilter?: CompatNodeFilter
  Image?: CompatImageConstructor
  Element?: typeof Element
  HTMLElement?: typeof HTMLElement
  Node?: typeof Node
  getComputedStyle?: CompatGetComputedStyle
  innerWidth?: number
  innerHeight?: number
  scrollX?: number
  scrollY?: number
  pageXOffset?: number
  pageYOffset?: number
}

type CompatMutationSnapshot = Map<HostElementNode, CompatTreeElement>

const listeners = new WeakMap<CompatListenerTarget, Map<string, Set<CompatListener>>>()
const knownRoots = new Set<HostElementNode>()
const NODE_FILTER: CompatNodeFilter = {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
  SHOW_ELEMENT: 1,
}
let activeBody: CompatDocumentNode | undefined
let hostDomCompatibilityInstalled = false
let nativeDomEnvironmentInstalled = false

export function installDomEventEnvironment(): void {
  if (nativeDomEnvironmentInstalled) return
  nativeDomEnvironmentInstalled = true

  const documentTarget: CompatDocument = {}
  const windowTarget: CompatWindow = {
    innerWidth: 800,
    innerHeight: 600,
    scrollX: 0,
    scrollY: 0,
    pageXOffset: 0,
    pageYOffset: 0,
  }

  const bodyTarget = createDocumentNode("body", documentTarget, windowTarget)
  const documentElementTarget = createDocumentNode("html", documentTarget, windowTarget)
  activeBody = bodyTarget
  connectDocumentTree(bodyTarget, documentElementTarget)
  installHostDomCompatibility(documentTarget)

  installEventTarget(documentTarget)
  installEventTarget(bodyTarget)
  installEventTarget(documentElementTarget)
  installEventTarget(windowTarget)
  documentTarget.body = bodyTarget
  documentTarget.documentElement = documentElementTarget
  documentTarget.defaultView = windowTarget
  documentTarget.createElement = createCompatElement
  documentTarget.createTreeWalker = createCompatTreeWalker
  windowTarget.document = documentTarget
  windowTarget.setTimeout = (callback, delay) => globalThis.setTimeout(callback, delay)
  windowTarget.clearTimeout = (handle) => globalThis.clearTimeout(handle)
  windowTarget.requestAnimationFrame = defaultRequestAnimationFrame
  windowTarget.cancelAnimationFrame = (handle) => globalThis.clearTimeout(handle)
  windowTarget.MutationObserver = CompatMutationObserver
  windowTarget.NodeFilter = NODE_FILTER
  windowTarget.Image = CompatImageLoader
  windowTarget.getComputedStyle = defaultComputedStyle
  Object.defineProperty(windowTarget, "Element", {
    configurable: true,
    get: () => globalThis.Element,
  })
  Object.defineProperty(windowTarget, "HTMLElement", {
    configurable: true,
    get: () => globalThis.HTMLElement,
  })
  Object.defineProperty(windowTarget, "Node", {
    configurable: true,
    get: () => globalThis.Node,
  })

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    writable: true,
    value: documentTarget,
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: windowTarget,
  })
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    writable: true,
    value: defaultComputedStyle,
  })
  Object.defineProperty(globalThis, "NodeFilter", {
    configurable: true,
    writable: true,
    value: NODE_FILTER,
  })
  Object.defineProperty(globalThis, "MutationObserver", {
    configurable: true,
    writable: true,
    value: CompatMutationObserver,
  })
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: defaultRequestAnimationFrame,
  })
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: (handle: ReturnType<typeof globalThis.setTimeout>) => globalThis.clearTimeout(handle),
  })
}

function createDocumentNode(
  tagName: "html" | "body",
  ownerDocument: CompatDocument,
  windowTarget: CompatWindow,
): CompatDocumentNode {
  const upperTagName = tagName.toUpperCase()
  const attributes = new Map<string, string>()
  const node: CompatDocumentNode = {
    ownerDocument,
    nodeName: upperTagName,
    tagName: upperTagName,
    localName: tagName,
    parentElement: null,
    get children() {
      if (tagName === "body") return activeDomRoots()
      return activeBody ? [activeBody] : []
    },
    get dataset() {
      return datasetFromAttributes(attributes)
    },
    get clientWidth() {
      return windowTarget.innerWidth ?? 800
    },
    get clientHeight() {
      return windowTarget.innerHeight ?? 600
    },
    clientLeft: 0,
    clientTop: 0,
    get scrollWidth() {
      return windowTarget.innerWidth ?? 800
    },
    get scrollHeight() {
      return windowTarget.innerHeight ?? 600
    },
    scrollLeft: 0,
    scrollTop: 0,
    getAttribute(name) {
      return attributes.get(name) ?? null
    },
    setAttribute(name, value) {
      attributes.set(name, String(value))
    },
    removeAttribute(name) {
      attributes.delete(name)
    },
    contains(candidate) {
      if (candidate === node) return true
      return candidate instanceof HostElementNode && descendantsOf(node).includes(candidate)
    },
    querySelectorAll(selector) {
      return queryDescendants(node, selector)
    },
    getBoundingClientRect() {
      const width = windowTarget.innerWidth ?? 800
      const height = windowTarget.innerHeight ?? 600
      return {
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: width,
        bottom: height,
        width,
        height,
      }
    },
  }
  return node
}

function createCompatElement(tagName: string): HostElementNode {
  return createHostElement("div", tagName.toLowerCase())
}

function connectDocumentTree(body: CompatDocumentNode, documentElement: CompatDocumentNode): void {
  body.parentElement = documentElement
  documentElement.parentElement = null
}

function installHostDomCompatibility(ownerDocument: CompatDocument): void {
  if (hostDomCompatibilityInstalled) return
  hostDomCompatibilityInstalled = true

  const originalBounds = HostElementNode.prototype.getBoundingClientRect
  Object.defineProperties(HostElementNode.prototype, {
    ownerDocument: {
      configurable: true,
      get(this: HostElementNode) {
        registerKnownRoot(this)
        return ownerDocument
      },
    },
    getAttribute: {
      configurable: true,
      value(this: HostElementNode, name: string): string | null {
        registerKnownRoot(this)
        return hostAttribute(this, name)
      },
    },
    hasAttribute: {
      configurable: true,
      value(this: HostElementNode, name: string): boolean {
        registerKnownRoot(this)
        return hostAttribute(this, name) !== null
      },
    },
    setAttribute: {
      configurable: true,
      value(this: HostElementNode, name: string, value: string): void {
        registerKnownRoot(this)
        setHostProperty(this, name, String(value))
      },
    },
    removeAttribute: {
      configurable: true,
      value(this: HostElementNode, name: string): void {
        registerKnownRoot(this)
        setHostProperty(this, name, undefined)
      },
    },
    contains: {
      configurable: true,
      value(this: HostElementNode, candidate: HostElementNode): boolean {
        registerKnownRoot(this)
        if (candidate === this) return true
        let parent = candidate.parent
        while (parent) {
          if (parent === this) return true
          parent = parent.kind === "root" ? null : parent.parent
        }
        return false
      },
    },
    querySelectorAll: {
      configurable: true,
      value(this: HostElementNode, selector: string): HostElementNode[] {
        registerKnownRoot(this)
        return queryDescendants(this, selector)
      },
    },
    matches: {
      configurable: true,
      value(this: HostElementNode, selector: string): boolean {
        registerKnownRoot(this)
        return matchesSelector(this, selector)
      },
    },
    dataset: {
      configurable: true,
      get(this: HostElementNode): CompatDataset {
        registerKnownRoot(this)
        return datasetFromHost(this)
      },
    },
    tabIndex: {
      configurable: true,
      get(this: HostElementNode): number {
        const value = this.props.get("tabIndex")
        if (value === undefined || value === null) return -1
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : -1
      },
      set(this: HostElementNode, value: number): void {
        setHostProperty(this, "tabIndex", value)
      },
    },
    addEventListener: {
      configurable: true,
      value(this: HostElementNode, type: string, listener: CompatListener | null): void {
        addCompatListener(this, type, listener)
      },
    },
    removeEventListener: {
      configurable: true,
      value(this: HostElementNode, type: string, listener: CompatListener | null): void {
        removeCompatListener(this, type, listener)
      },
    },
    dispatchEvent: {
      configurable: true,
      value(this: HostElementNode, event: Event): boolean {
        return dispatchCompatEvent(this, event)
      },
    },
    insertAdjacentElement: {
      configurable: true,
      value(this: HostElementNode, position: string, element: HostElementNode): HostElementNode | null {
        registerKnownRoot(this)
        if (position === "afterbegin") {
          insertHostNode(this, element, this.children[0] ?? null)
          return element
        }
        if (position === "beforeend") {
          insertHostNode(this, element)
          return element
        }
        return null
      },
    },
    remove: {
      configurable: true,
      value(this: HostElementNode): void {
        const parent = this.parent
        if (!parent) return
        removeHostNode(parent, this)
      },
    },
  })

  HostElementNode.prototype.closest = function closest(selector: string): HostElementNode | null {
    registerKnownRoot(this)
    if (matchesSelector(this, selector)) return this

    let parent = this.parentElement
    while (parent) {
      if (matchesSelector(parent, selector)) return parent
      parent = parent.parentElement
    }
    return null
  }

  HostElementNode.prototype.getBoundingClientRect = function getBoundingClientRect() {
    registerKnownRoot(this)
    return originalBounds.call(this)
  }
}

function activeDomRoots(): HostElementNode[] {
  const roots: HostElementNode[] = []
  for (const node of knownRoots) {
    if (node.parent?.kind === "root") roots.push(node)
    else knownRoots.delete(node)
  }
  return roots
}

function registerKnownRoot(node: HostElementNode): void {
  let current = node
  while (current.parent?.kind === "element") current = current.parent
  if (current.parent?.kind === "root") knownRoots.add(current)
}

function childElements(node: CompatTreeElement): HostElementNode[] {
  const elements: HostElementNode[] = []
  for (const child of node.children) {
    if (child instanceof HostElementNode) elements.push(child)
  }
  return elements
}

function descendantsOf(root: CompatTreeElement): HostElementNode[] {
  const descendants: HostElementNode[] = []
  const pending = [...childElements(root)].reverse()
  while (pending.length > 0) {
    const node = pending.pop()
    if (!node) continue
    descendants.push(node)
    const children = childElements(node)
    for (let index = children.length - 1; index >= 0; index -= 1) pending.push(children[index]!)
  }
  return descendants
}

function queryDescendants(root: CompatTreeElement, selector: string): HostElementNode[] {
  return descendantsOf(root).filter((node) => matchesSelector(node, selector))
}

function matchesSelector(node: HostElementNode, selector: string): boolean {
  for (const rawPart of selector.split(",")) {
    const part = rawPart.trim()
    if (!part) continue
    if (part === "*") return true
    if (part.startsWith("[") && part.endsWith("]")) {
      const expression = part.slice(1, -1).trim()
      const separator = expression.indexOf("=")
      if (separator < 0) {
        if (hostAttribute(node, expression) !== null) return true
        continue
      }
      const name = expression.slice(0, separator).trim()
      const expected = unquote(expression.slice(separator + 1).trim())
      if (hostAttribute(node, name) === expected) return true
      continue
    }
    if (node.localName === part.toLowerCase()) return true
  }
  return false
}

function hostAttribute(node: HostElementNode, name: string): string | null {
  const value = node.props.get(name)
  return value === undefined || value === null ? null : String(value)
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) return value.slice(1, -1)
  }
  return value
}

function datasetFromHost(node: HostElementNode) {
  return {
    liveAnnouncer: hostAttribute(node, "data-live-announcer") ?? undefined,
    reactAriaTopLayer: hostAttribute(node, "data-react-aria-top-layer") ?? undefined,
  } satisfies CompatDataset
}

function datasetFromAttributes(attributes: ReadonlyMap<string, string>) {
  return {
    liveAnnouncer: attributes.get("data-live-announcer"),
    reactAriaTopLayer: attributes.get("data-react-aria-top-layer"),
  } satisfies CompatDataset
}

function createCompatTreeWalker(
  root: CompatTreeElement,
  _whatToShow: number,
  filter: CompatTreeWalkerFilter,
): CompatTreeWalker {
  const pending = [...childElements(root)].reverse()
  return {
    nextNode() {
      while (pending.length > 0) {
        const node = pending.pop()
        if (!node) continue
        const decision = filter.acceptNode(node)
        if (decision !== NODE_FILTER.FILTER_REJECT) {
          const children = childElements(node)
          for (let index = children.length - 1; index >= 0; index -= 1) pending.push(children[index]!)
        }
        if (decision === NODE_FILTER.FILTER_ACCEPT) return node
      }
      return null
    },
  }
}

class CompatMutationObserver {
  readonly #callback: CompatMutationCallback
  #target: CompatTreeElement | undefined
  #options: CompatMutationObserverOptions = {}
  #snapshot: CompatMutationSnapshot = new Map()
  #timer: ReturnType<typeof globalThis.setTimeout> | undefined

  constructor(callback: CompatMutationCallback) {
    this.#callback = callback
  }

  observe(target: CompatTreeElement, options: CompatMutationObserverOptions = {}): void {
    this.disconnect()
    this.#target = target
    this.#options = options
    this.#snapshot = mutationSnapshot(target, Boolean(options.subtree))
    this.schedule()
  }

  disconnect(): void {
    if (this.#timer !== undefined) globalThis.clearTimeout(this.#timer)
    this.#timer = undefined
    this.#target = undefined
    this.#snapshot = new Map()
  }

  private schedule(): void {
    if (!this.#target) return
    this.#timer = globalThis.setTimeout(() => this.check(), 16)
  }

  private check(): void {
    const target = this.#target
    if (!target) return
    const next = mutationSnapshot(target, Boolean(this.#options.subtree))
    const records = mutationDiff(this.#snapshot, next)
    this.#snapshot = next
    if (records.length > 0 && this.#options.childList !== false) this.#callback(records)
    this.schedule()
  }
}

function mutationSnapshot(root: CompatTreeElement, subtree: boolean): CompatMutationSnapshot {
  const snapshot: CompatMutationSnapshot = new Map()
  const direct = childElements(root)
  for (const child of direct) snapshot.set(child, root)
  if (!subtree) return snapshot

  const pending = [...direct]
  while (pending.length > 0) {
    const parent = pending.pop()
    if (!parent) continue
    for (const child of childElements(parent)) {
      snapshot.set(child, parent)
      pending.push(child)
    }
  }
  return snapshot
}

function mutationDiff(
  previous: CompatMutationSnapshot,
  next: CompatMutationSnapshot,
): CompatMutationRecord[] {
  const records = new Map<CompatTreeElement, CompatMutationRecord>()
  for (const [node, parent] of previous) {
    if (next.has(node)) continue
    const record = records.get(parent) ?? mutationRecord(parent)
    record.removedNodes.push(node)
    records.set(parent, record)
  }
  for (const [node, parent] of next) {
    if (previous.has(node)) continue
    const record = records.get(parent) ?? mutationRecord(parent)
    record.addedNodes.push(node)
    records.set(parent, record)
  }
  return [...records.values()]
}

function mutationRecord(target: CompatTreeElement): CompatMutationRecord {
  return { type: "childList", target, addedNodes: [], removedNodes: [] }
}

function defaultRequestAnimationFrame(callback: (time: number) => void): ReturnType<typeof globalThis.setTimeout> {
  return globalThis.setTimeout(() => callback(Date.now()), 0)
}

function defaultComputedStyle(_element: Element, _pseudoElement?: string | null): CompatComputedStyle {
  return {
    animationName: "none",
    animationDuration: "0s",
    transitionDuration: "0s",
    transitionProperty: "none",
    display: "block",
    direction: "ltr",
    position: "static",
    overflow: "visible",
    overflowX: "visible",
    overflowY: "visible",
    width: "0px",
    height: "0px",
    paddingLeft: "0px",
    paddingTop: "0px",
    transform: "none",
    perspective: "none",
    containerType: "normal",
    backdropFilter: "none",
    filter: "none",
    willChange: "auto",
    contain: "none",
  }
}

class CompatImageLoader implements CompatImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  #src = ""

  get src(): string {
    return this.#src
  }

  set src(value: string) {
    this.#src = value
    queueMicrotask(() => {
      if (supportsNativeImageSource(value)) this.onload?.()
      else this.onerror?.()
    })
  }
}

function supportsNativeImageSource(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("file:")
}

function addCompatListener(target: CompatListenerTarget, type: string, listener: CompatListener | null): void {
  if (!listener) return
  let byType = listeners.get(target)
  if (!byType) {
    byType = new Map()
    listeners.set(target, byType)
  }
  let entries = byType.get(type)
  if (!entries) {
    entries = new Set()
    byType.set(type, entries)
  }
  entries.add(listener)
  if (target === globalThis.document && type === "pointerdown") {
    console.log(`[gpuix-solid1:dom-diagnostic] document pointerdown listeners=${entries.size}`)
  }
}

function removeCompatListener(target: CompatListenerTarget, type: string, listener: CompatListener | null): void {
  if (!listener) return
  listeners.get(target)?.get(type)?.delete(listener)
}

function dispatchCompatEvent(target: CompatListenerTarget, event: Event): boolean {
  const entries = listeners.get(target)?.get(event.type) ?? []
  if (target === globalThis.document && event.type === "pointerdown") {
    console.log(`[gpuix-solid1:dom-diagnostic] document pointerdown dispatch listeners=${Array.from(entries).length}`)
  }
  for (const listener of entries) listener(event)
  return !event.defaultPrevented
}

function installEventTarget(target: CompatEventTarget): void {
  if (!target.addEventListener) {
    target.addEventListener = (type, listener) => addCompatListener(target, type, listener)
  }
  if (!target.removeEventListener) {
    target.removeEventListener = (type, listener) => removeCompatListener(target, type, listener)
  }
  if (!target.dispatchEvent) {
    target.dispatchEvent = (event) => dispatchCompatEvent(target, event)
  }
}

installDomEventEnvironment()
