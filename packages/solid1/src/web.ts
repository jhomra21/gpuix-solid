import "./dom-environment.js"
import {
  splitProps,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js"
import { HostElementNode, type HostRootNode } from "./host/nodes.js"
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

installElementConstructorCompatibility()
installDocumentContainmentCompatibility()
installDocumentStyleCompatibility()
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

function installDocumentFocusCompatibility(): void {
  const documentTarget = globalThis.document
  let activeElement: Element | null = documentTarget.body
  const originalFocus = HostElementNode.prototype.focus
  const originalBlur = HostElementNode.prototype.blur

  Object.defineProperty(documentTarget, "activeElement", {
    configurable: true,
    enumerable: true,
    get: () => activeElement,
  })

  HostElementNode.prototype.focus = function focus(): void {
    activeElement = this
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
