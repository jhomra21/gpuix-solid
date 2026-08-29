import "./dom-environment.js"
import {
  splitProps,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js"
import { HostElementNode, type HostRootNode } from "./host/nodes.js"
import { MutationDriver, type MutationValue } from "./host/mutations.js"
import { createElement, spread } from "./universal.js"

export const isServer = false

export type DynamicProps<T extends ValidComponent, P = ComponentProps<T>> = {
  [K in keyof P]: P[K]
} & {
  component: T | undefined
}

type LocalEventListener = (event: Event) => void

type CompatDocumentStyle = {
  pointerEvents: string
  getPropertyValue(name: string): string
  setProperty(name: string, value: string): void
  removeProperty(name: string): string
}

type ComputedStyleWithLookup = CSSStyleDeclaration & {
  getPropertyValue(name: string): string
}

type RelativeLengthStyle = Record<string, unknown> & {
  width?: unknown
  height?: unknown
  minWidth?: unknown
  minHeight?: unknown
  maxWidth?: unknown
  maxHeight?: unknown
  fontSize?: unknown
  "font-size"?: unknown
}

installElementConstructorCompatibility()
installDocumentContainmentCompatibility()
installDocumentStyleCompatibility()
installComputedStyleCompatibility()
installRelativeLengthCompatibility()
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
    installSemanticTagMetadata(element, current)
    spread(element, props)
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
      const computed = originalGetComputedStyle(element, pseudoElement) as ComputedStyleWithLookup
      if (!(element instanceof HostElementNode)) return computed
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

function hostComputedProperty(element: HostElementNode, name: string): string {
  const custom = element.style.getPropertyValue(name)
  if (custom) return custom

  switch (name) {
    case "background-color":
      return String(element.style.backgroundColor ?? "")
    case "border-top-color":
      return String(element.style.borderTopColor ?? element.style.borderColor ?? "")
    case "border-right-color":
      return String(element.style.borderRightColor ?? element.style.borderColor ?? "")
    case "border-bottom-color":
      return String(element.style.borderBottomColor ?? element.style.borderColor ?? "")
    case "border-left-color":
      return String(element.style.borderLeftColor ?? element.style.borderColor ?? "")
    case "border-top-width":
      return cssPixelValue(element.style.borderTopWidth ?? element.style.borderWidth)
    case "border-right-width":
      return cssPixelValue(element.style.borderRightWidth ?? element.style.borderWidth)
    case "border-bottom-width":
      return cssPixelValue(element.style.borderBottomWidth ?? element.style.borderWidth)
    case "border-left-width":
      return cssPixelValue(element.style.borderLeftWidth ?? element.style.borderWidth)
    default:
      return ""
  }
}

function cssPixelValue(value: number | undefined): string {
  return value === undefined ? "" : `${value}px`
}

function installRelativeLengthCompatibility(): void {
  const originalEnqueue = MutationDriver.prototype.enqueue
  MutationDriver.prototype.enqueue = function enqueue(name: string, ...args: MutationValue[]): void {
    if (name !== "setStyle") {
      originalEnqueue.call(this, name, ...args)
      return
    }

    // SAFETY: the mutation driver contract enqueues setStyle with the renderer style object as arg 1; this wrapper only normalizes CSS relative lengths before the existing driver validation runs.
    const style = args[1] as RelativeLengthStyle
    const normalized = { ...style }
    const fontSize = cssLengthPixels(style.fontSize ?? style["font-size"]) ?? 16
    normalized.fontSize = cssLengthPixels(style.fontSize ?? style["font-size"]) ?? style.fontSize
    delete normalized["font-size"]
    normalized.width = resolveEmLength(style.width, fontSize)
    normalized.height = resolveEmLength(style.height, fontSize)
    normalized.minWidth = resolveEmLength(style.minWidth, fontSize)
    normalized.minHeight = resolveEmLength(style.minHeight, fontSize)
    normalized.maxWidth = resolveEmLength(style.maxWidth, fontSize)
    normalized.maxHeight = resolveEmLength(style.maxHeight, fontSize)
    args[1] = normalized
    originalEnqueue.call(this, name, ...args)
  }
}

function cssLengthPixels(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  const numeric = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:px)?$/i)
  if (numeric) return Number(numeric[1])
  const rem = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))rem$/i)
  return rem ? Number(rem[1]) * 16 : undefined
}

function resolveEmLength(value: unknown, fontSize: number): unknown {
  if (typeof value !== "string") return value
  const em = value.trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))em$/i)
  return em ? Number(em[1]) * fontSize : value
}

function installDocumentFocusCompatibility(): void {
  const documentTarget = globalThis.document
  let activeElement: object | null = documentTarget.body
  const originalFocus = HostElementNode.prototype.focus
  const originalBlur = HostElementNode.prototype.blur
  const recordActiveElement = (element: object): void => {
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

function installSemanticTagMetadata(element: ReturnType<typeof createElement>, tagName: string): void {
  const localName = tagName.toLowerCase()
  const nodeName = localName.toUpperCase()
  const listeners = new Map<string, Set<LocalEventListener>>()
  Object.defineProperties(element, {
    tagName: { configurable: true, enumerable: true, value: nodeName },
    nodeName: { configurable: true, enumerable: true, value: nodeName },
    localName: { configurable: true, enumerable: true, value: localName },
    matches: {
      configurable: true,
      enumerable: true,
      value: (selector: string) => selector
        .split(",")
        .map((candidate) => candidate.trim().toLowerCase())
        .includes(localName),
    },
    contains: {
      configurable: true,
      enumerable: true,
      value: (child: ReturnType<typeof createElement> | null) => {
        let current = child
        while (current) {
          if (current === element) return true
          if (current.kind === "root") return false
          const parent = current.parent
          if (!parent || parent.kind === "root") return false
          current = parent
        }
        return false
      },
    },
    addEventListener: {
      configurable: true,
      enumerable: true,
      value: (type: string, listener: LocalEventListener | null) => {
        if (!listener) return
        const entries = listeners.get(type) ?? new Set<LocalEventListener>()
        entries.add(listener)
        listeners.set(type, entries)
      },
    },
    removeEventListener: {
      configurable: true,
      enumerable: true,
      value: (type: string, listener: LocalEventListener | null) => {
        if (!listener) return
        const entries = listeners.get(type)
        entries?.delete(listener)
        if (entries?.size === 0) listeners.delete(type)
      },
    },
    dispatchEvent: {
      configurable: true,
      enumerable: true,
      value: (event: Event) => {
        for (const listener of listeners.get(event.type) ?? []) listener(event)
        return !event.defaultPrevented
      },
    },
  })
}
