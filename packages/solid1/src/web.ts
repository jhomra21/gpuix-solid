import "./dom-environment.js"
import {
  splitProps,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js"
import { HostElementNode, setHostProperty, type HostRootNode } from "./host/nodes.js"
import { nativeEventTypeForBrowserEvent, registerDelegatedNativeEvent } from "./host/events.js"
import { createComponent, createElement, createTextNode, effect, insert, insertNode, memo, setProp, spread, use } from "./universal.js"

export const isServer = false

// Solid's client web runtime exposes the server request helper as a no-op.
// Routers import it unconditionally and rely on isServer=false to keep request-only work dormant.
export function getRequestEvent(): undefined {
  return undefined
}

export { createComponent, effect, insert, memo, use }

type WebAttributeValue = string | number | boolean | null | undefined

type WebStyleValue =
  | string
  | Record<string, string | number | null | undefined>
  | null
  | undefined

export function setAttribute(node: HostElementNode, name: string, value: WebAttributeValue): void {
  setProp(node, name, value)
}

export function className(node: HostElementNode, value: string | null | undefined): void {
  setProp(node, "class", value)
}

export function style(
  node: HostElementNode,
  value: WebStyleValue,
  previous?: WebStyleValue,
): WebStyleValue {
  setProp(node, "style", value, previous)
  return value
}

type WebEventDataHandler<T> = (data: T, event: Event) => void
type WebEventHandler<T> = EventListener | [WebEventDataHandler<T>, T]

export function addEventListener<T>(
  node: HostElementNode,
  name: string,
  handler: WebEventHandler<T>,
  delegate: boolean,
): void {
  const eventName = name.toLowerCase()
  if (Array.isArray(handler)) {
    const [handlerFunction, data] = handler
    if (delegate) {
      defineDelegatedDataHandler(node, eventName, handlerFunction, data)
      return
    }
    node.addEventListener(eventName, (event) => handlerFunction.call(node, data, event))
    return
  }

  if (delegate) {
    defineDelegatedListener(node, eventName, handler)
    return
  }

  node.addEventListener(eventName, handler)
}

function defineDelegatedListener(
  node: HostElementNode,
  name: string,
  handler: EventListener,
): void {
  Object.defineProperty(node, `$$${name}`, {
    configurable: true,
    writable: true,
    value: handler,
  })
}

function defineDelegatedDataHandler<T>(
  node: HostElementNode,
  name: string,
  handler: WebEventDataHandler<T>,
  data: T,
): void {
  Object.defineProperty(node, `$$${name}`, {
    configurable: true,
    writable: true,
    value: handler,
  })
  Object.defineProperty(node, `$$${name}Data`, {
    configurable: true,
    writable: true,
    value: data,
  })
}

type StaticTemplateText = {
  kind: "text"
  value: string
}

type StaticTemplateElement = {
  kind: "element"
  tagName: string
  attributes: Array<[string, string]>
  children: StaticTemplateNode[]
}

type StaticTemplateNode = StaticTemplateText | StaticTemplateElement

interface StaticTemplateFactory {
  (): HostElementNode
  cloneNode(): HostElementNode
}

const VOID_TEMPLATE_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])

export function template(
  html: string,
  _isImportNode?: boolean,
  _isSvg?: boolean,
  isMathMl?: boolean,
): StaticTemplateFactory {
  if (isMathMl) throw new Error("GPUix Solid does not support MathML templates")
  const blueprint = parseStaticTemplate(html)
  const create = (): HostElementNode => instantiateStaticTemplate(blueprint)
  return Object.assign(create, { cloneNode: create })
}

function parseStaticTemplate(html: string): StaticTemplateElement {
  const roots: StaticTemplateNode[] = []
  const stack: StaticTemplateElement[] = []
  const tokens = html.match(/<!--[\s\S]*?-->|<!>|<\/?[A-Za-z][^>]*>|[^<]+/g) ?? []

  const append = (node: StaticTemplateNode): void => {
    const parent = stack.at(-1)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  for (const token of tokens) {
    if (token.startsWith("<!--") || token === "<!>") {
      append({ kind: "text", value: "" })
      continue
    }

    if (token.startsWith("</")) {
      const tagName = /^<\/([A-Za-z][\w:-]*)\s*>$/.exec(token)?.[1]?.toLowerCase()
      const open = stack.pop()
      if (!tagName || !open || open.tagName !== tagName) {
        throw new Error(`Invalid Solid DOM template closing tag: ${token}`)
      }
      continue
    }

    if (token.startsWith("<")) {
      const match = /^<([A-Za-z][\w:-]*)([\s\S]*?)(\/?)>$/.exec(token)
      if (!match?.[1]) throw new Error(`Invalid Solid DOM template tag: ${token}`)
      const tagName = match[1].toLowerCase()
      const element: StaticTemplateElement = {
        kind: "element",
        tagName,
        attributes: parseStaticTemplateAttributes(match[2] ?? ""),
        children: [],
      }
      append(element)
      if (match[3] !== "/" && !VOID_TEMPLATE_TAGS.has(tagName)) stack.push(element)
      continue
    }

    append({ kind: "text", value: decodeHtmlEntities(token) })
  }

  if (stack.length !== 0) {
    throw new Error(`Unclosed Solid DOM template tag: <${stack.at(-1)?.tagName ?? "unknown"}>`)
  }
  if (roots.length !== 1 || roots[0]?.kind !== "element") {
    throw new Error("Solid DOM templates must contain exactly one root element")
  }
  return roots[0]
}

function parseStaticTemplateAttributes(source: string): Array<[string, string]> {
  const attributes: Array<[string, string]> = []
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g
  for (const match of source.matchAll(pattern)) {
    const name = match[1]
    if (!name) continue
    const rawValue = match[2] ?? match[3] ?? match[4] ?? ""
    attributes.push([name, decodeHtmlEntities(rawValue)])
  }
  return attributes
}

function instantiateStaticTemplate(templateNode: StaticTemplateElement): HostElementNode {
  const node = createElement(templateNode.tagName)
  if (!(node instanceof HostElementNode)) {
    throw new Error(`Expected host element for static <${templateNode.tagName}> template`)
  }

  for (const [name, value] of templateNode.attributes) {
    setProp(node, name, name === "style" ? parseStaticStyleAttribute(value) : value)
  }
  for (const child of templateNode.children) {
    if (child.kind === "text") {
      insertNode(node, createTextNode(child.value))
      continue
    }
    insertNode(node, instantiateStaticTemplate(child))
  }
  return node
}

function parseStaticStyleAttribute(value: string) {
  const declarations: Record<string, string> = {}
  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":")
    if (separator < 0) continue
    const name = declaration.slice(0, separator).trim()
    const propertyValue = declaration.slice(separator + 1).trim()
    if (name && propertyValue) declarations[name] = propertyValue
  }
  return declarations
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[0-9A-Fa-f]+|#\\d+|amp|apos|gt|lt|nbsp|quot);/g,
    (entity, encoded: string) => {
      if (encoded.startsWith("#x")) return String.fromCodePoint(Number.parseInt(encoded.slice(2), 16))
      if (encoded.startsWith("#")) return String.fromCodePoint(Number.parseInt(encoded.slice(1), 10))
      switch (encoded) {
        case "amp": return "&"
        case "apos": return "'"
        case "gt": return ">"
        case "lt": return "<"
        case "nbsp": return "\u00a0"
        case "quot": return '"'
      }
      return entity
    },
  )
}

export const SVGElements = new Set([
  "altGlyph", "altGlyphDef", "altGlyphItem", "animate", "animateColor", "animateMotion",
  "animateTransform", "circle", "clipPath", "color-profile", "cursor", "defs", "desc",
  "ellipse", "feBlend", "feColorMatrix", "feComponentTransfer", "feComposite",
  "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight",
  "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR",
  "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset",
  "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence",
  "filter", "font", "font-face", "font-face-format", "font-face-name", "font-face-src",
  "font-face-uri", "foreignObject", "g", "glyph", "glyphRef", "hkern", "image", "line",
  "linearGradient", "marker", "mask", "metadata", "missing-glyph", "mpath", "path",
  "pattern", "polygon", "polyline", "radialGradient", "rect", "set", "stop", "svg",
  "switch", "symbol", "text", "textPath", "tref", "tspan", "use", "view", "vkern",
])

const delegatedEventsByDocument = new WeakMap<object, Set<string>>()

export function delegateEvents(eventNames: string[], documentTarget: Document = globalThis.document): void {
  const registered = delegatedEventsByDocument.get(documentTarget) ?? new Set<string>()
  delegatedEventsByDocument.set(documentTarget, registered)

  for (const rawName of eventNames) {
    const name = rawName.toLowerCase()
    if (registered.has(name)) continue
    registered.add(name)
    documentTarget.addEventListener(name, dispatchDelegatedEvent)

    const nativeEventType = nativeEventTypeForBrowserEvent(name)
    if (!nativeEventType) continue
    if (registerDelegatedNativeEvent(nativeEventType)) syncNativeDelegatedObservation(nativeEventType)
  }
}

function dispatchDelegatedEvent(event: Event): void {
  let node = event.target
  while (node instanceof HostElementNode) {
    const handlerKey = "$$" + event.type
    const handlerValue: unknown = Object.getOwnPropertyDescriptor(node, handlerKey)?.value
    if (handlerValue instanceof Function) {
      Object.defineProperty(event, "currentTarget", { configurable: true, value: node })
      const data: unknown = Object.getOwnPropertyDescriptor(node, handlerKey + "Data")?.value
      if (data === undefined) handlerValue.call(node, event)
      else handlerValue.call(node, data, event)
    }
    if (event.cancelBubble) return
    node = node.parentElement
  }
}

function syncNativeDelegatedObservation(nativeEventType: string): void {
  const roots = new Set<HostRootNode>()
  for (const candidate of Array.from(globalThis.document.body.querySelectorAll("*"))) {
    if (!(candidate instanceof HostElementNode)) continue
    const root = candidate.root
    if (!root || !candidate.nativeAlive) continue
    roots.add(root)
    root.driver.enqueue("setEventListener", candidate.id, nativeEventType, true)
  }
  for (const root of roots) root.driver.flush()
}

export type DynamicProps<T extends ValidComponent, P = ComponentProps<T>> = {
  [K in keyof P]: P[K]
} & {
  component: T | undefined
}

type CompatDocumentStyle = {
  pointerEvents: string
  getPropertyValue(name: string): string
  setProperty(name: string, value: string): void
  removeProperty(name: string): string
}

type BrowserInset = "top" | "right" | "bottom" | "left"

type BrowserStyleDeclaration = Omit<HostElementNode["style"], BrowserInset> & {
  top?: string | number
  right?: string | number
  bottom?: string | number
  left?: string | number
  transform?: string
  zIndex?: string | number
}

type BrowserTranslation = {
  x: number
  y: number
}

type BrowserBounds = {
  left: number
  top: number
  width: number
  height: number
}

const nativePopperPositioners = new WeakSet<HostElementNode>()

installElementConstructorCompatibility()
installElementQueryCompatibility()
installDocumentContainmentCompatibility()
installDocumentStyleCompatibility()
installComputedStyleCompatibility()
installDocumentFocusCompatibility()
installDocumentPointerCaptureCompatibility()

export function createDynamic<T extends ValidComponent>(
  component: () => T | undefined,
  props: ComponentProps<T>,
) {
  const current = component()
  if (current === undefined) return undefined
  if (isHostTag(current)) {
    const element = createElement(current)
    if (!(element instanceof HostElementNode)) {
      throw new Error(`Expected host element for <${current}>`)
    }
    installBrowserStyleMutationCompatibility(element)
    if (hasPopperPositionerProp(props)) promoteNativePopperPositioner(element)
    spread(element, props)
    if (nativePopperPositioners.has(element)) {
      queueMicrotask(() => syncBrowserStyleMutation(element, element.style))
    }
    return element
  }
  return current(props)
}

export function Dynamic<T extends ValidComponent>(props: DynamicProps<T>) {
  const [, others] = splitProps(props, ["component"])
  // SAFETY: splitProps removes only the synthetic `component` key, leaving the exact ComponentProps<T> payload passed to Dynamic.
  const componentProps = others as ComponentProps<T>
  return createDynamic(() => props.component, componentProps)
}

export function Portal(props: { children: JSX.Element }): JSX.Element {
  return props.children
}

function hasPopperPositionerProp<T>(props: T): boolean {
  return Reflect.has(Object(props), "data-popper-positioner")
}

function promoteNativePopperPositioner(element: HostElementNode): void {
  if (element.root || element.nativeAlive) {
    throw new Error("Kobalte popper positioner must be promoted before native adoption")
  }
  element.nativeType = "anchored"
  nativePopperPositioners.add(element)
  setHostProperty(element, "position", { x: 0, y: 0 })
  setHostProperty(element, "fit", "snap")
  setHostProperty(element, "snapMargin", 0)
  setHostProperty(element, "deferred", true)
  setHostProperty(element, "priority", 10)
  setHostProperty(element, "occlude", false)
}

function isHostTag(component: ValidComponent): component is string {
  return typeof component === "string"
}

function installElementConstructorCompatibility(): void {
  for (const name of ["Element", "HTMLElement"] as const) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: HostElementNode,
    })
  }
}

function installElementQueryCompatibility(): void {
  Object.defineProperty(HostElementNode.prototype, "querySelector", {
    configurable: true,
    value(this: HostElementNode, selector: string): HostElementNode | null {
      // Accessing ownerDocument registers this retained-tree root with the DOM compatibility layer.
      void this.ownerDocument
      for (const candidate of Array.from(globalThis.document.body.querySelectorAll(selector))) {
        if (!(candidate instanceof HostElementNode)) continue
        let parent = candidate.parent
        while (parent) {
          if (parent === this) return candidate
          parent = parent.kind === "root" ? null : parent.parent
        }
      }
      return null
    },
  })
}

function installBrowserStyleMutationCompatibility(element: HostElementNode): void {
  let declaration = createBrowserStyleProxy(element, element.style)
  Object.defineProperty(element, "style", {
    configurable: true,
    enumerable: true,
    get: () => declaration,
    set: (style: HostElementNode["style"]) => {
      declaration = createBrowserStyleProxy(element, style)
    },
  })
}

function createBrowserStyleProxy(
  element: HostElementNode,
  style: BrowserStyleDeclaration,
): BrowserStyleDeclaration {
  return new Proxy(style, {
    set(current, property, value, receiver) {
      const updated = Reflect.set(current, property, value, receiver)
      if (updated && isStringValue(property)) syncBrowserStyleMutation(element, current)
      return updated
    },
  })
}

function syncBrowserStyleMutation(element: HostElementNode, style: BrowserStyleDeclaration): void {
  const root = element.root
  if (!root || !element.nativeAlive) return

  const nativeStyle = { ...style }
  const parentBounds = browserParentBounds(element)
  const translation = browserTranslation(style.transform)
  if (nativePopperPositioners.has(element)) {
    if (translation) setHostProperty(element, "position", translation)
    delete nativeStyle.position
    delete nativeStyle.left
    delete nativeStyle.right
    delete nativeStyle.top
    delete nativeStyle.bottom
  } else if (translation) {
    nativeStyle.left = translation.x - parentBounds.left
    nativeStyle.top = translation.y - parentBounds.top
  }

  normalizeBrowserInset(nativeStyle, "left", parentBounds.width)
  normalizeBrowserInset(nativeStyle, "right", parentBounds.width)
  normalizeBrowserInset(nativeStyle, "top", parentBounds.height)
  normalizeBrowserInset(nativeStyle, "bottom", parentBounds.height)
  delete nativeStyle.transform
  delete nativeStyle.zIndex
  root.driver.enqueue("setStyle", element.id, nativeStyle)
}

function browserParentBounds(element: HostElementNode): BrowserBounds {
  const parent = element.parent
  if (!parent || parent.kind === "root") return { left: 0, top: 0, width: 0, height: 0 }
  const bounds = parent.getBoundingClientRect()
  return { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }
}

function browserTranslation(transform: string | undefined): BrowserTranslation | undefined {
  if (!transform) return undefined
  const number = "(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))"
  const translate3d = transform.trim().match(new RegExp(`^translate3d\\(\\s*${number}px\\s*,\\s*${number}px\\s*,\\s*0(?:px)?\\s*\\)$`, "i"))
  if (translate3d) return { x: Number(translate3d[1]), y: Number(translate3d[2]) }
  const translate = transform.trim().match(new RegExp(`^translate\\(\\s*${number}px\\s*,\\s*${number}px\\s*\\)$`, "i"))
  return translate ? { x: Number(translate[1]), y: Number(translate[2]) } : undefined
}

function normalizeBrowserInset(style: BrowserStyleDeclaration, property: BrowserInset, basis: number): void {
  const value = style[property]
  if (value === "") {
    delete style[property]
    return
  }
  if (!isStringValue(value)) return
  const percent = value.trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))%$/)
  if (percent) style[property] = basis * Number(percent[1]) / 100
}

function isStringValue<T>(value: T): value is T & string {
  return typeof value === "string"
}

function installDocumentContainmentCompatibility(): void {
  if ("contains" in globalThis.document) return
  Object.defineProperty(globalThis.document, "contains", {
    configurable: true,
    enumerable: true,
    value: (node: Node | null) => {
      if (node === globalThis.document.body || node === globalThis.document.documentElement) return true
      if (node instanceof HostElementNode) return node.nativeAlive && node.root !== null
      return globalThis.document.body.contains(node)
    },
  })
}

function installDocumentStyleCompatibility(): void {
  for (const target of [globalThis.document.body, globalThis.document.documentElement]) {
    if ("style" in target) continue
    Object.defineProperty(target, "style", {
      configurable: true,
      enumerable: true,
      value: createDocumentStyle(),
    })
  }
}

function installComputedStyleCompatibility(): void {
  const originalGetComputedStyle = globalThis.getComputedStyle
  Object.defineProperty(globalThis, "getComputedStyle", {
    configurable: true,
    writable: true,
    value: (element: Element, pseudoElement?: string | null) => {
      const computed = originalGetComputedStyle(element, pseudoElement)
      if (!(element instanceof HostElementNode)) return computed
      reflectHostComputedStyle(element, computed)
      Object.defineProperty(computed, "getPropertyValue", {
        configurable: true,
        enumerable: false,
        value: (name: string) => hostComputedProperty(element, name),
      })
      return computed
    },
  })
  Object.defineProperty(globalThis.window, "getComputedStyle", {
    configurable: true,
    writable: true,
    value: globalThis.getComputedStyle,
  })
}

function reflectHostComputedStyle(element: HostElementNode, computed: CSSStyleDeclaration): void {
  const style: BrowserStyleDeclaration = element.style
  if (style.display !== undefined) computed.display = style.display
  if (style.position !== undefined) computed.position = style.position
  if (style.overflow !== undefined) computed.overflow = style.overflow
  if (style.overflowX !== undefined) computed.overflowX = style.overflowX
  if (style.overflowY !== undefined) computed.overflowY = style.overflowY
  computed.width = cssComputedValue(style.width, computed.width)
  computed.height = cssComputedValue(style.height, computed.height)
  computed.paddingLeft = cssComputedValue(style.paddingLeft, computed.paddingLeft)
  computed.paddingTop = cssComputedValue(style.paddingTop, computed.paddingTop)
  if (style.transform !== undefined) computed.transform = style.transform
}

function cssComputedValue(value: string | number | undefined, fallback: string): string {
  if (value === undefined) return fallback
  return isStringValue(value) ? value : `${value}px`
}

function hostComputedProperty(element: HostElementNode, name: string): string {
  const custom = element.style.getPropertyValue(name)
  if (custom) return custom

  switch (name) {
    case "background-color":
      return String(element.style.backgroundColor ?? "")
    case "border-top-color":
    case "border-right-color":
    case "border-bottom-color":
    case "border-left-color":
      return String(element.style.borderColor ?? "")
    case "border-top-width":
      return cssPixelValue(element.style.borderTopWidth ?? element.style.borderWidth)
    case "border-right-width":
      return cssPixelValue(element.style.borderRightWidth ?? element.style.borderWidth)
    case "border-bottom-width":
      return cssPixelValue(element.style.borderBottomWidth ?? element.style.borderWidth)
    case "border-left-width":
      return cssPixelValue(element.style.borderLeftWidth ?? element.style.borderWidth)
    case "position":
      return String(element.style.position ?? "static")
    case "overflow":
      return String(element.style.overflow ?? "visible")
    case "overflow-x":
      return String(element.style.overflowX ?? element.style.overflow ?? "visible")
    case "overflow-y":
      return String(element.style.overflowY ?? element.style.overflow ?? "visible")
    case "width":
      return cssComputedValue(element.style.width, "0px")
    case "height":
      return cssComputedValue(element.style.height, "0px")
    default:
      return ""
  }
}

function cssPixelValue(value: number | undefined): string {
  return value === undefined ? "" : `${value}px`
}

function installDocumentFocusCompatibility(): void {
  const documentTarget = globalThis.document
  let activeElement: HostElementNode | HTMLElement | null = documentTarget.body
  const originalFocus = HostElementNode.prototype.focus
  const originalBlur = HostElementNode.prototype.blur
  const recordActiveElement = (element: HostElementNode): void => {
    activeElement = element
  }

  Object.defineProperty(documentTarget, "activeElement", {
    configurable: true,
    enumerable: true,
    get: () => activeElement,
  })

  HostElementNode.prototype.focus = function focus(): void {
    recordActiveElement(this)
    originalFocus.call(this)
  }
  HostElementNode.prototype.blur = function blur(): void {
    if (activeElement === this) activeElement = documentTarget.body
    originalBlur.call(this)
  }

  for (const target of [documentTarget.body, documentTarget.documentElement]) {
    if (!("focus" in target)) {
      Object.defineProperty(target, "focus", {
        configurable: true,
        enumerable: true,
        value: () => {
          activeElement = target
        },
      })
    }
    if (!("blur" in target)) {
      Object.defineProperty(target, "blur", {
        configurable: true,
        enumerable: true,
        value: () => {
          if (activeElement === target) activeElement = documentTarget.body
        },
      })
    }
  }
}

function installDocumentPointerCaptureCompatibility(): void {
  const documentTarget = globalThis.document
  const originalAddEventListener = documentTarget.addEventListener.bind(documentTarget)
  const originalRemoveEventListener = documentTarget.removeEventListener.bind(documentTarget)
  const pointerDownListeners = new Set<EventListenerOrEventListenerObject>()

  Object.defineProperties(documentTarget, {
    addEventListener: {
      configurable: true,
      value: (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions,
      ) => {
        if (!listener) return
        originalAddEventListener(type, listener, options)
        if (type !== "pointerdown") return
        const wasInactive = pointerDownListeners.size === 0
        pointerDownListeners.add(listener)
        if (wasInactive) syncNativePointerDownObservation(true)
      },
    },
    removeEventListener: {
      configurable: true,
      value: (
        type: string,
        listener: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions,
      ) => {
        if (!listener) return
        originalRemoveEventListener(type, listener, options)
        if (type !== "pointerdown") return
        pointerDownListeners.delete(listener)
        if (pointerDownListeners.size === 0) syncNativePointerDownObservation(false)
      },
    },
  })
}


function syncNativePointerDownObservation(active: boolean): void {
  const roots = new Set<HostRootNode>()
  for (const candidate of Array.from(globalThis.document.body.querySelectorAll("*"))) {
    if (!(candidate instanceof HostElementNode)) continue
    const root = candidate.root
    if (!root || !candidate.nativeAlive) continue
    roots.add(root)
    root.driver.enqueue(
      "setEventListener",
      candidate.id,
      "mouseDown",
      active || candidate.events.has("mouseDown"),
    )
  }
  for (const root of roots) root.driver.flush()
}

function createDocumentStyle(): CompatDocumentStyle {
  let pointerEvents = ""
  return {
    get pointerEvents() {
      return pointerEvents
    },
    set pointerEvents(value: string) {
      pointerEvents = String(value)
    },
    getPropertyValue(name: string) {
      return name === "pointer-events" ? pointerEvents : ""
    },
    setProperty(name: string, value: string) {
      if (name === "pointer-events") pointerEvents = String(value)
    },
    removeProperty(name: string) {
      if (name !== "pointer-events") return ""
      const previous = pointerEvents
      pointerEvents = ""
      return previous
    },
  }
}
