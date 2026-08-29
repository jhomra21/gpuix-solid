type CompatListener = (event: Event) => void

type CompatEventTarget = {
  addEventListener?: (type: string, listener: CompatListener | null) => void
  removeEventListener?: (type: string, listener: CompatListener | null) => void
  dispatchEvent?: (event: Event) => boolean
}

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

type CompatDocument = CompatEventTarget & {
  body?: CompatDocumentNode
  documentElement?: CompatDocumentNode
  defaultView?: CompatWindow
}

type CompatDocumentNode = CompatEventTarget & {
  ownerDocument: CompatDocument
  nodeName: string
  tagName: string
  localName: string
  clientWidth: number
  clientHeight: number
  clientLeft: number
  clientTop: number
  scrollWidth: number
  scrollHeight: number
  scrollLeft: number
  scrollTop: number
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

type CompatWindow = CompatEventTarget & {
  document?: CompatDocument
  setTimeout?: (callback: () => void, delay?: number) => ReturnType<typeof globalThis.setTimeout>
  clearTimeout?: (handle: ReturnType<typeof globalThis.setTimeout>) => void
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

type CompatGlobalEnvironment = {
  document?: CompatDocument
  window?: CompatWindow
  getComputedStyle?: CompatGetComputedStyle
}

const listeners = new WeakMap<CompatEventTarget, Map<string, Set<CompatListener>>>()

export function installDomEventEnvironment(): void {
  // SAFETY: this module reads and installs only the optional browser-compat fields declared by CompatGlobalEnvironment.
  const globals = globalThis as CompatGlobalEnvironment
  const documentTarget = globals.document ?? {}
  const currentWindow = globals.window
  const windowTarget: CompatWindow = currentWindow ?? {}

  if (windowTarget.innerWidth === undefined) windowTarget.innerWidth = 800
  if (windowTarget.innerHeight === undefined) windowTarget.innerHeight = 600
  if (windowTarget.scrollX === undefined) windowTarget.scrollX = 0
  if (windowTarget.scrollY === undefined) windowTarget.scrollY = 0
  if (windowTarget.pageXOffset === undefined) windowTarget.pageXOffset = 0
  if (windowTarget.pageYOffset === undefined) windowTarget.pageYOffset = 0

  const bodyTarget = documentTarget.body ?? createDocumentNode("body", documentTarget, windowTarget)
  const documentElementTarget = documentTarget.documentElement ?? createDocumentNode("html", documentTarget, windowTarget)

  installEventTarget(documentTarget)
  installEventTarget(bodyTarget)
  installEventTarget(documentElementTarget)
  installEventTarget(windowTarget)
  documentTarget.body = bodyTarget
  documentTarget.documentElement = documentElementTarget
  documentTarget.defaultView = windowTarget
  windowTarget.document = documentTarget

  if (!windowTarget.setTimeout) {
    windowTarget.setTimeout = (callback, delay) => globalThis.setTimeout(callback, delay)
  }
  if (!windowTarget.clearTimeout) {
    windowTarget.clearTimeout = (handle) => globalThis.clearTimeout(handle)
  }
  if (!windowTarget.Image) {
    windowTarget.Image = CompatImageLoader
  }
  if (!windowTarget.Element) {
    Object.defineProperty(windowTarget, "Element", {
      configurable: true,
      get: () => globalThis.Element,
    })
  }
  if (!windowTarget.HTMLElement) {
    Object.defineProperty(windowTarget, "HTMLElement", {
      configurable: true,
      get: () => globalThis.HTMLElement,
    })
  }
  if (!windowTarget.Node) {
    Object.defineProperty(windowTarget, "Node", {
      configurable: true,
      get: () => globalThis.Node,
    })
  }

  const getComputedStyle = globals.getComputedStyle ?? defaultComputedStyle
  if (!globals.getComputedStyle) {
    Object.defineProperty(globalThis, "getComputedStyle", {
      configurable: true,
      writable: true,
      value: getComputedStyle,
    })
  }
  if (!windowTarget.getComputedStyle) {
    windowTarget.getComputedStyle = getComputedStyle
  }

  if (!globals.document) {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      writable: true,
      value: documentTarget,
    })
  }
  if (!currentWindow) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      writable: true,
      value: windowTarget,
    })
  }
}

function createDocumentNode(
  tagName: "html" | "body",
  ownerDocument: CompatDocument,
  windowTarget: CompatWindow,
): CompatDocumentNode {
  const upperTagName = tagName.toUpperCase()
  return {
    ownerDocument,
    nodeName: upperTagName,
    tagName: upperTagName,
    localName: tagName,
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

function installEventTarget(target: CompatEventTarget): void {
  if (!target.addEventListener) {
    target.addEventListener = (type, listener) => {
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
    }
  }
  if (!target.removeEventListener) {
    target.removeEventListener = (type, listener) => {
      if (!listener) return
      listeners.get(target)?.get(type)?.delete(listener)
    }
  }
  if (!target.dispatchEvent) {
    target.dispatchEvent = (event) => {
      for (const listener of listeners.get(target)?.get(event.type) ?? []) listener(event)
      return !event.defaultPrevented
    }
  }
}

installDomEventEnvironment()
